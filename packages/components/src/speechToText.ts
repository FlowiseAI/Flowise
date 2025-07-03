import { Langfuse } from 'langfuse'
import { ICommonObject, IFileUpload } from './Interface'
import { getCredentialData } from './utils'
import { OpenAIClient, toFile } from '@langchain/openai'
import { AssemblyAI } from 'assemblyai'
import { getFileFromStorage } from './storageUtils'
import Groq from 'groq-sdk'
import { TranscriptionCreateParamsNonStreaming } from 'openai/resources/audio/transcriptions'
import { TranscriptionCreateParams } from 'groq-sdk/resources/audio/transcriptions'

const SpeechToTextType = {
    OPENAI_WHISPER: 'openAIWhisper',
    ASSEMBLYAI_TRANSCRIBE: 'assemblyAiTranscribe',
    LOCALAI_STT: 'localAISTT',
    AZURE_COGNITIVE: 'azureCognitive',
    GROQ_WHISPER: 'groqWhisper'
}

export const convertSpeechToText = async (upload: IFileUpload, speechToTextConfig: ICommonObject, options: ICommonObject) => {
    if (!speechToTextConfig) {
        throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
    }

    if (!upload) {
        throw new Error('You must provide an uploaded audio file')
    }

    if (typeof upload?.duration !== 'number' || !isFinite(upload.duration) || upload.duration <= 0) {
        throw new Error('There was an error retrieving the duration of your audio file. Please try again.')
    }

    const langfuse = new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
        secretKey: process.env.LANGFUSE_SECRET_KEY!,
        baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
    })

    const credentialId = speechToTextConfig.credentialId as string
    const credentialData = await getCredentialData(credentialId ?? '', options)
    const audio_file = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)

    const file = await toFile(audio_file, upload.name)
    const durationSeconds = upload.duration
    const duration = Math.ceil(durationSeconds / 60)

    const trace = langfuse.trace({
        name: 'SpeechToText',
        userId: options.userId,
        tags: ['Speech to Text'],
        metadata: {
            provider: speechToTextConfig.name,
            filename: upload.name,
            chatId: options.chatId,
            durationMinutes: duration,
            durationInSeconds: durationSeconds
        },
        input: `Audio file for transcription: ${upload.name}, ${duration}s`
    })

    const generation = trace.generation({
        usage: {
            promptTokens: Math.ceil(duration),
            completionTokens: 0
        }
    })

    let generatedTranscription = ''

    try {
        switch (speechToTextConfig.name) {
            case SpeechToTextType.OPENAI_WHISPER: {
                const client = new OpenAIClient({ apiKey: credentialData.openAIApiKey })

                const model = 'whisper-1'

                const modelParameters: Partial<TranscriptionCreateParamsNonStreaming> = {
                    model,
                    language: speechToTextConfig.language,
                    temperature: speechToTextConfig.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig.prompt
                }

                generation.update({
                    name: 'openai_whisper_transcription',
                    model,
                    metadata: modelParameters
                })

                const result = await client.audio.transcriptions.create({
                    file,
                    ...modelParameters
                } as TranscriptionCreateParamsNonStreaming)

                if (!result?.text || result?.text?.trim() === '') {
                    throw new Error('Transcription was not successful')
                }

                generatedTranscription = result?.text
                break
            }

            case SpeechToTextType.ASSEMBLYAI_TRANSCRIBE: {
                const client = new AssemblyAI({ apiKey: credentialData.assemblyAIApiKey })

                const model = 'assemblyai-default'

                const modelParameters = {
                    audio: audio_file,
                    model,
                    speaker_labels: false
                }

                generation.update({
                    name: 'assemblyai_transcription',
                    model,
                    metadata: modelParameters
                })

                const result = await client.transcripts.transcribe(modelParameters)

                if (!result?.text || result?.text?.trim() === '') {
                    throw new Error('Transcription was not successful')
                }

                generatedTranscription = result?.text
                break
            }

            case SpeechToTextType.LOCALAI_STT: {
                const client = new OpenAIClient({
                    apiKey: credentialData.localAIApiKey,
                    baseURL: speechToTextConfig.baseUrl
                })

                const model = speechToTextConfig.model || 'whisper-1'

                const modelParameters: Partial<TranscriptionCreateParamsNonStreaming> = {
                    model,
                    language: speechToTextConfig.language,
                    temperature: speechToTextConfig.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig.prompt
                }

                generation.update({
                    name: 'localai_transcription',
                    model,
                    metadata: modelParameters
                })

                const result = await client.audio.transcriptions.create({
                    file,
                    ...modelParameters
                } as TranscriptionCreateParamsNonStreaming)

                if (!result?.text || result?.text?.trim() === '') {
                    throw new Error('Transcription was not successful')
                }

                generatedTranscription = result?.text
                break
            }

            case SpeechToTextType.GROQ_WHISPER: {
                const client = new Groq({ apiKey: credentialData.groqApiKey })

                const model = speechToTextConfig.model || 'whisper-large-v3'

                const modelParameters: Partial<TranscriptionCreateParams> = {
                    model,
                    language: speechToTextConfig.language,
                    temperature: speechToTextConfig.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig.prompt
                }

                generation.update({
                    name: 'groq_whisper_transcription',
                    model,
                    metadata: modelParameters
                })

                const result = await client.audio.transcriptions.create({
                    file,
                    ...modelParameters
                } as TranscriptionCreateParams)

                if (!result?.text || result?.text?.trim() === '') {
                    throw new Error('Transcription was not successful')
                }

                generatedTranscription = result?.text
                break
            }

            case SpeechToTextType.AZURE_COGNITIVE:
                throw new Error('Azure Cognitive STT not yet integrated with Langfuse')

            default:
                throw new Error(`Unknown provider: ${speechToTextConfig.name}`)
        }
    } catch (err) {
        const statusMessage = err.message || String(err)

        await generation.end({
            output: statusMessage
        })

        await trace.update({
            output: statusMessage
        })

        trace
            .span({
                name: 'transcription_error',
                input: {
                    provider: speechToTextConfig.name,
                    message: statusMessage
                },
                level: 'ERROR',
                statusMessage: statusMessage
            })
            .end()

        throw err
    }

    await generation.end({
        output: generatedTranscription
    })

    await trace.update({
        output: generatedTranscription
    })

    return generatedTranscription
}
