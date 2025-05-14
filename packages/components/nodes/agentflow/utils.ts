import { BaseMessage, MessageContentImageUrl } from '@langchain/core/messages'
import { getImageUploads } from '../../src/multiModalUtils'
import { getFileFromStorage } from '../../src/storageUtils'
import { ICommonObject, IFileUpload } from '../../src/Interface'
import { BaseMessageLike } from '@langchain/core/messages'
import { IFlowState } from './Interface.Agentflow'
import { mapMimeTypeToInputField } from '../../src/utils'

export const addImagesToMessages = async (
    options: ICommonObject,
    allowImageUploads: boolean,
    imageResolution?: 'auto' | 'low' | 'high'
): Promise<MessageContentImageUrl[]> => {
    const imageContent: MessageContentImageUrl[] = []

    if (allowImageUploads && options?.uploads && options?.uploads.length > 0) {
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
                        detail: imageResolution ?? 'low'
                    }
                })
            } else if (upload.type == 'url' && bf) {
                imageContent.push({
                    type: 'image_url',
                    image_url: {
                        url: bf,
                        detail: imageResolution ?? 'low'
                    }
                })
            }
        }
    }

    return imageContent
}

/**
 * Process message array to replace stored file references with base64 image data
 * @param messages Array of messages that may contain image references
 * @param options Common options object containing chatflowid and chatId
 * @returns Object containing updated messages array and transformed original messages
 */
export const processMessagesWithImages = async (
    messages: BaseMessageLike[],
    options: ICommonObject
): Promise<{
    updatedMessages: BaseMessageLike[]
    transformedMessages: BaseMessageLike[]
}> => {
    if (!messages || !options.chatflowid || !options.chatId) {
        return {
            updatedMessages: messages,
            transformedMessages: []
        }
    }

    // Create a deep copy of the messages to avoid mutating the original
    const updatedMessages = JSON.parse(JSON.stringify(messages))
    // Track which messages were transformed
    const transformedMessages: BaseMessageLike[] = []

    // Scan through all messages looking for stored-file references
    for (let i = 0; i < updatedMessages.length; i++) {
        const message = updatedMessages[i]

        // Skip non-user messages or messages without content
        if (message.role !== 'user' || !message.content) {
            continue
        }

        // Handle array content (typically containing file references)
        if (Array.isArray(message.content)) {
            const imageContents: MessageContentImageUrl[] = []
            let hasImageReferences = false

            // Process each content item
            for (const item of message.content) {
                // Look for stored-file type items
                if (item.type === 'stored-file' && item.name && item.mime.startsWith('image/')) {
                    hasImageReferences = true
                    try {
                        // Get file contents from storage
                        const contents = await getFileFromStorage(item.name, options.chatflowid, options.chatId)

                        // Create base64 data URL
                        const base64Data = 'data:' + item.mime + ';base64,' + contents.toString('base64')

                        // Add to image content array
                        imageContents.push({
                            type: 'image_url',
                            image_url: {
                                url: base64Data,
                                detail: item.imageResolution ?? 'low'
                            }
                        })
                    } catch (error) {
                        console.error(`Failed to load image ${item.name}:`, error)
                    }
                }
            }

            // Replace the content with the image content array
            if (imageContents.length > 0) {
                // Store the original message before modifying
                if (hasImageReferences) {
                    transformedMessages.push(JSON.parse(JSON.stringify(messages[i])))
                }
                updatedMessages[i].content = imageContents
            }
        }
    }

    return {
        updatedMessages,
        transformedMessages
    }
}

/**
 * Replace base64 image data in messages with file references
 * @param messages Array of messages that may contain base64 image data
 * @param uniqueImageMessages Array of messages with file references for new images
 * @param pastImageMessages Array of messages with file references for previous images
 * @returns Updated messages array with file references instead of base64 data
 */
export const replaceBase64ImagesWithFileReferences = (
    messages: BaseMessageLike[],
    uniqueImageMessages: BaseMessageLike[] = [],
    pastImageMessages: BaseMessageLike[] = []
): BaseMessageLike[] => {
    // Create a deep copy to avoid mutating the original
    const updatedMessages = JSON.parse(JSON.stringify(messages))
    let imageMessagesIndex = 0

    for (let i = 0; i < updatedMessages.length; i++) {
        const message = updatedMessages[i]
        if (message.content && Array.isArray(message.content)) {
            for (let j = 0; j < message.content.length; j++) {
                const item = message.content[j]
                if (item.type === 'image_url') {
                    // Look for matching file reference in uniqueImageMessages or pastImageMessages
                    const imageMessage =
                        (uniqueImageMessages[imageMessagesIndex] as BaseMessage | undefined) ||
                        (pastImageMessages[imageMessagesIndex] as BaseMessage | undefined)

                    if (imageMessage && Array.isArray(imageMessage.content) && imageMessage.content[j]) {
                        const replaceContent = imageMessage.content[j]
                        message.content[j] = {
                            ...replaceContent
                        }
                        imageMessagesIndex++
                    }
                }
            }
        }
    }

    return updatedMessages
}

/**
 * Get unique image messages from uploads
 * @param options Common options object containing uploads
 * @param messages Array of messages to check for existing images
 * @param modelConfig Model configuration object containing allowImageUploads and imageResolution
 * @returns Object containing imageMessageWithFileRef and imageMessageWithBase64
 */
