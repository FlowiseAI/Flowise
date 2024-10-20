import { IVisionChatModal, ICommonObject, IFileUpload, IMultiModalOption, INodeData, MessageContentImageUrl } from './Interface'
import { getFileFromStorage } from './storageUtils'

export const addImagesToMessages = async (
    nodeData: INodeData,
    options: ICommonObject,
    multiModalOption?: IMultiModalOption
): Promise<MessageContentImageUrl[]> => {
    const imageContent: MessageContentImageUrl[] = []
    let model = nodeData.inputs?.model

    if (llmSupportsVision(model) && multiModalOption) {
        // Image Uploaded
        if (multiModalOption.image && multiModalOption.image.allowImageUploads && options?.uploads && options?.uploads.length > 0) {
            const imageUploads = getImageUploads(options.uploads)
            for (const upload of imageUploads) {
                let bf = upload.data
                if (upload.type == 'stored-file') {
                    const contents = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                    // as the image is stored in the server, read the file and convert it to base64
                    bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')

                    imageContent.push({
                        type: 'image_url',
                        image_url: {
                            url: bf,
                            detail: multiModalOption.image.imageResolution ?? 'low'
                        }
                    })
                } else if (upload.type == 'url' && bf) {
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

export const llmSupportsVision = (value: any): value is IVisionChatModal => !!value?.multiModalOption
