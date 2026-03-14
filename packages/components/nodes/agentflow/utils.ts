import { BaseMessage, MessageContentImageUrl, AIMessageChunk, MessageContentComplex } from '@langchain/core/messages'
import type { ContentBlock } from 'langchain'
import { getImageUploads } from '../../src/multiModalUtils'
import { addSingleFileToStorage, getFileFromStorage } from '../../src/storageUtils'
import { ICommonObject, IFileUpload, INodeData } from '../../src/Interface'
import { BaseMessageLike } from '@langchain/core/messages'
import {
    IFlowState,
    IImageFileRef,
    IArtifact,
    IFileAnnotation,
    ISavedImageResult,
    ISavedInlineImage,
    IResponseMetadata,
    IChatMessage,
    IImageArtifact,
    IMultimodalContentItem,
    IMessageAdditionalKwargs
} from './Interface.Agentflow'
import { getCredentialData, getCredentialParam, handleEscapeCharacters, mapMimeTypeToInputField } from '../../src/utils'
import { sanitizeFileName } from '../../src/validator'
import fetch from 'node-fetch'

// ─── Constants ───────────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

const MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
    xml: 'application/xml'
}

const ARTIFACT_TYPES: Record<string, string> = {
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    html: 'html',
    htm: 'html',
    md: 'markdown',
    markdown: 'markdown',
    json: 'json',
    js: 'javascript',
    javascript: 'javascript',
    tex: 'latex',
    latex: 'latex',
    txt: 'text',
    csv: 'text',
    pdf: 'text'
}

// ─── Shared helpers (used across multiple functions) ─────────────────────────

/** Reads a file from storage and returns a base64 data-URL string. */
const storedFileToBase64 = async (fileName: string, mime: string, options: ICommonObject): Promise<string> => {
    const contents = await getFileFromStorage(fileName, options.orgId, options.chatflowid, options.chatId)
    return 'data:' + mime + ';base64,' + contents.toString('base64')
}

/** Saves raw base64 data to storage as a file. Returns the file path, name, and size. */
const saveImageToStorage = async (
    base64Data: string,
    mimeType: string,
    fileName: string,
    options: ICommonObject
): Promise<ISavedImageResult> => {
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const { path, totalSize } = await addSingleFileToStorage(
        mimeType,
        imageBuffer,
        fileName,
        options.orgId,
        options.chatflowid,
        options.chatId
    )
    return { filePath: path, fileName, totalSize }
}

// ─── Processing stored-file references into base64 for model invocation ──────

/**
 * Converts stored-file references in user messages to base64 image_url content
 * so LLM providers can process them. Returns both the updated messages and copies
 * of the originals that were transformed (for later reverting).
 *
 * The base64 content is only needed during model invocation — after the call,
 * use `revertBase64ImagesToFileRefs` to restore lightweight file references.
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
    const updatedMessages: IChatMessage[] = JSON.parse(JSON.stringify(messages))
    // Track which messages were transformed
    const transformedMessages: BaseMessageLike[] = []

    // Scan through all messages looking for stored-file references
    for (let i = 0; i < updatedMessages.length; i++) {
        const message = updatedMessages[i]
        // Skip non-user messages or messages without content
        if (message.role !== 'user' || !Array.isArray(message.content)) continue

        const imageContents: MessageContentImageUrl[] = []
        const fileRefs: IImageFileRef[] = []
        let hasImageReferences = false

        // Find stored-file image items and convert them to base64 image_url items
        for (const item of message.content as IMultimodalContentItem[]) {
            if (item.type === 'stored-file' && item.name && item.mime?.startsWith('image/')) {
                hasImageReferences = true
                try {
                    const fileName = sanitizeFileName(item.name)
                    const base64Url = await storedFileToBase64(fileName, item.mime, options)
                    // Track which content index maps to which file, so we can revert later
                    fileRefs.push({ index: imageContents.length, fileName, mime: item.mime })
                    imageContents.push({
                        type: 'image_url',
                        image_url: {
                            url: base64Url
                        }
                    })
                } catch (error) {
                    console.error(`Failed to load image ${item.name}:`, error)
                }
            }
        }

        if (imageContents.length > 0) {
            // Save a copy of the original message before we replace its content
            if (hasImageReferences) {
                transformedMessages.push(JSON.parse(JSON.stringify(messages[i])))
            }
            updatedMessages[i].content = imageContents
            // Store file refs in additional_kwargs (not sent to the LLM API)
            if (fileRefs.length > 0) {
                if (!updatedMessages[i].additional_kwargs) updatedMessages[i].additional_kwargs = {}
                updatedMessages[i].additional_kwargs!._imageFileRefs = fileRefs
            }
        }
    }

    return { updatedMessages, transformedMessages }
}

// ─── Reverting base64 back to stored-file references ─────────────────────────

/**
 * After model invocation, reverts base64 image_url items back to lightweight
 * stored-file references using the `_imageFileRefs` metadata in additional_kwargs.
 * This keeps chat history storage efficient (no base64 blobs).
 */
