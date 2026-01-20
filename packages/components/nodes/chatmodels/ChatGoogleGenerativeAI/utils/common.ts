import {
    EnhancedGenerateContentResponse,
    Content,
    Part,
    type FunctionDeclarationsTool as GoogleGenerativeAIFunctionDeclarationsTool,
    type FunctionDeclaration as GenerativeAIFunctionDeclaration,
    POSSIBLE_ROLES,
    FunctionCallPart,
    TextPart,
    FileDataPart,
    InlineDataPart
} from '@google/generative-ai'
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ChatMessage,
    ToolMessage,
    ToolMessageChunk,
    MessageContent,
    MessageContentComplex,
    UsageMetadata,
    isAIMessage,
    isBaseMessage,
    isToolMessage,
    StandardContentBlockConverter,
    parseBase64DataUrl,
    convertToProviderContentBlock,
    isDataContentBlock
} from '@langchain/core/messages'
import { ChatGeneration, ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import { isLangChainTool } from '@langchain/core/utils/function_calling'
import { isOpenAITool } from '@langchain/core/language_models/base'
import { ToolCallChunk } from '@langchain/core/messages/tool'
import { v4 as uuidv4 } from 'uuid'
import { jsonSchemaToGeminiParameters, schemaToGenerativeAIParameters } from './zod_to_genai_parameters.js'
import { GoogleGenerativeAIToolType } from './types.js'

export function getMessageAuthor(message: BaseMessage) {
    const type = message._getType()
    if (ChatMessage.isInstance(message)) {
        return message.role
    }
    if (type === 'tool') {
        return type
    }
    return message.name ?? type
}

/**
 * !!! IMPORTANT: Must return 'user' as default instead of throwing error
 * https://github.com/FlowiseAI/Flowise/issues/4743
 * Maps a message type to a Google Generative AI chat author.
 * @param message The message to map.
 * @param model The model to use for mapping.
 * @returns The message type mapped to a Google Generative AI chat author.
 */
export function convertAuthorToRole(author: string): (typeof POSSIBLE_ROLES)[number] {
    switch (author) {
        /**
         *  Note: Gemini currently is not supporting system messages
         *  we will convert them to human messages and merge with following
         * */
        case 'supervisor':
        case 'ai':
        case 'model': // getMessageAuthor returns message.name. code ex.: return message.name ?? type;
            return 'model'
        case 'system':
            return 'system'
        case 'human':
            return 'user'
        case 'tool':
        case 'function':
            return 'function'
        default:
            return 'user' // return user as default instead of throwing error
    }
}

function messageContentMedia(content: MessageContentComplex): Part {
    if ('mimeType' in content && 'data' in content) {
        return {
            inlineData: {
                mimeType: content.mimeType,
                data: content.data
            }
        }
    }
    if ('mimeType' in content && 'fileUri' in content) {
        return {
            fileData: {
                mimeType: content.mimeType,
                fileUri: content.fileUri
            }
        }
    }

    throw new Error('Invalid media content')
}

function inferToolNameFromPreviousMessages(message: ToolMessage | ToolMessageChunk, previousMessages: BaseMessage[]): string | undefined {
    return previousMessages
        .map((msg) => {
            if (isAIMessage(msg)) {
                return msg.tool_calls ?? []
            }
            return []
        })
        .flat()
        .find((toolCall) => {
            return toolCall.id === message.tool_call_id
        })?.name
}

function _getStandardContentBlockConverter(isMultimodalModel: boolean) {
    const standardContentBlockConverter: StandardContentBlockConverter<{
        text: TextPart
        image: FileDataPart | InlineDataPart
        audio: FileDataPart | InlineDataPart
        file: FileDataPart | InlineDataPart | TextPart
    }> = {
        providerName: 'Google Gemini',

        fromStandardTextBlock(block) {
            return {
                text: block.text
            }
        },

        fromStandardImageBlock(block): FileDataPart | InlineDataPart {
            if (!isMultimodalModel) {
                throw new Error('This model does not support images')
            }
            if (block.source_type === 'url') {
                const data = parseBase64DataUrl({ dataUrl: block.url })
                if (data) {
                    return {
                        inlineData: {
                            mimeType: data.mime_type,
                            data: data.data
                        }
                    }
                } else {
                    return {
                        fileData: {
                            mimeType: block.mime_type ?? '',
                            fileUri: block.url
                        }
                    }
                }
            }

            if (block.source_type === 'base64') {
                return {
                    inlineData: {
                        mimeType: block.mime_type ?? '',
                        data: block.data
                    }
                }
            }

            throw new Error(`Unsupported source type: ${block.source_type}`)
        },

        fromStandardAudioBlock(block): FileDataPart | InlineDataPart {
            if (!isMultimodalModel) {
                throw new Error('This model does not support audio')
            }
            if (block.source_type === 'url') {
                const data = parseBase64DataUrl({ dataUrl: block.url })
                if (data) {
                    return {
                        inlineData: {
                            mimeType: data.mime_type,
                            data: data.data
                        }
                    }
                } else {
                    return {
                        fileData: {
                            mimeType: block.mime_type ?? '',
                            fileUri: block.url
                        }
                    }
                }
            }

            if (block.source_type === 'base64') {
                return {
                    inlineData: {
                        mimeType: block.mime_type ?? '',
                        data: block.data
                    }
                }
            }

            throw new Error(`Unsupported source type: ${block.source_type}`)
        },

        fromStandardFileBlock(block): FileDataPart | InlineDataPart | TextPart {
            if (!isMultimodalModel) {
                throw new Error('This model does not support files')
            }
            if (block.source_type === 'text') {
                return {
                    text: block.text
                }
            }
            if (block.source_type === 'url') {
                const data = parseBase64DataUrl({ dataUrl: block.url })
                if (data) {
                    return {
                        inlineData: {
                            mimeType: data.mime_type,
                            data: data.data
                        }
                    }
                } else {
                    return {
                        fileData: {
                            mimeType: block.mime_type ?? '',
                            fileUri: block.url
                        }
                    }
                }
            }

            if (block.source_type === 'base64') {
                return {
                    inlineData: {
                        mimeType: block.mime_type ?? '',
                        data: block.data
                    }
                }
            }
            throw new Error(`Unsupported source type: ${block.source_type}`)
        }
    }
    return standardContentBlockConverter
}

function _convertLangChainContentToPart(content: MessageContentComplex, isMultimodalModel: boolean): Part | undefined {
    if (isDataContentBlock(content)) {
        return convertToProviderContentBlock(content, _getStandardContentBlockConverter(isMultimodalModel))
    }

    if (content.type === 'text') {
        return { text: content.text }
    } else if (content.type === 'executableCode') {
        return { executableCode: content.executableCode }
    } else if (content.type === 'codeExecutionResult') {
        return { codeExecutionResult: content.codeExecutionResult }
    } else if (content.type === 'image_url') {
        if (!isMultimodalModel) {
            throw new Error(`This model does not support images`)
        }
        let source
        if (typeof content.image_url === 'string') {
            source = content.image_url
        } else if (typeof content.image_url === 'object' && 'url' in content.image_url) {
            source = content.image_url.url
        } else {
            throw new Error('Please provide image as base64 encoded data URL')
        }
        const [dm, data] = source.split(',')
        if (!dm.startsWith('data:')) {
            throw new Error('Please provide image as base64 encoded data URL')
        }

        const [mimeType, encoding] = dm.replace(/^data:/, '').split(';')
        if (encoding !== 'base64') {
            throw new Error('Please provide image as base64 encoded data URL')
        }

        return {
            inlineData: {
                data,
                mimeType
            }
        }
    } else if (content.type === 'media') {
        return messageContentMedia(content)
    } else if (content.type === 'tool_use') {
        return {
            functionCall: {
                name: content.name,
                args: content.input
            }
        }
    } else if (
        content.type?.includes('/') &&
        // Ensure it's a single slash.
        content.type.split('/').length === 2 &&
        'data' in content &&
        typeof content.data === 'string'
    ) {
        return {
            inlineData: {
                mimeType: content.type,
                data: content.data
            }
        }
    } else if ('functionCall' in content) {
        // No action needed here — function calls will be added later from message.tool_calls
        return undefined
    } else {
        if ('type' in content) {
            throw new Error(`Unknown content type ${content.type}`)
        } else {
            throw new Error(`Unknown content ${JSON.stringify(content)}`)
        }
    }
}

export function convertMessageContentToParts(message: BaseMessage, isMultimodalModel: boolean, previousMessages: BaseMessage[]): Part[] {
    if (isToolMessage(message)) {
        const messageName = message.name ?? inferToolNameFromPreviousMessages(message, previousMessages)
        if (messageName === undefined) {
            throw new Error(
                `Google requires a tool name for each tool call response, and we could not infer a called tool name for ToolMessage "${message.id}" from your passed messages. Please populate a "name" field on that ToolMessage explicitly.`
            )
        }

        const result = Array.isArray(message.content)
            ? (message.content.map((c) => _convertLangChainContentToPart(c, isMultimodalModel)).filter((p) => p !== undefined) as Part[])
            : message.content

        if (message.status === 'error') {
            return [
                {
                    functionResponse: {
                        name: messageName,
                        // The API expects an object with an `error` field if the function call fails.
                        // `error` must be a valid object (not a string or array), so we wrap `message.content` here
                        response: { error: { details: result } }
                    }
                }
            ]
        }

        return [
            {
                functionResponse: {
                    name: messageName,
                    // again, can't have a string or array value for `response`, so we wrap it as an object here
                    response: { result }
                }
            }
        ]
    }

    let functionCalls: FunctionCallPart[] = []
    const messageParts: Part[] = []

    if (typeof message.content === 'string' && message.content) {
        messageParts.push({ text: message.content })
    }

    if (Array.isArray(message.content)) {
        messageParts.push(
            ...(message.content.map((c) => _convertLangChainContentToPart(c, isMultimodalModel)).filter((p) => p !== undefined) as Part[])
        )
    }

    if (isAIMessage(message) && message.tool_calls?.length) {
        functionCalls = message.tool_calls.map((tc) => {
            return {
                functionCall: {
                    name: tc.name,
                    args: tc.args
                }
            }
        })
    }

    return [...messageParts, ...functionCalls]
}

export function convertBaseMessagesToContent(
    messages: BaseMessage[],
    isMultimodalModel: boolean,
    convertSystemMessageToHumanContent: boolean = false
) {
    return messages.reduce<{
        content: Content[]
        mergeWithPreviousContent: boolean
    }>(
        (acc, message, index) => {
            if (!isBaseMessage(message)) {
                throw new Error('Unsupported message input')
            }
            const author = getMessageAuthor(message)
            if (author === 'system' && index !== 0) {
                throw new Error('System message should be the first one')
            }
            const role = convertAuthorToRole(author)

            const prevContent = acc.content[acc.content.length]
            if (!acc.mergeWithPreviousContent && prevContent && prevContent.role === role) {
                throw new Error('Google Generative AI requires alternate messages between authors')
            }

            const parts = convertMessageContentToParts(message, isMultimodalModel, messages.slice(0, index))

            if (acc.mergeWithPreviousContent) {
                const prevContent = acc.content[acc.content.length - 1]
                if (!prevContent) {
                    throw new Error('There was a problem parsing your system message. Please try a prompt without one.')
                }
                prevContent.parts.push(...parts)

                return {
                    mergeWithPreviousContent: false,
                    content: acc.content
                }
            }
            let actualRole = role
            if (actualRole === 'function' || (actualRole === 'system' && !convertSystemMessageToHumanContent)) {
                // GenerativeAI API will throw an error if the role is not "user" or "model."
                actualRole = 'user'
            }
            const content: Content = {
                role: actualRole,
                parts
            }
            return {
                mergeWithPreviousContent: author === 'system' && !convertSystemMessageToHumanContent,
                content: [...acc.content, content]
            }
        },
        { content: [], mergeWithPreviousContent: false }
    ).content
}

export function mapGenerateContentResultToChatResult(
    response: EnhancedGenerateContentResponse,
    extra?: {
        usageMetadata: UsageMetadata | undefined
    }
): ChatResult {
    // if rejected or error, return empty generations with reason in filters
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0]) {
        return {
            generations: [],
            llmOutput: {
                filters: response.promptFeedback
            }
        }
    }

    const functionCalls = response.functionCalls()
    const [candidate] = response.candidates
    const { content: candidateContent, ...generationInfo } = candidate
    let content: MessageContent | undefined
    const inlineDataItems: any[] = []

    if (Array.isArray(candidateContent?.parts) && candidateContent.parts.length === 1 && candidateContent.parts[0].text) {
        content = candidateContent.parts[0].text
    } else if (Array.isArray(candidateContent?.parts) && candidateContent.parts.length > 0) {
        content = candidateContent.parts.map((p) => {
            if ('text' in p) {
                return {
                    type: 'text',
                    text: p.text
                }
            } else if ('executableCode' in p) {
                return {
                    type: 'executableCode',
                    executableCode: p.executableCode
                }
            } else if ('codeExecutionResult' in p) {
                return {
                    type: 'codeExecutionResult',
                    codeExecutionResult: p.codeExecutionResult
                }
            } else if ('inlineData' in p && p.inlineData) {
                // Extract inline image data for processing by Agent
                inlineDataItems.push({
                    type: 'gemini_inline_data',
                    mimeType: p.inlineData.mimeType,
                    data: p.inlineData.data
                })
                // Return the inline data as part of the content structure
                return {
                    type: 'inlineData',
                    inlineData: p.inlineData
                }
            }
            return p
        })
    } else {
        // no content returned - likely due to abnormal stop reason, e.g. malformed function call
        content = []
    }

    let text = ''
    if (typeof content === 'string') {
        text = content
    } else if (Array.isArray(content) && content.length > 0) {
        const block = content.find((b) => 'text' in b) as { text: string } | undefined
        text = block?.text ?? text
    }

    // Build response_metadata with inline data if present
    const response_metadata: any = {}
    if (inlineDataItems.length > 0) {
        response_metadata.inlineData = inlineDataItems
    }

    const generation: ChatGeneration = {
        text,
        message: new AIMessage({
            content: content ?? '',
            tool_calls: functionCalls?.map((fc) => {
                return {
                    ...fc,
                    type: 'tool_call',
                    id: 'id' in fc && typeof fc.id === 'string' ? fc.id : uuidv4()
                }
            }),
            additional_kwargs: {
                ...generationInfo
            },
            usage_metadata: extra?.usageMetadata,
            response_metadata: Object.keys(response_metadata).length > 0 ? response_metadata : undefined
        }),
        generationInfo
    }

    return {
        generations: [generation],
        llmOutput: {
            tokenUsage: {
                promptTokens: extra?.usageMetadata?.input_tokens,
                completionTokens: extra?.usageMetadata?.output_tokens,
                totalTokens: extra?.usageMetadata?.total_tokens
            }
        }
    }
}

