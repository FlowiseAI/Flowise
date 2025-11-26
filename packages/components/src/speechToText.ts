import { ICommonObject, IFileUpload } from './Interface'
import { getCredentialData } from './utils'
import { type ClientOptions, OpenAIClient, toFile } from '@langchain/openai'
import { AssemblyAI } from 'assemblyai'
import { getFileFromStorage } from './storageUtils'
import axios from 'axios'
import Groq from 'groq-sdk'

const SpeechToTextType = {
    OPENAI_WHISPER: 'openAIWhisper',
    ASSEMBLYAI_TRANSCRIBE: 'assemblyAiTranscribe',
    LOCALAI_STT: 'localAISTT',
    AZURE_COGNITIVE: 'azureCognitive',
    GROQ_WHISPER: 'groqWhisper'
}

export const convertSpeechToText = async (upload: IFileUpload, speechToTextConfig: ICommonObject, options: ICommonObject) => {
    if (speechToTextConfig) {
        const credentialId = speechToTextConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const audio_file = await getFileFromStorage(upload.name, options.orgId, options.chatflowid, options.chatId)

        switch (speechToTextConfig.name) {
            case SpeechToTextType.OPENAI_WHISPER: {
                const openAIClientOptions: ClientOptions = {
                    apiKey: credentialData.openAIApiKey
                }
                const openAIClient = new OpenAIClient(openAIClientOptions)
                const file = await toFile(audio_file, upload.name)
                const openAITranscription = await openAIClient.audio.transcriptions.create({
                    file: file,
                    model: 'whisper-1',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig?.prompt
                })
                if (openAITranscription?.text) {
                    return openAITranscription.text
                }
                break
            }
            case SpeechToTextType.ASSEMBLYAI_TRANSCRIBE: {
                const assemblyAIClient = new AssemblyAI({
                    apiKey: credentialData.assemblyAIApiKey
                })

                const params = {
                    audio: audio_file,
                    speaker_labels: false
                }

                const assemblyAITranscription = await assemblyAIClient.transcripts.transcribe(params)
                if (assemblyAITranscription?.text) {
                    return assemblyAITranscription.text
                }
                break
            }
            case SpeechToTextType.LOCALAI_STT: {
                const LocalAIClientOptions: ClientOptions = {
                    apiKey: credentialData.localAIApiKey,
                    baseURL: speechToTextConfig?.baseUrl
                }
                const localAIClient = new OpenAIClient(LocalAIClientOptions)
                const file = await toFile(audio_file, upload.name)
                const localAITranscription = await localAIClient.audio.transcriptions.create({
                    file: file,
                    model: speechToTextConfig?.model || 'whisper-1',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    prompt: speechToTextConfig?.prompt
                })
                if (localAITranscription?.text) {
                    return localAITranscription.text
                }
                break
            }
            case SpeechToTextType.AZURE_COGNITIVE: {
                try {
                    const baseUrl = `https://${credentialData.serviceRegion}.cognitiveservices.azure.com/speechtotext/transcriptions:transcribe`
                    const apiVersion = credentialData.apiVersion || '2024-05-15-preview'

                    const formData = new FormData()
                    const audioBlob = new Blob([audio_file], { type: upload.type })
                    formData.append('audio', audioBlob, upload.name)

                    const channelsStr = speechToTextConfig.channels || '0,1'
                    const channels = channelsStr.split(',').map(Number)

                    const definition = {
                        locales: [speechToTextConfig.language || 'en-US'],
                        profanityFilterMode: speechToTextConfig.profanityFilterMode || 'Masked',
                        channels
                    }
                    formData.append('definition', JSON.stringify(definition))

                    const response = await axios.post(`${baseUrl}?api-version=${apiVersion}`, formData, {
                        headers: {
                            'Ocp-Apim-Subscription-Key': credentialData.azureSubscriptionKey,
                            Accept: 'application/json'
                        }
                    })

                    if (response.data && response.data.combinedPhrases.length > 0) {
                        return response.data.combinedPhrases[0]?.text || ''
                    }
                    return ''
                } catch (error) {
                    throw error.response?.data || error
                }
            }
            case SpeechToTextType.GROQ_WHISPER: {
                const groqClient = new Groq({
                    apiKey: credentialData.groqApiKey
                })
                const file = await toFile(audio_file, upload.name)
                const groqTranscription = await groqClient.audio.transcriptions.create({
                    file,
                    model: speechToTextConfig?.model || 'whisper-large-v3',
                    language: speechToTextConfig?.language,
                    temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                    response_format: 'verbose_json'
                })
                if (groqTranscription?.text) {
                    return groqTranscription.text
                }
                break
            }
        }
    } else {
        throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
    }
    return undefined
}
