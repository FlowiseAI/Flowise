import { ICommonObject, INodeData } from './Interface'
import { BaseChatModel } from 'langchain/chat_models/base'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import path from 'path'
import { getUserHome } from './utils'
import fs from 'fs'
import { MessageContent } from '@langchain/core/dist/messages'
import { FlowiseChatOpenAI } from '../nodes/chatmodels/ChatOpenAI/FlowiseChatOpenAI'

export const injectChainNodeData = (nodeData: INodeData, options: ICommonObject) => {
    let model = nodeData.inputs?.model as BaseChatModel

    if (model instanceof FlowiseChatOpenAI) {
        // TODO: this should not be static, need to figure out how to pass the nodeData and options to the invoke method
        FlowiseChatOpenAI.chainNodeOptions = options
        FlowiseChatOpenAI.chainNodeData = nodeData
    }
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
