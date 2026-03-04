import { ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import OpenAI from 'openai'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'

const TextToSpeechType = {
    OPENAI_TTS: 'openai',
    ELEVEN_LABS_TTS: 'elevenlabs',
    MINIMAX_TTS: 'minimax'
}

export const convertTextToSpeechStream = async (
    text: string,
    textToSpeechConfig: ICommonObject,
    options: ICommonObject,
    abortController: AbortController,
    onStart: (format: string) => void,
    onChunk: (chunk: Buffer) => void,
    onEnd: () => void
): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        let streamDestroyed = false

        // Handle abort signal early
        if (abortController.signal.aborted) {
            reject(new Error('TTS generation aborted'))
            return
        }
        const processStream = async () => {
            try {
                if (textToSpeechConfig) {
                    const credentialId = textToSpeechConfig.credentialId as string
                    const credentialData = await getCredentialData(credentialId ?? '', options)

                    switch (textToSpeechConfig.name) {
                        case TextToSpeechType.OPENAI_TTS: {
                            onStart('mp3')

                            const openai = new OpenAI({
                                apiKey: credentialData.openAIApiKey
                            })

                            const response = await openai.audio.speech.create(
                                {
                                    model: 'gpt-4o-mini-tts',
                                    voice: (textToSpeechConfig.voice || 'alloy') as
                                        | 'alloy'
                                        | 'ash'
                                        | 'ballad'
                                        | 'coral'
                                        | 'echo'
                                        | 'fable'
                                        | 'nova'
                                        | 'onyx'
                                        | 'sage'
                                        | 'shimmer',
                                    input: text,
                                    response_format: 'mp3'
                                },
                                {
                                    signal: abortController.signal
                                }
                            )

                            const stream = response.body as unknown as Readable
                            if (!stream) {
                                throw new Error('Failed to get response stream')
                            }

                            await processStreamWithRateLimit(stream, onChunk, onEnd, resolve, reject, 640, 20, abortController, () => {
                                streamDestroyed = true
                            })
                            break
                        }

                        case TextToSpeechType.ELEVEN_LABS_TTS: {
                            onStart('mp3')

                            const client = new ElevenLabsClient({
                                apiKey: credentialData.elevenLabsApiKey
                            })

                            const response = await client.textToSpeech.stream(
                                textToSpeechConfig.voice || '21m00Tcm4TlvDq8ikWAM',
                                {
                                    text: text,
                                    modelId: 'eleven_multilingual_v2'
                                },
                                { abortSignal: abortController.signal }
                            )

                            const stream = Readable.fromWeb(response as unknown as ReadableStream)
                            if (!stream) {
                                throw new Error('Failed to get response stream')
                            }

                            await processStreamWithRateLimit(stream, onChunk, onEnd, resolve, reject, 640, 40, abortController, () => {
                                streamDestroyed = true
                            })
                            break
                        }

                        case TextToSpeechType.MINIMAX_TTS: {
                            onStart('mp3')

                            const apiKey = credentialData.miniMaxApiKey
                            if (!apiKey) {
                                throw new Error('MiniMax API Key is required')
                            }

                            const voiceId = textToSpeechConfig.voice || 'English_expressive_narrator'
                            const model = textToSpeechConfig.model || 'speech-2.8-hd'

                            const requestBody: Record<string, unknown> = {
                                model: model,
                                text: text,
                                stream: true,
                                language_boost: 'auto',
                                output_format: 'hex',
                                voice_setting: {
                                    voice_id: voiceId,
                                    speed: textToSpeechConfig.speed ?? 1.0,
                                    vol: textToSpeechConfig.vol ?? 1.0,
                                    pitch: textToSpeechConfig.pitch ?? 0
                                },
                                audio_setting: {
                                    format: 'mp3',
                                    sample_rate: 32000,
                                    bitrate: 128000,
                                    channel: 1
                                }
                            }

                            const response = await fetch('https://api.minimax.io/v1/t2a_v2', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${apiKey}`
                                },
                                body: JSON.stringify(requestBody),
                                signal: abortController.signal
                            })

                            if (!response.ok) {
                                const errorText = await response.text()
                                throw new Error(`MiniMax TTS API error: ${response.status} - ${errorText}`)
                            }

                            if (!response.body) {
                                throw new Error('Failed to get response stream from MiniMax')
                            }

                            const reader = response.body.getReader()
                            const decoder = new TextDecoder()
                            let sseBuffer = ''

                            const processMinimaxStream = async () => {
                                for (;;) {
                                    if (abortController.signal.aborted) {
                                        reader.cancel()
                                        streamDestroyed = true
                                        reject(new Error('TTS generation aborted'))
                                        return
                                    }

                                    const { done, value } = await reader.read()
                                    if (done) break

                                    sseBuffer += decoder.decode(value, { stream: true })
                                    const lines = sseBuffer.split('\n')
                                    sseBuffer = lines.pop() || ''

                                    for (const line of lines) {
                                        const trimmedLine = line.trim()
                                        if (!trimmedLine || trimmedLine.startsWith(':')) {
                                            continue
                                        }

                                        if (trimmedLine.startsWith('data:')) {
                                            const jsonStr = trimmedLine.slice(5).trim()
                                            if (!jsonStr) continue

                                            try {
                                                const eventData = JSON.parse(jsonStr)

                                                if (eventData.base_resp?.status_code !== 0) {
                                                    const errorMsg = eventData.base_resp?.status_msg || 'Unknown error'
                                                    reject(new Error(`MiniMax TTS error: ${errorMsg}`))
                                                    return
                                                }

                                                if (eventData.data?.audio) {
                                                    const audioChunk = Buffer.from(eventData.data.audio, 'hex')
                                                    onChunk(audioChunk)
                                                }

                                                // status === 2 means the stream is complete;
                                                // continue processing remaining lines in the buffer
                                                // rather than breaking early to avoid missing audio data
                                            } catch {
                                                // Skip malformed JSON
                                            }
                                        }
                                    }
                                }

                                onEnd()
                                resolve()
                            }

                            await processMinimaxStream()
                            break
                        }
                    }
                } else {
                    reject(new Error('Text to speech is not selected. Please configure TTS in the chatflow.'))
                }
            } catch (error) {
                reject(error)
            }
        }

        // Handle abort signal
        abortController.signal.addEventListener('abort', () => {
            if (!streamDestroyed) {
                reject(new Error('TTS generation aborted'))
            }
        })

        processStream()
    })
}

const processStreamWithRateLimit = async (
    stream: Readable,
    onChunk: (chunk: Buffer) => void,
    onEnd: () => void,
    resolve: () => void,
    reject: (error: any) => void,
    targetChunkSize: number = 640,
    rateLimitMs: number = 20,
    abortController: AbortController,
    onStreamDestroy?: () => void
) => {
    const TARGET_CHUNK_SIZE = targetChunkSize
    const RATE_LIMIT_MS = rateLimitMs

    let buffer: Buffer = Buffer.alloc(0)
    let isEnded = false

    const processChunks = async () => {
        while (!isEnded || buffer.length > 0) {
            // Check if aborted
            if (abortController.signal.aborted) {
                if (!stream.destroyed) {
                    stream.destroy()
                }
                onStreamDestroy?.()
                reject(new Error('TTS generation aborted'))
                return
            }

            if (buffer.length >= TARGET_CHUNK_SIZE) {
                const chunk = buffer.subarray(0, TARGET_CHUNK_SIZE)
                buffer = buffer.subarray(TARGET_CHUNK_SIZE)
                onChunk(chunk)
                await sleep(RATE_LIMIT_MS)
            } else if (isEnded && buffer.length > 0) {
                onChunk(buffer)
                buffer = Buffer.alloc(0)
            } else if (!isEnded) {
                await sleep(RATE_LIMIT_MS)
            } else {
                break
            }
        }

        onEnd()
        resolve()
    }

    stream.on('data', (chunk) => {
        if (!abortController.signal.aborted) {
            buffer = Buffer.concat([buffer, Buffer.from(chunk)])
        }
    })

    stream.on('end', () => {
        isEnded = true
    })

    stream.on('error', (error) => {
        reject(error)
    })

    // Handle abort signal
    abortController.signal.addEventListener('abort', () => {
        if (!stream.destroyed) {
            stream.destroy()
        }
        onStreamDestroy?.()
        reject(new Error('TTS generation aborted'))
    })

    processChunks().catch(reject)
}

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getVoices = async (provider: string, credentialId: string, options: ICommonObject) => {
    const credentialData = await getCredentialData(credentialId ?? '', options)

    switch (provider) {
        case TextToSpeechType.OPENAI_TTS:
            return [
                { id: 'alloy', name: 'Alloy' },
                { id: 'ash', name: 'Ash' },
                { id: 'ballad', name: 'Ballad' },
                { id: 'coral', name: 'Coral' },
                { id: 'echo', name: 'Echo' },
                { id: 'fable', name: 'Fable' },
                { id: 'nova', name: 'Nova' },
                { id: 'onyx', name: 'Onyx' },
                { id: 'sage', name: 'Sage' },
                { id: 'shimmer', name: 'Shimmer' }
            ]

        case TextToSpeechType.ELEVEN_LABS_TTS: {
            const client = new ElevenLabsClient({
                apiKey: credentialData.elevenLabsApiKey
            })

            const voices = await client.voices.search({
                pageSize: 100,
                voiceType: 'default',
                category: 'premade'
            })

            return voices.voices.map((voice) => ({
                id: voice.voiceId,
                name: voice.name,
                category: voice.category
            }))
        }

        case TextToSpeechType.MINIMAX_TTS: {
            return [
                // English voices (official recommended)
                { id: 'English_expressive_narrator', name: 'Expressive Narrator', category: 'English' },
                { id: 'English_Graceful_Lady', name: 'Graceful Lady', category: 'English' },
                { id: 'English_Insightful_Speaker', name: 'Insightful Speaker', category: 'English' },
                { id: 'English_radiant_girl', name: 'Radiant Girl', category: 'English' },
                { id: 'English_Persuasive_Man', name: 'Persuasive Man', category: 'English' },
                { id: 'English_Lucky_Robot', name: 'Lucky Robot', category: 'English' }
            ]
        }

        default:
            throw new Error(`Unsupported TTS provider: ${provider}`)
    }
}
