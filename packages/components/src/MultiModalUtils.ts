import { ICommonObject, INodeData } from './Interface'
import { BaseChatModel } from 'langchain/chat_models/base'
import { type ClientOptions, OpenAIClient } from '@langchain/openai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import path from 'path'
import { getUserHome } from './utils'
import fs from 'fs'
import { MessageContent } from '@langchain/core/dist/messages'

export const processSpeechToText = async (nodeData: INodeData, input: string, options: ICommonObject) => {
    const MODEL_NAME = 'whisper-1'

    let model = nodeData.inputs?.model as BaseChatModel
    if (model instanceof ChatOpenAI && (model as any).multiModal) {
        const multiModalConfig = (model as any).multiModal
        if (options?.uploads) {
            if (options.uploads.length === 1 && input.length === 0 && options.uploads[0].mime === 'audio/webm') {
                const upload = options.uploads[0]
                //special case, text input is empty, but we have an upload (recorded audio)
                if (multiModalConfig.allowSpeechToText) {
                    const openAIClientOptions: ClientOptions = {
                        apiKey: model.openAIApiKey,
                        organization: model.organization
                    }
                    const openAIClient = new OpenAIClient(openAIClientOptions)
                    const filePath = path.join(getUserHome(), '.flowise', 'gptvision', upload.data, upload.name)

                    // as the image is stored in the server, read the file and convert it to base64
                    const audio_file = fs.createReadStream(filePath)

                    if (multiModalConfig.speechToTextMode === 'transcriptions') {
                        const transcription = await openAIClient.audio.transcriptions.create({
                            file: audio_file,
                            model: MODEL_NAME
                        })
                        return transcription.text
                    } else if (multiModalConfig.speechToTextMode === 'translations') {
                        const translation = await openAIClient.audio.translations.create({
                            file: audio_file,
                            model: MODEL_NAME
                        })
                        return translation.text
                    }
                } else {
                    throw new Error('Speech to text is not selected, but found a recorded audio file. Please fix the chain.')
                }
            }
        }
    }
    return input
}

export const addImagesToMessages = (nodeData: INodeData, options: ICommonObject): MessageContent => {
    const imageContent: MessageContent = []
    let model = nodeData.inputs?.model as BaseChatModel
    if (model instanceof ChatOpenAI && (model as any).multiModal) {
        if (options?.uploads && options?.uploads.length > 0) {
            const imageUploads = getImageUploads(options.uploads)
            for (const upload of imageUploads) {
                let bf = upload.data
                if (upload.type == 'stored-file') {
                    const filePath = path.join(getUserHome(), '.flowise', 'gptvision', upload.data, upload.name)

                    // as the image is stored in the server, read the file and convert it to base64
                    const contents = fs.readFileSync(filePath)
                    bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')
                }
                imageContent.push({
                    type: 'image_url',
                    image_url: {
                        url: bf,
                        detail: 'low'
                    }
                })
            }
        }
    }
    return imageContent
}

export const getAudioUploads = (uploads: any[]) => {
    return uploads.filter((url: any) => url.mime.startsWith('audio/'))
}

export const getImageUploads = (uploads: any[]) => {
    return uploads.filter((url: any) => url.mime.startsWith('image/'))
}
