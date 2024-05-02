import { ICommonObject, IFileUpload } from './Interface'
import { getCredentialData } from './utils'
import { type ClientOptions, OpenAIClient } from '@langchain/openai'
import { AssemblyAI } from 'assemblyai'
import { getFileFromStorage } from './storageUtils'

export const convertSpeechToText = async (upload: IFileUpload, speechToTextConfig: ICommonObject, options: ICommonObject) => {
    if (speechToTextConfig) {
        const credentialId = speechToTextConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const audio_file = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)

        if (speechToTextConfig.name === 'openAIWhisper') {
            const openAIClientOptions: ClientOptions = {
                apiKey: credentialData.openAIApiKey
            }
            const openAIClient = new OpenAIClient(openAIClientOptions)
            const transcription = await openAIClient.audio.transcriptions.create({
                file: new File([new Blob([audio_file])], upload.name),
                model: 'whisper-1',
                language: speechToTextConfig?.language,
                temperature: speechToTextConfig?.temperature ? parseFloat(speechToTextConfig.temperature) : undefined,
                prompt: speechToTextConfig?.prompt
            })
            if (transcription?.text) {
                return transcription.text
            }
        } else if (speechToTextConfig.name === 'assemblyAiTranscribe') {
            const client = new AssemblyAI({
                apiKey: credentialData.assemblyAIApiKey
            })

            const params = {
                audio: audio_file,
                speaker_labels: false
            }

            const transcription = await client.transcripts.transcribe(params)
            if (transcription?.text) {
                return transcription.text
            }
        }
    } else {
        throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
    }
    return undefined
}