export const revertBase64ImagesToFileRefs = (messages: BaseMessageLike[]): BaseMessageLike[] => {
    const updatedMessages: IChatMessage[] = JSON.parse(JSON.stringify(messages))

    for (const message of updatedMessages) {
        const fileRefs: IImageFileRef[] = message.additional_kwargs?._imageFileRefs || []

        if (message.content && Array.isArray(message.content) && fileRefs.length > 0) {
            const contentArray = message.content as MessageContentComplex[]
            // Replace each image_url item with its stored-file equivalent
            for (const ref of fileRefs) {
                const item = contentArray[ref.index] as IMultimodalContentItem | undefined
                if (item && ref.index < contentArray.length && item.type === 'image_url') {
                    contentArray[ref.index] = {
                        type: 'stored-file',
                        name: ref.fileName,
                        mime: ref.mime
                    } as ContentBlock
                }
            }
            // Clean up the temporary tracking metadata
            delete message.additional_kwargs!._imageFileRefs
            if (message.additional_kwargs && Object.keys(message.additional_kwargs).length === 0) {
                delete message.additional_kwargs
            }
        }
    }

    return updatedMessages
}

// ─── Handling new image uploads ──────────────────────────────────────────────

/**
 * Builds unique image messages from the current upload payload.
 * Returns two versions:
 *   - `imageMessageWithFileRef`: lightweight stored-file references (for chat history)
 *   - `imageMessageWithBase64`: base64 data URLs (for model invocation)
 * Returns undefined if no new unique images are found.
 */
