import { ICommonObject } from './Interface'
import { getCredentialData } from './utils'
import OpenAI from 'openai'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const TextToSpeechType = {
    OPENAI_TTS: 'openai',
    ELEVEN_LABS_TTS: 'elevenlabs'
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
                    model: textToSpeechConfig.model || 'tts-1',
                    voice: (textToSpeechConfig.voice || 'alloy') as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
                    input: text,
                    response_format: 'mp3'
                })

                const audioBuffer = Buffer.from(await response.arrayBuffer())
                return audioBuffer
            }

            case TextToSpeechType.ELEVEN_LABS_TTS: {
                const client = new ElevenLabsClient({
                    apiKey: credentialData.elevenLabsApiKey
                })

                const audioStream = await client.textToSpeech.convert(textToSpeechConfig.voice || '21m00Tcm4TlvDq8ikWAM', {
                    text: text,
                    modelId: 'eleven_monolingual_v1'
                })

                // Convert the audio stream to buffer
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
                { id: 'echo', name: 'Echo' },
                { id: 'fable', name: 'Fable' },
                { id: 'onyx', name: 'Onyx' },
                { id: 'nova', name: 'Nova' },
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
