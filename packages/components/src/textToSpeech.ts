import { ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import OpenAI from 'openai'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { PollyClient, SynthesizeSpeechCommand, Engine, VoiceId } from '@aws-sdk/client-polly'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'

const TextToSpeechType = {
    OPENAI_TTS: 'openai',
    ELEVEN_LABS_TTS: 'elevenlabs',
    AMAZON_POLLY_TTS: 'amazonPolly'
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

                            const stream = Readable.fromWeb(response.body as unknown as ReadableStream)
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

                        case TextToSpeechType.AMAZON_POLLY_TTS: {
                            onStart('mp3')

                            const region = textToSpeechConfig.region || 'us-east-1'
                            const pollyClientConfig: Record<string, any> = { region }

                            if (credentialData.awsKey && credentialData.awsSecret) {
                                pollyClientConfig.credentials = {
                                    accessKeyId: credentialData.awsKey,
                                    secretAccessKey: credentialData.awsSecret,
                                    ...(credentialData.awsSession && { sessionToken: credentialData.awsSession })
                                }
                            }

                            const pollyClient = new PollyClient(pollyClientConfig)

                            const voiceId = (textToSpeechConfig.voice || 'Joanna') as VoiceId
                            const engine = (textToSpeechConfig.engine || 'neural') as Engine

                            const command = new SynthesizeSpeechCommand({
                                Text: text,
                                OutputFormat: 'mp3',
                                VoiceId: voiceId,
                                Engine: engine
                            })

                            const pollyResponse = await pollyClient.send(command, {
                                abortSignal: abortController.signal
                            })

                            if (!pollyResponse.AudioStream) {
                                throw new Error('Amazon Polly returned no audio stream')
                            }

                            // AudioStream from Polly is a Readable in Node.js
                            const pollyStream = pollyResponse.AudioStream as unknown as Readable
                            const stream =
                                pollyStream instanceof Readable ? pollyStream : Readable.fromWeb(pollyStream as unknown as ReadableStream)

                            await processStreamWithRateLimit(stream, onChunk, onEnd, resolve, reject, 640, 20, abortController, () => {
                                streamDestroyed = true
                            })
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

        case TextToSpeechType.AMAZON_POLLY_TTS:
            return [
                { id: 'Joanna', name: 'Joanna (Female, US English)' },
                { id: 'Matthew', name: 'Matthew (Male, US English)' },
                { id: 'Ruth', name: 'Ruth (Female, US English)' },
                { id: 'Stephen', name: 'Stephen (Male, US English)' },
                { id: 'Ivy', name: 'Ivy (Female Child, US English)' },
                { id: 'Kevin', name: 'Kevin (Male Child, US English)' },
                { id: 'Kendra', name: 'Kendra (Female, US English)' },
                { id: 'Kimberly', name: 'Kimberly (Female, US English)' },
                { id: 'Salli', name: 'Salli (Female, US English)' },
                { id: 'Joey', name: 'Joey (Male, US English)' },
                { id: 'Justin', name: 'Justin (Male Child, US English)' },
                { id: 'Gregory', name: 'Gregory (Male, US English)' },
                { id: 'Danielle', name: 'Danielle (Female, US English)' },
                { id: 'Amy', name: 'Amy (Female, British English)' },
                { id: 'Brian', name: 'Brian (Male, British English)' },
                { id: 'Emma', name: 'Emma (Female, British English)' },
                { id: 'Lupe', name: 'Lupe (Female, US Spanish)' },
                { id: 'Pedro', name: 'Pedro (Male, US Spanish)' },
                { id: 'Léa', name: 'Léa (Female, French)' },
                { id: 'Vicki', name: 'Vicki (Female, German)' },
                { id: 'Daniel', name: 'Daniel (Male, German)' },
                { id: 'Lucia', name: 'Lucia (Female, European Spanish)' },
                { id: 'Sergio', name: 'Sergio (Male, European Spanish)' }
            ]

        default:
            throw new Error(`Unsupported TTS provider: ${provider}`)
    }
}