export const getUniqueImageMessages = async (
    options: ICommonObject,
    messages: BaseMessageLike[],
    modelConfig?: ICommonObject
): Promise<{ imageMessageWithFileRef: BaseMessageLike; imageMessageWithBase64: BaseMessageLike } | undefined> => {
    if (!options.uploads) return undefined

    // Get images from uploads
    const images = await _addImagesToMessages(options, modelConfig?.allowImageUploads ?? false)
    const imageUploads = getImageUploads(options.uploads)

    // Collect (fileName, mime) already present in messages via _imageFileRefs
    const alreadyPresentRefs = new Set<string>()
    for (const msg of messages) {
        const refs = (msg as IChatMessage).additional_kwargs?._imageFileRefs
        if (refs) {
            for (const r of refs) {
                alreadyPresentRefs.add(`${sanitizeFileName(r.fileName)}:${r.mime}`)
            }
        }
    }

    // Filter out images already present in previous messages to avoid duplicates; keep (image, upload) pairs so indices stay aligned
    const uniquePairs: { image: MessageContentImageUrl; upload: IFileUpload }[] = []
    images.forEach((image, index) => {
        const upload = imageUploads[index]
        if (upload && alreadyPresentRefs.has(`${sanitizeFileName(upload.name)}:${upload.mime}`)) {
            return
        }
        const alreadyInContent = messages.some((msg) => {
            const chatMsg = msg as IChatMessage
            if (Array.isArray(chatMsg.content)) {
                return chatMsg.content.some(
                    (item) =>
                        (item as IMultimodalContentItem).type === 'image_url' &&
                        image.type === 'image_url' &&
                        JSON.stringify(item) === JSON.stringify(image)
                )
            }
            return JSON.stringify(chatMsg.content) === JSON.stringify(image)
        })
        if (!alreadyInContent) uniquePairs.push({ image, upload })
    })

    const uniqueImages = uniquePairs.map((p) => p.image)

    if (uniqueImages.length === 0) return undefined

    // File-ref version: lightweight references for storage (only unique uploads)
    const imageMessageWithFileRef: IChatMessage = {
        role: 'user',
        content: uniquePairs.map(({ upload }) => ({
            type: upload.type,
            name: sanitizeFileName(upload.name),
            mime: upload.mime
        })) as ContentBlock[]
    }

    // Build _imageFileRefs tracking from uploads (stored-file types only)
    const fileRefs: IImageFileRef[] = []
    uniquePairs.forEach(({ upload }, i) => {
        if (upload && upload.type === 'stored-file') {
            fileRefs.push({ index: i, fileName: sanitizeFileName(upload.name), mime: upload.mime })
        }
    })

    // Base64 version: full image data for model invocation
    const imageMessageWithBase64: IChatMessage = { role: 'user', content: uniqueImages }
    if (fileRefs.length > 0) {
        imageMessageWithBase64.additional_kwargs = { _imageFileRefs: fileRefs }
    }

    return {
        imageMessageWithFileRef,
        imageMessageWithBase64
    }
}

// ─── Reconstructing past chat history with images ────────────────────────────

/**
 * Processes past chat history messages, loading file uploads and converting
 * stored images to base64 for model consumption. Also preserves additional_kwargs
 * metadata (artifacts, file annotations, used tools) on each message.
 */
