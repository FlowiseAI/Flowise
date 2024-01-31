import { ICommonObject } from './Interface'
import { getCredentialData, getUserHome } from './utils'
import { type ClientOptions, OpenAIClient } from '@langchain/openai'
import fs from 'fs'
import path from 'path'
import { AssemblyAI } from 'assemblyai'

export const convertSpeechToText = async (upload: any, speechToTextConfig: any, options: ICommonObject) => {
    if (speechToTextConfig) {
        const credentialId = speechToTextConfig.credentialId as string
        const credentialData = await getCredentialData(credentialId ?? '', options)
        const filePath = path.join(getUserHome(), '.flowise', 'gptvision', upload.data, upload.name)

        // as the image is stored in the server, read the file and convert it to base64
        const audio_file = fs.createReadStream(filePath)

        if (speechToTextConfig.name === 'openAIWhisper') {
            const openAIClientOptions: ClientOptions = {
                apiKey: credentialData.openAIApiKey
            }
            const openAIClient = new OpenAIClient(openAIClientOptions)

            const transcription = await openAIClient.audio.transcriptions.create({
                file: audio_file,
                model: 'whisper-1'
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
