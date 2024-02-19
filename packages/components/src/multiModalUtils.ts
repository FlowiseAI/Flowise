import { ICommonObject, IFileUpload, IMultiModalOption, INodeData, MessageContentImageUrl } from './Interface'
import { ChatOpenAI as LangchainChatOpenAI } from 'langchain/chat_models/openai'
import path from 'path'
import { getStoragePath } from './utils'
import fs from 'fs'

export const addImagesToMessages = (
    nodeData: INodeData,
    options: ICommonObject,
    multiModalOption?: IMultiModalOption
): MessageContentImageUrl[] => {
    const imageContent: MessageContentImageUrl[] = []
    let model = nodeData.inputs?.model

    if (model instanceof LangchainChatOpenAI && multiModalOption) {
        // Image Uploaded
        if (multiModalOption.image && multiModalOption.image.allowImageUploads && options?.uploads && options?.uploads.length > 0) {
            const imageUploads = getImageUploads(options.uploads)
            for (const upload of imageUploads) {
                let bf = upload.data
                if (upload.type == 'stored-file') {
                    const filePath = path.join(getStoragePath(), options.chatflowid, options.chatId, upload.name)

                    // as the image is stored in the server, read the file and convert it to base64
                    const contents = fs.readFileSync(filePath)
                    bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')

                    imageContent.push({
                        type: 'image_url',
                        image_url: {
                            url: bf,
                            detail: multiModalOption.image.imageResolution ?? 'low'
                        }
                    })
                }
            }
        }
    }
    return imageContent
}

export const getAudioUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('audio/'))
}

export const getImageUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('image/'))
}