export const getPastChatHistoryImageMessages = async (
    pastChatHistory: BaseMessageLike[],
    options: ICommonObject
): Promise<{ updatedPastMessages: BaseMessageLike[]; transformedPastMessages: BaseMessageLike[] }> => {
    const chatHistory: IChatMessage[] = []
    const transformedPastMessages: IChatMessage[] = []

    for (let i = 0; i < pastChatHistory.length; i++) {
        const message = pastChatHistory[i] as BaseMessage & { role: string }
        const messageRole = message.role || 'user'

        // Collect non-empty additional_kwargs (artifacts, fileAnnotations, usedTools)
        const collectKwargs = (source: Record<string, unknown>): IMessageAdditionalKwargs | undefined => {
            const result: IMessageAdditionalKwargs = {}
            let found = false
            for (const key of ['artifacts', 'fileAnnotations', 'usedTools'] as const) {
                const val = source[key]
                if (val && Array.isArray(val) && val.length > 0) {
                    result[key] = val
                    found = true
                }
            }
            return found ? result : undefined
        }

        if (message.additional_kwargs && message.additional_kwargs.fileUploads) {
            const { fileUploads, artifacts, fileAnnotations, usedTools } = message.additional_kwargs
            try {
                let messageWithFileUploads = ''
                const uploads: IFileUpload[] = typeof fileUploads === 'string' ? JSON.parse(fileUploads) : fileUploads
                const imageContents: MessageContentImageUrl[] = []
                const fileRefs: IImageFileRef[] = []

                for (const upload of uploads as IFileUpload[]) {
                    if (upload.type === 'stored-file' && upload.mime.startsWith('image/')) {
                        // Convert stored images to base64 for model consumption
                        const fileName = sanitizeFileName(upload.name)
                        const base64Url = await storedFileToBase64(fileName, upload.mime, options)
                        fileRefs.push({ index: imageContents.length, fileName, mime: upload.mime })
                        imageContents.push({
                            type: 'image_url',
                            image_url: {
                                url: base64Url
                            }
                        })
                    } else if (upload.type === 'url' && upload.mime.startsWith('image') && upload.data) {
                        // URL-based images can be passed through directly
                        imageContents.push({
                            type: 'image_url',
                            image_url: {
                                url: upload.data
                            }
                        })
                    } else if (upload.type === 'stored-file:full') {
                        // Full document uploads: load and inline as XML-wrapped text
                        const safeFileName = sanitizeFileName(upload.name)
                        const fileLoaderNodeModule = await import('../../nodes/documentloaders/File/File')
                        // @ts-ignore
                        const fileLoaderNodeInstance = new fileLoaderNodeModule.nodeClass()
                        const nodeData = {
                            inputs: {
                                [mapMimeTypeToInputField(upload.mime)]: `FILE-STORAGE::${JSON.stringify([safeFileName])}`
                            }
                        }
                        const documents: string = await fileLoaderNodeInstance.init(nodeData, '', {
                            retrieveAttachmentChatId: true,
                            chatflowid: options.chatflowid,
                            chatId: options.chatId,
                            orgId: options.orgId
                        })
                        messageWithFileUploads += `<doc name='${safeFileName}'>${handleEscapeCharacters(documents, true)}</doc>\n\n`
                    }
                }

                const extraKwargs = collectKwargs({ artifacts, fileAnnotations, usedTools } as Record<string, unknown>)

                // Add image message if we found any images
                if (imageContents.length > 0) {
                    const imageMsg: IChatMessage = {
                        role: messageRole,
                        content: imageContents
                    }
                    if (fileRefs.length > 0) {
                        imageMsg.additional_kwargs = { _imageFileRefs: fileRefs }
                    }
                    if (extraKwargs) {
                        imageMsg.additional_kwargs = { ...imageMsg.additional_kwargs, ...extraKwargs }
                    }
                    chatHistory.push(imageMsg)

                    // Keep a copy of the original file uploads for potential reverting
                    const rawFileUploads = (pastChatHistory[i] as BaseMessage).additional_kwargs.fileUploads as string
                    transformedPastMessages.push({
                        role: messageRole,
                        content: [...JSON.parse(rawFileUploads)] as ContentBlock[]
                    })
                }

                // Add the text content (with any inlined document uploads prepended)
                const messageContent = messageWithFileUploads
                    ? `${messageWithFileUploads}\n\n${message.content}`
                    : (message.content as string)
                const textMsg: IChatMessage = { role: messageRole, content: messageContent }
                if (extraKwargs) textMsg.additional_kwargs = extraKwargs
                chatHistory.push(textMsg)
            } catch (e) {
                // Fallback: just use the text content with any available kwargs
                const extraKwargs = collectKwargs({
                    artifacts: message.additional_kwargs.artifacts,
                    fileAnnotations: message.additional_kwargs.fileAnnotations,
                    usedTools: message.additional_kwargs.usedTools
                } as Record<string, unknown>)
                const msg: IChatMessage = { role: messageRole, content: message.content as string }
                if (extraKwargs) msg.additional_kwargs = extraKwargs
                chatHistory.push(msg)
            }
        } else if (message.additional_kwargs) {
            const extraKwargs = collectKwargs(message.additional_kwargs as Record<string, unknown>)
            const msg: IChatMessage = { role: messageRole, content: message.content as string }
            if (extraKwargs) msg.additional_kwargs = extraKwargs
            chatHistory.push(msg)
        } else {
            chatHistory.push({ role: messageRole, content: message.content as string })
        }
    }
    return { updatedPastMessages: chatHistory, transformedPastMessages }
}

// ─── MIME type and artifact type lookups ──────────────────────────────────────

/** Returns the MIME type for a filename based on its extension. */
export const getMimeTypeFromFilename = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop()
    return MIME_TYPES[extension || ''] || 'application/octet-stream'
}

/** Returns the artifact type (for UI rendering) based on a filename's extension. */
export const getArtifactTypeFromFilename = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop()
    return ARTIFACT_TYPES[extension || ''] || 'text'
}

// ─── Saving generated images to storage ──────────────────────────────────────

