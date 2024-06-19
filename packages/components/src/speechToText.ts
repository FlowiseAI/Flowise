import { ICommonObject, IFileUpload } from './Interface'
import { getCredentialData } from './utils'
import { type ClientOptions, OpenAIClient, toFile } from '@langchain/openai'
import { AssemblyAI } from 'assemblyai'
import { getFileFromStorage } from './storageUtils'

const SpeechToTextType = {
    OPENAI_WHISPER: 'openAIWhisper',
    ASSEMBLYAI_TRANSCRIBE: 'assemblyAiTranscribe',
    LOCALAI_STT: 'localAISTT'
}

export const convertSpeechToText = async (upload: IFileUpload, speechToTextConfig: ICommonObject, options: ICommonObject) => {
    if (speechToTextConfig) {
        const credentialId = speechToTextConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const audio_file = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)

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
        }
    } else {
        throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
    }
    return undefined
}
