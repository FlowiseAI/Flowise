import {
    IVisionChatModal,
    ICommonObject,
    IFileUpload,
    IMultiModalOption,
    INodeData,
    MessageContentImageUrl,
    MessageContentDocument,
    MessageContentMedia,
    MessageContent
} from './Interface'
import { getFileFromStorage } from './storageUtils'

export const addMultiModalContentToMessages = async (
    nodeData: INodeData,
    options: ICommonObject,
    multiModalOption?: IMultiModalOption
): Promise<MessageContent[]> => {
    const multiModalContent: MessageContent[] = []
    let model = nodeData.inputs?.model

    if (llmSupportsVision(model) && multiModalOption) {
        if (options?.uploads && options?.uploads.length > 0) {
            // Handle images
            if (multiModalOption.image && multiModalOption.image.allowImageUploads) {
                const imageUploads = getImageUploads(options.uploads)
                for (const upload of imageUploads) {
                    let bf = upload.data
                    if (upload.type == 'stored-file') {
                        const contents = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                        // as the image is stored in the server, read the file and convert it to base64
                        bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')

                        multiModalContent.push({
                            type: 'image_url',
                            image_url: {
                                url: bf,
                                detail: multiModalOption.image.imageResolution ?? 'low'
                            }
                        })
                    } else if (upload.type == 'url' && bf) {
                        multiModalContent.push({
                            type: 'image_url',
                            image_url: {
                                url: bf,
                                detail: multiModalOption.image.imageResolution ?? 'low'
                            }
                        })
                    }
                }
            }

            // Handle PDFs for Claude
            if (multiModalOption.pdf && multiModalOption.pdf.allowPdfUploads) {
                const pdfUploads = getPdfUploads(options.uploads)
                for (const upload of pdfUploads) {
                    if (upload.type == 'stored-file') {
                        const contents = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                        const base64Data = contents.toString('base64')

                        // Check if model is Claude
                        if (model?.constructor?.name?.includes('ChatAnthropic')) {
                            multiModalContent.push({
                                type: 'document',
                                source: {
                                    type: 'base64',
                                    data: base64Data,
                                    mediaType: 'application/pdf'
                                }
                            } as MessageContentDocument)
                        }
                        // For Google/Gemini models
                        else if (
                            model?.constructor?.name?.includes('ChatGoogleGenerativeAI') ||
                            model?.constructor?.name?.includes('ChatVertexAI')
                        ) {
                            multiModalContent.push({
                                type: 'media',
                                mimeType: 'application/pdf',
                                data: base64Data
                            } as MessageContentMedia)
                        }
                    }
                }
            }

            // Handle audio for Google/Gemini
            if (multiModalOption.audio && multiModalOption.audio.allowAudioUploads) {
                const audioUploads = getAudioUploads(options.uploads)
                for (const upload of audioUploads) {
                    if (
                        upload.type == 'stored-file' &&
                        (model?.constructor?.name?.includes('ChatGoogleGenerativeAI') || model?.constructor?.name?.includes('ChatVertexAI'))
                    ) {
                        const contents = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                        const base64Data = contents.toString('base64')

                        multiModalContent.push({
                            type: 'media',
                            mimeType: upload.mime,
                            data: base64Data
                        } as MessageContentMedia)
                    }
                }
            }

            // Handle video for Google/Gemini
            if (multiModalOption.video && multiModalOption.video.allowVideoUploads) {
                const videoUploads = getVideoUploads(options.uploads)
                for (const upload of videoUploads) {
                    if (
                        upload.type == 'stored-file' &&
                        (model?.constructor?.name?.includes('ChatGoogleGenerativeAI') || model?.constructor?.name?.includes('ChatVertexAI'))
                    ) {
                        const contents = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                        const base64Data = contents.toString('base64')

                        multiModalContent.push({
                            type: 'media',
                            mimeType: upload.mime,
                            data: base64Data
                        } as MessageContentMedia)
                    }
                }
            }
        }
    }
    return multiModalContent
}

// Legacy support - this will be deprecated in a future release
export const addImagesToMessages = async (
    nodeData: INodeData,
    options: ICommonObject,
    multiModalOption?: IMultiModalOption
): Promise<MessageContentImageUrl[]> => {
    const content = await addMultiModalContentToMessages(nodeData, options, multiModalOption)
    return content.filter((item) => item.type === 'image_url') as MessageContentImageUrl[]
}

export const getAudioUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('audio/'))
}

export const getImageUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('image/'))
}

export const getPdfUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime === 'application/pdf')
}

export const getVideoUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('video/'))
}

export const llmSupportsVision = (value: any): value is IVisionChatModal => !!value?.multiModalOption