/** Saves base64 image data to storage and returns file information */
export const saveBase64Image = async (
    outputItem: { result?: string; id?: string; output_format?: string },
    options: ICommonObject
): Promise<ISavedImageResult | null> => {
    try {
        if (!outputItem.result) return null
        const outputFormat = outputItem.output_format || 'png'
        const fileName = `generated_image_${outputItem.id || Date.now()}.${outputFormat}`
        const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg'
        return await saveImageToStorage(outputItem.result, mimeType, fileName, options)
    } catch (error) {
        console.error('Error saving base64 image:', error)
        return null
    }
}

/** Saves a Gemini inline image to storage. */
export const saveGeminiInlineImage = async (
    inlineItem: { data?: string; mimeType?: string },
    options: ICommonObject
): Promise<ISavedImageResult | null> => {
    try {
        if (!inlineItem.data || !inlineItem.mimeType) return null
        // Derive file extension from MIME type
        const mime = inlineItem.mimeType
        const extension =
            mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('gif') ? 'gif' : mime.includes('webp') ? 'webp' : 'png'
        const fileName = `gemini_generated_image_${Date.now()}.${extension}`
        return await saveImageToStorage(inlineItem.data, inlineItem.mimeType, fileName, options)
    } catch (error) {
        console.error('Error saving Gemini inline image:', error)
        return null
    }
}

// ─── Downloading container files from OpenAI ─────────────────────────────────

/** Downloads a file from an OpenAI container (used for file citations in responses). */
export const downloadContainerFile = async (
    containerId: string,
    fileId: string,
    filename: string,
    modelNodeData: INodeData,
    options: ICommonObject
): Promise<{ filePath: string; totalSize: number } | null> => {
    try {
        const credentialData = await getCredentialData(modelNodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, modelNodeData)

        if (!openAIApiKey) {
            console.warn('No OpenAI API key available for downloading container file')
            return null
        }

        const response = await fetch(`https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`, {
            method: 'GET',
            headers: {
                Accept: '*/*',
                Authorization: `Bearer ${openAIApiKey}`
            }
        })

        if (!response.ok) {
            console.warn(
                `Failed to download container file ${fileId} from container ${containerId}: ${response.status} ${response.statusText}`
            )
            return null
        }

        const data = await response.arrayBuffer()
        const dataBuffer = Buffer.from(data)
        const mimeType = getMimeTypeFromFilename(filename)

        const { path, totalSize } = await addSingleFileToStorage(
            mimeType,
            dataBuffer,
            filename,
            options.orgId,
            options.chatflowid,
            options.chatId
        )

        return { filePath: path, totalSize }
    } catch (error) {
        console.error('Error downloading container file:', error)
        return null
    }
}

// ─── Replacing inline image data with file references in responses ───────────

/**
 * Replaces Gemini inlineData content items in a response with stored-file references,
 * so the response content doesn't contain raw base64 data.
 */
export const replaceInlineDataWithFileReferences = (response: AIMessageChunk, savedInlineImages: ISavedInlineImage[]): void => {
    if (!Array.isArray(response.content)) return

    let savedImageIndex = 0
    for (let i = 0; i < response.content.length; i++) {
        const contentItem = response.content[i]
        if (
            typeof contentItem === 'object' &&
            (contentItem as IMultimodalContentItem).type === 'inlineData' &&
            (contentItem as Record<string, unknown>).inlineData &&
            savedImageIndex < savedInlineImages.length
        ) {
            const savedImage = savedInlineImages[savedImageIndex]
            response.content[i] = {
                type: 'stored-file',
                name: savedImage.fileName,
                mime: savedImage.mimeType,
                path: savedImage.filePath
            } as ContentBlock
            savedImageIndex++
        }
    }

    if (response.response_metadata?.inlineData) {
        delete response.response_metadata.inlineData
    }
}

// ─── Extracting artifacts from LLM response metadata ─────────────────────────

/**
 * Processes response metadata from LLM providers to extract:
 *   - Image artifacts (OpenAI image generation, Gemini inline data)
 *   - File annotations (OpenAI container file citations)
 * Saves generated images to storage and returns metadata for the UI.
 */