export const getUniqueImageMessages = async (
    options: ICommonObject,
    messages: BaseMessageLike[],
    modelConfig?: ICommonObject
): Promise<{ imageMessageWithFileRef: BaseMessageLike; imageMessageWithBase64: BaseMessageLike } | undefined> => {
    if (!options.uploads) return undefined

    // Get images from uploads
    const images = await addImagesToMessages(options, modelConfig?.allowImageUploads, modelConfig?.imageResolution)

    // Filter out images that are already in previous messages
    const uniqueImages = images.filter((image) => {
        // Check if this image is already in any existing message
        return !messages.some((msg: any) => {
            // For multimodal content (arrays with image objects)
            if (Array.isArray(msg.content)) {
                return msg.content.some(
                    (item: any) =>
                        // Compare by image URL/content for image objects
                        item.type === 'image_url' && image.type === 'image_url' && JSON.stringify(item) === JSON.stringify(image)
                )
            }
            // For direct comparison of simple content
            return JSON.stringify(msg.content) === JSON.stringify(image)
        })
    })

    if (uniqueImages.length === 0) {
        return undefined
    }

    // Create messages with the original file references for storage/display
    const imageMessageWithFileRef = {
        role: 'user',
        content: options.uploads.map((upload: IFileUpload) => ({
            type: upload.type,
            name: upload.name,
            mime: upload.mime,
            imageResolution: modelConfig?.imageResolution
        }))
    }

    // Create messages with base64 data for the LLM
    const imageMessageWithBase64 = {
        role: 'user',
        content: uniqueImages
    }

    return {
        imageMessageWithFileRef,
        imageMessageWithBase64
    }
}

/**
 * Get past chat history image messages
 * @param pastChatHistory Array of past chat history messages
 * @param options Common options object
 * @returns Object containing updatedPastMessages and transformedPastMessages
 */
export const getPastChatHistoryImageMessages = async (
    pastChatHistory: BaseMessageLike[],
    options: ICommonObject
): Promise<{ updatedPastMessages: BaseMessageLike[]; transformedPastMessages: BaseMessageLike[] }> => {
    const chatHistory = []
    const transformedPastMessages = []

    for (let i = 0; i < pastChatHistory.length; i++) {
        const message = pastChatHistory[i] as BaseMessage & { role: string }
        const messageRole = message.role || 'user'
        if (message.additional_kwargs && message.additional_kwargs.fileUploads) {
            // example: [{"type":"stored-file","name":"0_DiXc4ZklSTo3M8J4.jpg","mime":"image/jpeg"}]
            const fileUploads = message.additional_kwargs.fileUploads
            try {
                let messageWithFileUploads = ''
                const uploads: IFileUpload[] = typeof fileUploads === 'string' ? JSON.parse(fileUploads) : fileUploads
                const imageContents: MessageContentImageUrl[] = []
                for (const upload of uploads) {
                    if (upload.type === 'stored-file' && upload.mime.startsWith('image/')) {
                        const fileData = await getFileFromStorage(upload.name, options.chatflowid, options.chatId)
                        // as the image is stored in the server, read the file and convert it to base64
                        const bf = 'data:' + upload.mime + ';base64,' + fileData.toString('base64')

                        imageContents.push({
                            type: 'image_url',
                            image_url: {
                                url: bf
                            }
                        })
                    } else if (upload.type === 'url' && upload.mime.startsWith('image') && upload.data) {
                        imageContents.push({
                            type: 'image_url',
                            image_url: {
                                url: upload.data
                            }
                        })
                    } else if (upload.type === 'stored-file:full') {
                        const fileLoaderNodeModule = await import('../../nodes/documentloaders/File/File')
                        // @ts-ignore
                        const fileLoaderNodeInstance = new fileLoaderNodeModule.nodeClass()
                        const nodeOptions = {
                            retrieveAttachmentChatId: true,
                            chatflowid: options.chatflowid,
                            chatId: options.chatId
                        }
                        let fileInputFieldFromMimeType = 'txtFile'
                        fileInputFieldFromMimeType = mapMimeTypeToInputField(upload.mime)
                        const nodeData = {
                            inputs: {
                                [fileInputFieldFromMimeType]: `FILE-STORAGE::${JSON.stringify([upload.name])}`
                            }
                        }
                        const documents: string = await fileLoaderNodeInstance.init(nodeData, '', nodeOptions)
                        messageWithFileUploads += `<doc name='${upload.name}'>${documents}</doc>\n\n`
                    }
                }
                const messageContent = messageWithFileUploads ? `${messageWithFileUploads}\n\n${message.content}` : message.content
                if (imageContents.length > 0) {
                    chatHistory.push({
                        role: messageRole,
                        content: imageContents
                    })
                    transformedPastMessages.push({
                        role: messageRole,
                        content: [...JSON.parse((pastChatHistory[i] as any).additional_kwargs.fileUploads)]
                    })
                }
                chatHistory.push({
                    role: messageRole,
                    content: messageContent
                })
            } catch (e) {
                // failed to parse fileUploads, continue with text only
                chatHistory.push({
                    role: messageRole,
                    content: message.content
                })
            }
        } else {
            chatHistory.push({
                role: messageRole,
                content: message.content
            })
        }
    }
    return {
        updatedPastMessages: chatHistory,
        transformedPastMessages
    }
}

/**
 * Updates the flow state with new values
 */
export const updateFlowState = (state: ICommonObject, llmUpdateState: IFlowState[]): ICommonObject => {
    let newFlowState: Record<string, any> = {}
    for (const state of llmUpdateState) {
        newFlowState[state.key] = state.value
    }

    return {
        ...state,
        ...newFlowState
    }
}
