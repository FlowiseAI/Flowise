import { IMultiModalOption, IVisionChatModal } from '../../../src/Interface'
import { ChatGoogleGenerativeAI as LangchainChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from '@langchain/google-genai'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatResult, ChatGenerationChunk } from '@langchain/core/outputs'
import {
    EnhancedGenerateContentResponse,
    Content,
    Part,
    POSSIBLE_ROLES,
    FunctionCallPart,
    TextPart,
    FileDataPart,
    InlineDataPart,
    GenerateContentResponse
} from '@google/generative-ai'
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ChatMessage,
    MessageContent,
    MessageContentComplex,
    UsageMetadata,
    StandardContentBlockConverter,
    parseBase64DataUrl,
    convertToProviderContentBlock,
    isDataContentBlock,
    ToolMessage,
    InputTokenDetails
} from '@langchain/core/messages'
import { ChatGeneration } from '@langchain/core/outputs'
import { ToolCallChunk } from '@langchain/core/messages/tool'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Constants
// ============================================================================

export const _FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY = '__gemini_function_call_thought_signatures__'
const DUMMY_SIGNATURE =
    'ErYCCrMCAdHtim9kOoOkrPiCNVsmlpMIKd7ZMxgiFbVQOkgp7nlLcDMzVsZwIzvuT7nQROivoXA72ccC2lSDvR0Gh7dkWaGuj7ctv6t7ZceHnecx0QYa+ix8tYpRfjhyWozQ49lWiws6+YGjCt10KRTyWsZ2h6O7iHTYJwKIRwGUHRKy/qK/6kFxJm5ML00gLq4D8s5Z6DBpp2ZlR+uF4G8jJgeWQgyHWVdx2wGYElaceVAc66tZdPQRdOHpWtgYSI1YdaXgVI8KHY3/EfNc2YqqMIulvkDBAnuMhkAjV9xmBa54Tq+ih3Im4+r3DzqhGqYdsSkhS0kZMwte4Hjs65dZzCw9lANxIqYi1DJ639WNPYihp/DCJCos7o+/EeSPJaio5sgWDyUnMGkY1atsJZ+m7pj7DD5tvQ=='

// Extended Part type with thinking support
type GoogleGenerativeAIPart = Part & {
    thought?: boolean
    thoughtSignature?: string
}

// ============================================================================
// Utility Functions for Message Conversion
// ============================================================================

export function getMessageAuthor(message: BaseMessage) {
    if (ChatMessage.isInstance(message)) {
        return message.role
    }
    return message.type
}

/**
 * Maps a message type to a Google Generative AI chat author.
 * Returns 'user' as default instead of throwing error
 * https://github.com/FlowiseAI/Flowise/issues/4743
 */
export function convertAuthorToRole(author: string): (typeof POSSIBLE_ROLES)[number] {
    switch (author) {
        case 'supervisor':
        case 'ai':
        case 'model':
            return 'model'
        case 'system':
            return 'system'
        case 'human':
            return 'user'
        case 'tool':
        case 'function':
            return 'function'
        default:
            return 'user'
    }
}

function messageContentMedia(content: MessageContentComplex): Part {
    if ('mimeType' in content && 'data' in content) {
        return {
            inlineData: {
                mimeType: content.mimeType as string,
                data: content.data as string
            }
        }
    }
    if ('mimeType' in content && 'fileUri' in content) {
        return {
            fileData: {
                mimeType: content.mimeType as string,
                fileUri: content.fileUri as string
            }
        }
    }
    throw new Error('Invalid media content')
}

function inferToolNameFromPreviousMessages(message: any, previousMessages: BaseMessage[]): string | undefined {
    return previousMessages
        .map((msg) => {
            if (AIMessage.isInstance(msg)) {
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
        return { executableCode: (content as any).executableCode }
    } else if (content.type === 'codeExecutionResult') {
        return { codeExecutionResult: (content as any).codeExecutionResult }
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
                name: (content as any).name,
                args: (content as any).input
            }
        }
    } else if (content.type === 'tool_call') {
        return {
            functionCall: {
                name: (content as any).name,
                args: (content as any).args
            }
        }
    } else if (
        content.type?.includes('/') &&
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
        return undefined
    } else {
        if ('type' in content) {
            throw new Error(`Unknown content type ${content.type}`)
        } else {
            throw new Error(`Unknown content ${JSON.stringify(content)}`)
        }
    }
}