export const extractArtifactsFromResponse = async (
    responseMetadata: IResponseMetadata | undefined,
    modelNodeData: INodeData,
    options: ICommonObject
): Promise<{
    artifacts: IArtifact[]
    fileAnnotations: IFileAnnotation[]
    savedInlineImages?: ISavedInlineImage[]
}> => {
    const artifacts: IArtifact[] = []
    const fileAnnotations: IFileAnnotation[] = []
    const savedInlineImages: ISavedInlineImage[] = []

    // --- Gemini inline data (image generation) ---
    if (responseMetadata?.inlineData && Array.isArray(responseMetadata.inlineData)) {
        for (const inlineItem of responseMetadata.inlineData) {
            if (inlineItem.type === 'gemini_inline_data' && inlineItem.data && inlineItem.mimeType) {
                try {
                    const savedImageResult = await saveGeminiInlineImage(inlineItem, options)
                    if (savedImageResult) {
                        artifacts.push({
                            type: getArtifactTypeFromFilename(savedImageResult.fileName),
                            data: savedImageResult.filePath
                        })
                        savedInlineImages.push({
                            filePath: savedImageResult.filePath,
                            fileName: savedImageResult.fileName,
                            mimeType: inlineItem.mimeType
                        })
                    }
                } catch (error) {
                    console.error('Error processing Gemini inline image artifact:', error)
                }
            }
        }
    }

    if (!responseMetadata?.output || !Array.isArray(responseMetadata.output)) {
        return { artifacts, fileAnnotations, savedInlineImages: savedInlineImages.length > 0 ? savedInlineImages : undefined }
    }

    for (const outputItem of responseMetadata.output) {
        // --- Container file citations (OpenAI responses API) ---
        if (outputItem.type === 'message' && outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentItem of outputItem.content) {
                if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
                    for (const annotation of contentItem.annotations) {
                        if (annotation.type === 'container_file_citation' && annotation.file_id && annotation.filename) {
                            try {
                                const downloadResult = await downloadContainerFile(
                                    annotation.container_id,
                                    annotation.file_id,
                                    annotation.filename,
                                    modelNodeData,
                                    options
                                )

                                if (downloadResult) {
                                    const fileType = getArtifactTypeFromFilename(annotation.filename)

                                    if (fileType === 'png' || fileType === 'jpeg' || fileType === 'jpg') {
                                        artifacts.push({ type: fileType, data: downloadResult.filePath })
                                    } else {
                                        fileAnnotations.push({
                                            filePath: downloadResult.filePath,
                                            fileName: annotation.filename
                                        })
                                    }
                                }
                            } catch (error) {
                                console.error('Error processing annotation:', error)
                            }
                        }
                    }
                }
            }
        }

        // --- OpenAI built-in tool artifacts (image generation) ---
        if (outputItem.type === 'image_generation_call' && outputItem.result) {
            try {
                const savedImageResult = await saveBase64Image(outputItem, options)
                if (savedImageResult) {
                    outputItem.result = savedImageResult.filePath
                    artifacts.push({
                        type: getArtifactTypeFromFilename(savedImageResult.fileName),
                        data: savedImageResult.filePath
                    })
                }
            } catch (error) {
                console.error('Error processing image generation artifact:', error)
            }
        }
    }

    return { artifacts, fileAnnotations, savedInlineImages: savedInlineImages.length > 0 ? savedInlineImages : undefined }
}

// ─── Injecting image artifacts as temporary messages for model context ────────

/**
 * Scans assistant messages for image artifacts and inserts temporary user messages
 * containing the base64 image data right after each assistant message. This allows
 * the model to "see" previously generated images in follow-up turns.
 *
 * These temporary messages are marked with `_isTemporaryImageMessage: true` so they
 * can be stripped out after model invocation (they shouldn't be persisted).
 */