export function convertResponseContentToChatGenerationChunk(
    response: EnhancedGenerateContentResponse,
    extra: {
        usageMetadata?: UsageMetadata | undefined
        index: number
    }
): ChatGenerationChunk | null {
    if (!response.candidates || response.candidates.length === 0) {
        return null
    }
    const functionCalls = response.functionCalls()
    const [candidate] = response.candidates
    const { content: candidateContent, ...generationInfo } = candidate
    let content: MessageContent | undefined
    const inlineDataItems: any[] = []

    // Checks if some parts do not have text. If false, it means that the content is a string.
    if (Array.isArray(candidateContent?.parts) && candidateContent.parts.every((p) => 'text' in p)) {
        content = candidateContent.parts.map((p) => p.text).join('')
    } else if (Array.isArray(candidateContent?.parts)) {
        content = candidateContent.parts.map((p) => {
            if ('text' in p) {
                return {
                    type: 'text',
                    text: p.text
                }
            } else if ('executableCode' in p) {
                return {
                    type: 'executableCode',
                    executableCode: p.executableCode
                }
            } else if ('codeExecutionResult' in p) {
                return {
                    type: 'codeExecutionResult',
                    codeExecutionResult: p.codeExecutionResult
                }
            } else if ('inlineData' in p && p.inlineData) {
                // Extract inline image data for processing by Agent
                inlineDataItems.push({
                    type: 'gemini_inline_data',
                    mimeType: p.inlineData.mimeType,
                    data: p.inlineData.data
                })
                // Return the inline data as part of the content structure
                return {
                    type: 'inlineData',
                    inlineData: p.inlineData
                }
            }
            return p
        })
    } else {
        // no content returned - likely due to abnormal stop reason, e.g. malformed function call
        content = []
    }

    let text = ''
    if (content && typeof content === 'string') {
        text = content
    } else if (Array.isArray(content)) {
        const block = content.find((b) => 'text' in b) as { text: string } | undefined
        text = block?.text ?? ''
    }

    const toolCallChunks: ToolCallChunk[] = []
    if (functionCalls) {
        toolCallChunks.push(
            ...functionCalls.map((fc) => ({
                ...fc,
                args: JSON.stringify(fc.args),
                index: extra.index,
                type: 'tool_call_chunk' as const,
                id: 'id' in fc && typeof fc.id === 'string' ? fc.id : uuidv4()
            }))
        )
    }

    // Build response_metadata with inline data if present
    const response_metadata: any = {}
    if (inlineDataItems.length > 0) {
        response_metadata.inlineData = inlineDataItems
    }

    return new ChatGenerationChunk({
        text,
        message: new AIMessageChunk({
            content: content || '',
            name: !candidateContent ? undefined : candidateContent.role,
            tool_call_chunks: toolCallChunks,
            // Each chunk can have unique "generationInfo", and merging strategy is unclear,
            // so leave blank for now.
            additional_kwargs: {},
            usage_metadata: extra.usageMetadata,
            response_metadata: Object.keys(response_metadata).length > 0 ? response_metadata : undefined
        }),
        generationInfo
    })
}

export function convertToGenerativeAITools(tools: GoogleGenerativeAIToolType[]): GoogleGenerativeAIFunctionDeclarationsTool[] {
    if (tools.every((tool) => 'functionDeclarations' in tool && Array.isArray(tool.functionDeclarations))) {
        return tools as GoogleGenerativeAIFunctionDeclarationsTool[]
    }
    return [
        {
            functionDeclarations: tools.map((tool): GenerativeAIFunctionDeclaration => {
                if (isLangChainTool(tool)) {
                    const jsonSchema = schemaToGenerativeAIParameters(tool.schema)
                    if (jsonSchema.type === 'object' && 'properties' in jsonSchema && Object.keys(jsonSchema.properties).length === 0) {
                        return {
                            name: tool.name,
                            description: tool.description
                        }
                    }
                    return {
                        name: tool.name,
                        description: tool.description,
                        parameters: jsonSchema
                    }
                }
                if (isOpenAITool(tool)) {
                    return {
                        name: tool.function.name,
                        description: tool.function.description ?? `A function available to call.`,
                        parameters: jsonSchemaToGeminiParameters(tool.function.parameters)
                    }
                }
                return tool as unknown as GenerativeAIFunctionDeclaration
            })
        }
    ]
}