export function convertMessageContentToParts(
    message: BaseMessage,
    isMultimodalModel: boolean,
    previousMessages: BaseMessage[],
    model?: string
): Part[] {
    if (ToolMessage.isInstance(message)) {
        const messageName = message.name ?? inferToolNameFromPreviousMessages(message, previousMessages)
        if (messageName === undefined) {
            throw new Error(
                `Google requires a tool name for each tool call response, and we could not infer a called tool name for ToolMessage "${message.id}" from your passed messages. Please populate a "name" field on that ToolMessage explicitly.`
            )
        }

        const result = Array.isArray(message.content)
            ? (message.content
                  .map((c) => _convertLangChainContentToPart(c as MessageContentComplex, isMultimodalModel))
                  .filter((p) => p !== undefined) as Part[])
            : message.content

        if (message.status === 'error') {
            return [
                {
                    functionResponse: {
                        name: messageName,
                        response: { error: { details: result } }
                    }
                }
            ]
        }

        return [
            {
                functionResponse: {
                    name: messageName,
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
            ...(message.content
                .map((c) => _convertLangChainContentToPart(c as MessageContentComplex, isMultimodalModel))
                .filter((p) => p !== undefined) as Part[])
        )
    }

    const functionThoughtSignatures = message.additional_kwargs?.[_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY] as
        | Record<string, string>
        | undefined

    if (AIMessage.isInstance(message) && message.tool_calls?.length) {
        functionCalls = message.tool_calls.map((tc) => {
            const thoughtSignature = (() => {
                if (tc.id) {
                    const signature = functionThoughtSignatures?.[tc.id]
                    if (signature) {
                        return signature
                    }
                }
                if (model?.includes('gemini-3')) {
                    return DUMMY_SIGNATURE
                }
                return ''
            })()
            return {
                functionCall: {
                    name: tc.name,
                    args: tc.args
                },
                ...(thoughtSignature ? { thoughtSignature } : {})
            } as FunctionCallPart
        })
    }

    return [...messageParts, ...functionCalls]
}

export function convertBaseMessagesToContent(
    messages: BaseMessage[],
    isMultimodalModel: boolean,
    convertSystemMessageToHumanContent: boolean = false,
    model?: string
) {
    return messages.reduce<{
        content: Content[]
        mergeWithPreviousContent: boolean
    }>(
        (acc, message, index) => {
            if (!BaseMessage.isInstance(message)) {
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

            const parts = convertMessageContentToParts(message, isMultimodalModel, messages.slice(0, index), model)

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

// ============================================================================
// Usage Metadata Conversion
// ============================================================================

export function convertUsageMetadata(usageMetadata: GenerateContentResponse['usageMetadata'], model: string): UsageMetadata {
    const output: UsageMetadata = {
        input_tokens: usageMetadata?.promptTokenCount ?? 0,
        output_tokens: usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: usageMetadata?.totalTokenCount ?? 0
    }
    if (usageMetadata?.cachedContentTokenCount) {
        output.input_token_details ??= {}
        output.input_token_details.cache_read = usageMetadata.cachedContentTokenCount
    }
    // gemini-3-pro-preview has bracket based tracking of tokens per request
    if (model === 'gemini-3-pro-preview') {
        const over200k = Math.max(0, (usageMetadata?.promptTokenCount ?? 0) - 200000)
        const cachedOver200k = Math.max(0, (usageMetadata?.cachedContentTokenCount ?? 0) - 200000)
        if (over200k) {
            output.input_token_details = {
                ...output.input_token_details,
                over_200k: over200k
            } as InputTokenDetails
        }
        if (cachedOver200k) {
            output.input_token_details = {
                ...output.input_token_details,
                cache_read_over_200k: cachedOver200k
            } as InputTokenDetails
        }
    }
    return output
}

// ============================================================================
// Response Mapping Functions (with inlineData extraction)
// ============================================================================

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

    const [candidate] = response.candidates
    const { content: candidateContent, ...generationInfo } = candidate

    // Extract function calls with IDs
    const functionCalls = candidateContent.parts?.reduce((acc, p) => {
        if ('functionCall' in p && p.functionCall) {
            acc.push({
                ...p,
                id: 'id' in p.functionCall && typeof (p.functionCall as any).id === 'string' ? (p.functionCall as any).id : uuidv4()
            })
        }
        return acc
    }, [] as (FunctionCallPart & { id: string })[])

    let content: MessageContent | undefined
    const inlineDataItems: any[] = []

    const parts = candidateContent?.parts as GoogleGenerativeAIPart[] | undefined

    if (Array.isArray(parts) && parts.length === 1 && 'text' in parts[0] && parts[0].text && !parts[0].thought) {
        content = parts[0].text
    } else if (Array.isArray(parts) && parts.length > 0) {
        content = parts.map((p) => {
            if (p.thought && 'text' in p && p.text) {
                return {
                    type: 'thinking' as const,
                    thinking: p.text,
                    ...(p.thoughtSignature ? { signature: p.thoughtSignature } : {})
                }
            } else if ('text' in p) {
                return {
                    type: 'text' as const,
                    text: p.text
                }
            } else if ('inlineData' in p && p.inlineData) {
                // Extract inline data (e.g., generated images) for processing
                inlineDataItems.push({
                    type: 'gemini_inline_data',
                    mimeType: p.inlineData.mimeType,
                    data: p.inlineData.data
                })
                return {
                    type: 'inlineData' as const,
                    inlineData: p.inlineData
                }
            } else if ('functionCall' in p) {
                return {
                    type: 'functionCall' as const,
                    functionCall: p.functionCall
                }
            } else if ('functionResponse' in p) {
                return {
                    type: 'functionResponse' as const,
                    functionResponse: p.functionResponse
                }
            } else if ('fileData' in p) {
                return {
                    type: 'fileData' as const,
                    fileData: p.fileData
                }
            } else if ('executableCode' in p) {
                return {
                    type: 'executableCode' as const,
                    executableCode: p.executableCode
                }
            } else if ('codeExecutionResult' in p) {
                return {
                    type: 'codeExecutionResult' as const,
                    codeExecutionResult: p.codeExecutionResult
                }
            }
            return p as any
        })
    } else {
        content = []
    }

    // Extract thought signatures from function calls
    const functionThoughtSignatures = functionCalls?.reduce((acc, fc) => {
        if ('thoughtSignature' in fc && typeof (fc as any).thoughtSignature === 'string') {
            acc[fc.id] = (fc as any).thoughtSignature
        }
        return acc
    }, {} as Record<string, string>)

    let text = ''
    if (typeof content === 'string') {
        text = content
    } else if (Array.isArray(content) && content.length > 0) {
        const block = content.find((b) => 'text' in b) as { text: string } | undefined
        text = block?.text ?? text
    }

    // Build response_metadata with inline data if present
    const response_metadata: Record<string, any> = {}
    if (inlineDataItems.length > 0) {
        response_metadata.inlineData = inlineDataItems
    }

    const generation: ChatGeneration = {
        text,
        message: new AIMessage({
            content: content ?? '',
            tool_calls: functionCalls?.map((fc) => ({
                type: 'tool_call' as const,
                id: fc.id,
                name: fc.functionCall.name,
                args: fc.functionCall.args as Record<string, unknown>
            })),
            additional_kwargs: {
                ...generationInfo,
                [_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY]: functionThoughtSignatures
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

    const [candidate] = response.candidates
    const { content: candidateContent, ...generationInfo } = candidate

    // Extract function calls with IDs
    const functionCalls = candidateContent.parts?.reduce((acc, p) => {
        if ('functionCall' in p && p.functionCall) {
            acc.push({
                ...p,
                id: 'id' in p.functionCall && typeof (p.functionCall as any).id === 'string' ? (p.functionCall as any).id : uuidv4()
            })
        }
        return acc
    }, [] as (FunctionCallPart & { id: string })[])

    let content: MessageContent | undefined
    const inlineDataItems: any[] = []
    const streamParts = candidateContent?.parts as GoogleGenerativeAIPart[] | undefined

    // Checks if all parts are plain text (no thought flags). If so, join as string.
    if (Array.isArray(streamParts) && streamParts.every((p) => 'text' in p && !p.thought)) {
        content = streamParts.map((p) => (p as TextPart).text).join('')
    } else if (Array.isArray(streamParts)) {
        content = streamParts.map((p) => {
            if (p.thought && 'text' in p && p.text) {
                return {
                    type: 'thinking' as const,
                    thinking: p.text,
                    ...(p.thoughtSignature ? { signature: p.thoughtSignature } : {})
                }
            } else if ('text' in p) {
                return {
                    type: 'text' as const,
                    text: p.text
                }
            } else if ('inlineData' in p && p.inlineData) {
                // Extract inline data for streaming responses
                inlineDataItems.push({
                    type: 'gemini_inline_data',
                    mimeType: p.inlineData.mimeType,
                    data: p.inlineData.data
                })
                return {
                    type: 'inlineData' as const,
                    inlineData: p.inlineData
                }
            } else if ('functionCall' in p) {
                return {
                    type: 'functionCall' as const,
                    functionCall: p.functionCall
                }
            } else if ('functionResponse' in p) {
                return {
                    type: 'functionResponse' as const,
                    functionResponse: p.functionResponse
                }
            } else if ('fileData' in p) {
                return {
                    type: 'fileData' as const,
                    fileData: p.fileData
                }
            } else if ('executableCode' in p) {
                return {
                    type: 'executableCode' as const,
                    executableCode: p.executableCode
                }
            } else if ('codeExecutionResult' in p) {
                return {
                    type: 'codeExecutionResult' as const,
                    codeExecutionResult: p.codeExecutionResult
                }
            }
            return p as any
        })
    } else {
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
                type: 'tool_call_chunk' as const,
                id: fc.id,
                name: fc.functionCall.name,
                args: JSON.stringify(fc.functionCall.args)
            }))
        )
    }

    // Extract thought signatures from function calls
    const functionThoughtSignatures = functionCalls?.reduce((acc, fc) => {
        if ('thoughtSignature' in fc && typeof (fc as any).thoughtSignature === 'string') {
            acc[fc.id] = (fc as any).thoughtSignature
        }
        return acc
    }, {} as Record<string, string>)

    // Build response_metadata with inline data if present
    const response_metadata: Record<string, any> = {
        model_provider: 'google-genai'
    }
    if (inlineDataItems.length > 0) {
        response_metadata.inlineData = inlineDataItems
    }

    return new ChatGenerationChunk({
        text,
        message: new AIMessageChunk({
            content: content || '',
            name: !candidateContent ? undefined : candidateContent.role,
            tool_call_chunks: toolCallChunks,
            additional_kwargs: {
                [_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY]: functionThoughtSignatures
            },
            response_metadata,
            usage_metadata: extra.usageMetadata
        }),
        generationInfo
    })
}

// ============================================================================
// Extended ChatGoogleGenerativeAI Class
// ============================================================================

export class ChatGoogleGenerativeAI extends LangchainChatGoogleGenerativeAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields: GoogleGenerativeAIChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
        this.configuredMaxToken = fields?.maxOutputTokens
    }

    /**
     * Override _generate to use custom response mapper that extracts inlineData
     */
    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        options.signal?.throwIfAborted()

        const prompt = convertBaseMessagesToContent(
            messages,
            (this as any)._isMultimodalModel,
            (this as any).useSystemInstruction,
            this.model
        )

        // Handle system instruction
        let actualPrompt = prompt
        if (prompt[0]?.role === 'system') {
            const [systemInstruction] = prompt
            ;(this as any).client.systemInstruction = systemInstruction
            actualPrompt = prompt.slice(1)
        }

        // Get tools and other params
        const parameters = this.invocationParams(options)

        // Check if streaming is enabled
        if (this.streaming) {
            const tokenUsage: { completionTokens?: number; promptTokens?: number; totalTokens?: number } = {}
            const stream = this._streamResponseChunks(messages, options, runManager)
            const finalChunks: ChatGenerationChunk[] = []

            for await (const chunk of stream) {
                const index = (chunk.generationInfo as any)?.completion ?? 0
                if (finalChunks[index] === undefined) {
                    finalChunks[index] = chunk
                } else {
                    finalChunks[index] = finalChunks[index].concat(chunk)
                }
            }
            const generations = finalChunks.filter((c): c is ChatGenerationChunk => c !== undefined)

            return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } }
        }

        // Non-streaming: make the API call directly
        const res = await (this as any).completionWithRetry({
            ...parameters,
            contents: actualPrompt
        })

        let usageMetadata: UsageMetadata | undefined
        if ('usageMetadata' in res.response) {
            usageMetadata = convertUsageMetadata(res.response.usageMetadata, this.model)
        }

        const generationResult = mapGenerateContentResultToChatResult(res.response, {
            usageMetadata
        })
        // may not have generations in output if there was a refusal for safety reasons, malformed function call, etc.
        if (generationResult.generations?.length > 0) {
            await runManager?.handleLLMNewToken(generationResult.generations[0]?.text ?? '')
        }
        return generationResult
    }

    /**
     * Override streaming method to use custom chunk converter that extracts inlineData
     */
    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const prompt = convertBaseMessagesToContent(
            messages,
            (this as any)._isMultimodalModel,
            (this as any).useSystemInstruction,
            this.model
        )

        let actualPrompt = prompt
        if (prompt[0]?.role === 'system') {
            const [systemInstruction] = prompt
            ;(this as any).client.systemInstruction = systemInstruction
            actualPrompt = prompt.slice(1)
        }

        const parameters = this.invocationParams(options)
        const request = {
            ...parameters,
            contents: actualPrompt
        }

        const stream = await (this as any).caller.callWithOptions({ signal: options?.signal }, async () => {
            const { stream } = await (this as any).client.generateContentStream(request, {
                signal: options?.signal
            })
            return stream
        })

        let usageMetadata: UsageMetadata | undefined
        // Keep prior cumulative counts for calculating token deltas while streaming
        let prevPromptTokenCount = 0
        let prevCandidatesTokenCount = 0
        let prevTotalTokenCount = 0
        let index = 0

        for await (const response of stream) {
            if (options.signal?.aborted) {
                return
            }
            if (
                'usageMetadata' in response &&
                response.usageMetadata !== undefined &&
                (this as any).streamUsage !== false &&
                options.streamUsage !== false
            ) {
                usageMetadata = convertUsageMetadata(response.usageMetadata, this.model)

                // Under the hood, LangChain combines the prompt tokens. Google returns the updated
                // total each time, so we need to find the difference between the tokens.
                const newPromptTokenCount = response.usageMetadata.promptTokenCount ?? 0
                usageMetadata.input_tokens = Math.max(0, newPromptTokenCount - prevPromptTokenCount)
                prevPromptTokenCount = newPromptTokenCount

                const newCandidatesTokenCount = response.usageMetadata.candidatesTokenCount ?? 0
                usageMetadata.output_tokens = Math.max(0, newCandidatesTokenCount - prevCandidatesTokenCount)
                prevCandidatesTokenCount = newCandidatesTokenCount

                const newTotalTokenCount = response.usageMetadata.totalTokenCount ?? 0
                usageMetadata.total_tokens = Math.max(0, newTotalTokenCount - prevTotalTokenCount)
                prevTotalTokenCount = newTotalTokenCount
            }

            const chunk = convertResponseContentToChatGenerationChunk(response, {
                usageMetadata,
                index
            })
            index += 1
            if (!chunk) {
                continue
            }

            yield chunk
            await runManager?.handleLLMNewToken(chunk.text ?? '')
        }
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }
}