export const addImageArtifactsToMessages = async (messages: BaseMessageLike[], options: ICommonObject): Promise<void> => {
    const messagesToInsert: Array<{ index: number; base64Message: IChatMessage }> = []

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i] as IChatMessage

        if (
            (message.role !== 'assistant' && message.role !== 'ai') ||
            !message.additional_kwargs?.artifacts ||
            !Array.isArray(message.additional_kwargs.artifacts)
        ) {
            continue
        }

        // Find image-type artifacts in this assistant message
        const imageArtifacts: IImageArtifact[] = []
        for (const artifact of message.additional_kwargs.artifacts) {
            if (artifact.type && artifact.data && IMAGE_EXTENSIONS.includes(artifact.type.toLowerCase())) {
                imageArtifacts.push({
                    name: sanitizeFileName(artifact.data),
                    mime: `image/${artifact.type.toLowerCase()}`
                })
            }
        }

        if (imageArtifacts.length === 0) continue

        // Skip if the next message already contains these image artifacts
        const nextMessage = messages[i + 1] as IChatMessage | undefined
        const alreadyPresent =
            nextMessage &&
            nextMessage.role === 'user' &&
            Array.isArray(nextMessage.content) &&
            (nextMessage.content as IMultimodalContentItem[]).some(
                (item) =>
                    (item.type === 'stored-file' || item.type === 'image_url') &&
                    imageArtifacts.some((artifact) => {
                        const artifactName = artifact.name.replace('FILE-STORAGE::', '')
                        const itemName = item.name?.replace('FILE-STORAGE::', '') || ''
                        return artifactName === itemName
                    })
            )

        if (alreadyPresent) continue

        // Build base64 content for each image artifact
        const base64Contents: MessageContentImageUrl[] = []
        const fileRefs: IImageFileRef[] = []

        for (const artifact of imageArtifacts) {
            try {
                const fileName = sanitizeFileName(artifact.name)
                const base64Url = await storedFileToBase64(fileName, artifact.mime, options)
                fileRefs.push({ index: base64Contents.length, fileName, mime: artifact.mime })
                base64Contents.push({
                    type: 'image_url',
                    image_url: { url: base64Url }
                })
            } catch (error) {
                console.error(`Failed to load artifact image ${artifact.name}:`, error)
            }
        }

        if (base64Contents.length > 0) {
            const base64Message: IChatMessage = { role: 'user', content: base64Contents, _isTemporaryImageMessage: true }
            if (fileRefs.length > 0) {
                base64Message.additional_kwargs = { _imageFileRefs: fileRefs }
            }
            messagesToInsert.push({ index: i + 1, base64Message })
        }
    }

    // Insert in reverse order so indices remain valid
    for (let i = messagesToInsert.length - 1; i >= 0; i--) {
        const { index, base64Message } = messagesToInsert[i]
        messages.splice(index, 0, base64Message as unknown as BaseMessageLike)
    }
}

// ─── Flow state management ───────────────────────────────────────────────────

/** Merges new key-value pairs into the flow state. */
export const updateFlowState = (state: ICommonObject, updateState: IFlowState[]): ICommonObject => {
    const newFlowState: Record<string, string> = {}
    for (const s of updateState) {
        newFlowState[s.key] = s.value
    }
    return { ...state, ...newFlowState }
}

// ─── Private: converting uploads to base64 image content ─────────────────────

/** Converts image uploads to base64 image_url content items for model consumption. */
const _addImagesToMessages = async (options: ICommonObject, allowImageUploads: boolean): Promise<MessageContentImageUrl[]> => {
    const imageContent: MessageContentImageUrl[] = []

    if (!allowImageUploads || !options?.uploads?.length) return imageContent

    const imageUploads = getImageUploads(options.uploads)
    for (const upload of imageUploads) {
        let url = upload.data
        if (upload.type === 'stored-file') {
            const fileName = sanitizeFileName(upload.name)
            url = await storedFileToBase64(fileName, upload.mime, options)
        }
        if (url) {
            imageContent.push({
                type: 'image_url',
                image_url: { url }
            })
        }
    }

    return imageContent
}
