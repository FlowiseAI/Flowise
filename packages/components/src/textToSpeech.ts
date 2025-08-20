import { ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import OpenAI from 'openai'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'

const TextToSpeechType = {
    OPENAI_TTS: 'openai',
    ELEVEN_LABS_TTS: 'elevenlabs'
}

export const convertTextToSpeechStream = async (
    text: string,
    textToSpeechConfig: ICommonObject,
    options: ICommonObject,
    onChunk: (chunk: Buffer) => void,
    onEnd: () => void
): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            if (textToSpeechConfig) {
                const credentialId = textToSpeechConfig.credentialId as string
                const credentialData = await getCredentialData(credentialId ?? '', options)

                switch (textToSpeechConfig.name) {
                    case TextToSpeechType.OPENAI_TTS: {
                        const openai = new OpenAI({
                            apiKey: credentialData.openAIApiKey
                        })

                        const response = await openai.audio.speech.create({
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
                            response_format: 'wav'
                        })

                        const stream = Readable.fromWeb(response as unknown as ReadableStream)
                        if (!stream) {
                            throw new Error('Failed to get response stream')
                        }

                        stream.on('data', (chunk) => {
                            onChunk(Buffer.from(chunk))
                        })

                        stream.on('end', () => {
                            onEnd()
                            resolve()
                        })

                        stream.on('error', (error) => {
                            reject(error)
                        })

                        break
                    }

                    case TextToSpeechType.ELEVEN_LABS_TTS: {
                        const client = new ElevenLabsClient({
                            apiKey: credentialData.elevenLabsApiKey
                        })

                        const response = await client.textToSpeech.stream(textToSpeechConfig.voice || '21m00Tcm4TlvDq8ikWAM', {
                            text: text,
                            modelId: 'eleven_multilingual_v2'
                        })

                        const stream = Readable.fromWeb(response as unknown as ReadableStream)
                        if (!stream) {
                            throw new Error('Failed to get response stream')
                        }

                        stream.on('data', (chunk) => {
                            onChunk(Buffer.from(chunk))
                        })

                        stream.on('end', () => {
                            onEnd()
                            resolve()
                        })

                        stream.on('error', (error) => {
                            reject(error)
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
    })
}

export const convertTextToSpeech = async (text: string, textToSpeechConfig: ICommonObject, options: ICommonObject): Promise<Buffer> => {
    if (textToSpeechConfig) {
        const credentialId = textToSpeechConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)

        switch (textToSpeechConfig.name) {
            case TextToSpeechType.OPENAI_TTS: {
                const openai = new OpenAI({
                    apiKey: credentialData.openAIApiKey
                })

                const response = await openai.audio.speech.create({
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
                    response_format: 'wav'
                })

                const audioBuffer = Buffer.from(await response.arrayBuffer())
                return audioBuffer
            }

            case TextToSpeechType.ELEVEN_LABS_TTS: {
                const client = new ElevenLabsClient({
                    apiKey: credentialData.elevenLabsApiKey
                })

                const audioStream = await client.textToSpeech.stream(textToSpeechConfig.voice || '21m00Tcm4TlvDq8ikWAM', {
                    text: text,
                    modelId: 'eleven_multilingual_v2'
                })

                const chunks: Buffer[] = []
                const reader = audioStream.getReader()

                try {
                    let result = await reader.read()
                    while (!result.done) {
                        if (result.value) {
                            chunks.push(Buffer.from(result.value))
                        }
                        result = await reader.read()
                    }
                } finally {
                    reader.releaseLock()
                }

                const audioBuffer = Buffer.concat(chunks)
                return audioBuffer
            }
        }
    } else {
        throw new Error('Text to speech is not selected. Please configure TTS in the chatflow.')
    }
    return Buffer.alloc(0)
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

        default:
            throw new Error(`Unsupported TTS provider: ${provider}`)
    }
}
