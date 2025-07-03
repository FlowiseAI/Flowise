import { BaseMessage, AIMessage, AIMessageChunk, isBaseMessage, ChatMessage, MessageContentComplex } from '@langchain/core/messages'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { BaseChatModel, type BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { ChatGeneration, ChatGenerationChunk, ChatResult } from '@langchain/core/outputs'
import { ToolCallChunk } from '@langchain/core/messages/tool'
import { NewTokenIndices } from '@langchain/core/callbacks/base'
import {
    EnhancedGenerateContentResponse,
    Content,
    Part,
    Tool,
    GenerativeModel,
    GoogleGenerativeAI as GenerativeAI
} from '@google/generative-ai'
import type {
    FunctionCallPart,
    FunctionResponsePart,
    SafetySetting,
    UsageMetadata,
    FunctionDeclarationsTool as GoogleGenerativeAIFunctionDeclarationsTool,
    GenerateContentRequest
} from '@google/generative-ai'
import { ICommonObject, IMultiModalOption, IVisionChatModal } from '../../../src'
import { StructuredToolInterface } from '@langchain/core/tools'
import { isStructuredTool } from '@langchain/core/utils/function_calling'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base'
import type FlowiseGoogleAICacheManager from '../../cache/GoogleGenerativeAIContextCache/FlowiseGoogleAICacheManager'

const DEFAULT_IMAGE_MAX_TOKEN = 8192
const DEFAULT_IMAGE_MODEL = 'gemini-1.5-flash-latest'

interface TokenUsage {
    completionTokens?: number
    promptTokens?: number
    totalTokens?: number
}

interface GoogleGenerativeAIChatCallOptions extends BaseLanguageModelCallOptions {
    tools?: StructuredToolInterface[] | GoogleGenerativeAIFunctionDeclarationsTool[]
    /**
     * Whether or not to include usage data, like token counts
     * in the streamed response chunks.
     * @default true
     */
    streamUsage?: boolean
}

export interface GoogleGenerativeAIChatInput extends BaseChatModelParams, Pick<GoogleGenerativeAIChatCallOptions, 'streamUsage'> {
    modelName?: string
    model?: string
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    topK?: number
    stopSequences?: string[]
    safetySettings?: SafetySetting[]
    apiKey?: string
    apiVersion?: string
    baseUrl?: string
    streaming?: boolean
}

class LangchainChatGoogleGenerativeAI
    extends BaseChatModel<GoogleGenerativeAIChatCallOptions, AIMessageChunk>
    implements GoogleGenerativeAIChatInput
{
    modelName = 'gemini-pro'

    temperature?: number

    maxOutputTokens?: number

    topP?: number

    topK?: number

    stopSequences: string[] = []

    safetySettings?: SafetySetting[]

    apiKey?: string

    baseUrl?: string

    streaming = false

    streamUsage = true

    private client: GenerativeModel

    private contextCache?: FlowiseGoogleAICacheManager

    get _isMultimodalModel() {
        return this.modelName.includes('vision') || this.modelName.startsWith('gemini-1.5') || this.modelName.startsWith('gemini-2.5')
    }

    constructor(fields?: GoogleGenerativeAIChatInput) {
        super(fields ?? {})

        this.modelName = fields?.model?.replace(/^models\//, '') ?? fields?.modelName?.replace(/^models\//, '') ?? 'gemini-pro'

        this.maxOutputTokens = fields?.maxOutputTokens ?? this.maxOutputTokens

        if (this.maxOutputTokens && this.maxOutputTokens < 0) {
            throw new Error('`maxOutputTokens` must be a positive integer')
        }

        this.temperature = fields?.temperature ?? this.temperature
        if (this.temperature && (this.temperature < 0 || this.temperature > 1)) {
            throw new Error('`temperature` must be in the range of [0.0,1.0]')
        }

        this.topP = fields?.topP ?? this.topP
        if (this.topP && this.topP < 0) {
            throw new Error('`topP` must be a positive integer')
        }

        if (this.topP && this.topP > 1) {
            throw new Error('`topP` must be below 1.')
        }

        this.topK = fields?.topK ?? this.topK
        if (this.topK && this.topK < 0) {
            throw new Error('`topK` must be a positive integer')
        }

        this.stopSequences = fields?.stopSequences ?? this.stopSequences

        this.apiKey = fields?.apiKey ?? process.env['GOOGLE_API_KEY']
        if (!this.apiKey) {
            throw new Error(
                'Please set an API key for Google GenerativeAI ' +
                    'in the environment variable GOOGLE_API_KEY ' +
                    'or in the `apiKey` field of the ' +
                    'ChatGoogleGenerativeAI constructor'
            )
        }

        this.safetySettings = fields?.safetySettings ?? this.safetySettings
        if (this.safetySettings && this.safetySettings.length > 0) {
            const safetySettingsSet = new Set(this.safetySettings.map((s) => s.category))
            if (safetySettingsSet.size !== this.safetySettings.length) {
                throw new Error('The categories in `safetySettings` array must be unique')
            }
        }

        this.streaming = fields?.streaming ?? this.streaming

        this.streamUsage = fields?.streamUsage ?? this.streamUsage

        this.getClient()
    }

    async getClient(prompt?: Content[], tools?: Tool[]) {
        this.client = new GenerativeAI(this.apiKey ?? '').getGenerativeModel(
            {
                model: this.modelName,
                tools,
                safetySettings: this.safetySettings as SafetySetting[],
                generationConfig: {
                    candidateCount: 1,
                    stopSequences: this.stopSequences,
                    maxOutputTokens: this.maxOutputTokens,
                    temperature: this.temperature,
                    topP: this.topP,
                    topK: this.topK
                }
            },
            {
                baseUrl: this.baseUrl
            }
        )
        if (this.contextCache) {
            const cachedContent = await this.contextCache.lookup({
                contents: prompt ? [{ ...prompt[0], parts: prompt[0].parts.slice(0, 1) }] : [],
                model: this.modelName,
                tools
            })
            this.client.cachedContent = cachedContent as any
        }
    }

    _combineLLMOutput() {
        return []
    }

    _llmType() {
        return 'googlegenerativeai'
    }

    override bindTools(tools: (StructuredToolInterface | Record<string, unknown>)[], kwargs?: Partial<ICommonObject>) {
        //@ts-ignore
        return this.bind({ tools: convertToGeminiTools(tools), ...kwargs })
    }

    invocationParams(options?: this['ParsedCallOptions']): Omit<GenerateContentRequest, 'contents'> {
        const tools = options?.tools as GoogleGenerativeAIFunctionDeclarationsTool[] | StructuredToolInterface[] | undefined
        if (Array.isArray(tools) && !tools.some((t: any) => !('lc_namespace' in t))) {
            return {
                tools: convertToGeminiTools(options?.tools as StructuredToolInterface[]) as any
            }
        }
        return {
            tools: options?.tools as GoogleGenerativeAIFunctionDeclarationsTool[] | undefined
        }
    }

    convertFunctionResponse(prompts: Content[]) {
        for (let i = 0; i < prompts.length; i += 1) {
            if (prompts[i].role === 'function') {
                if (prompts[i - 1].role === 'model') {
                    const toolName = prompts[i - 1].parts[0].functionCall?.name ?? ''
                    prompts[i].parts = [
                        {
                            functionResponse: {
                                name: toolName,
                                response: {
                                    name: toolName,
                                    content: prompts[i].parts[0].text
                                }
                            }
                        }
                    ]
                }
            }
        }
    }

    setContextCache(contextCache: FlowiseGoogleAICacheManager): void {
        this.contextCache = contextCache
    }

    async getNumTokens(prompt: BaseMessage[]) {
        const contents = convertBaseMessagesToContent(prompt, this._isMultimodalModel)
        const { totalTokens } = await this.client.countTokens({ contents })
        return totalTokens
    }

    /**
     * Handles non-streaming (single-shot) generation from the Google Generative AI API.
     * Prepares the prompt, manages tools, and returns a ChatResult with generations and usage metadata.
     *
     * @param prompt - The prompt in Google API Content[] format.
     * @param options - Parsed call options, including tools and signal.
     * @param _runManager - Optional callback manager for handling new tokens.
     * @returns Promise resolving to a ChatResult object.
     */
    async _generateNonStreaming(
        prompt: Content[],
        options: this['ParsedCallOptions'],
        _runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        //@ts-ignore
        const tools = options.tools ?? []

        // Convert any function response parts in the prompt for compatibility
        this.convertFunctionResponse(prompt)

        // Re-initialize client if tools are provided
        if (tools.length > 0) {
            await this.getClient(prompt, tools as Tool[])
        } else {
            await this.getClient(prompt)
        }
        // Call the API and handle errors
        const res = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
            let output
            try {
                // Make the actual API call to generate content
                output = await this.client.generateContent({
                    contents: prompt
                })
            } catch (e: any) {
                // If a 400 Bad Request error occurs, annotate the error object
                if (e.message?.includes('400 Bad Request')) {
                    e.status = 400
                }
                throw e
            }
            return output
        })

        // Extract usage metadata from the response for reporting token usage
        let genAIUsageMetadata = {
            usageMetadata: res.response.usageMetadata as {
                promptTokenCount: number
                candidatesTokenCount: number
                totalTokenCount: number
            }
        }

        // Map the API response to a ChatResult object for LangChain
        const generationResult = mapGenerateContentResultToChatResult(res.response, this.modelName, genAIUsageMetadata)

        // Optionally notify the run manager of the new token (for streaming UI updates)
        await _runManager?.handleLLMNewToken(generationResult.generations?.length ? generationResult.generations[0].text : '')
        return generationResult
    }

    /**
     * Main generation method for the chat model. Handles both streaming and non-streaming cases.
     * Converts messages to prompt format, manages streaming, and aggregates results.
     *
     * @param messages - The array of BaseMessage objects representing the conversation so far.
     * @param options - Parsed call options, including tools and streaming usage flags.
     * @param runManager - Optional callback manager for handling new tokens.
     * @returns Promise resolving to a ChatResult object.
     */
    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        // Convert input messages to Google API content format
        let prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel)
        prompt = checkIfEmptyContentAndSameRole(prompt)

        // Handle streaming mode
        if (this.streaming) {
            const tokenUsage: TokenUsage = {}
            // Start streaming response chunks from the API
            const stream = this._streamResponseChunks(messages, options, runManager)
            // Store the final chunks by their index (for multi-candidate support)
            const finalChunks: Record<number, ChatGenerationChunk> = {}

            // Aggregate all streamed chunks by their index
            for await (const chunk of stream) {
                // Get the candidate index for this chunk
                const index = (chunk.generationInfo as NewTokenIndices)?.completion ?? 0

                // Attach model name to generation info if missing
                if (chunk.generationInfo) {
                    if (!chunk.generationInfo.model_name && this.modelName) {
                        chunk.generationInfo.model_name = this.modelName
                    }
                }

                if (finalChunks[index] === undefined) {
                    // First chunk for this index
                    finalChunks[index] = chunk
                } else {
                    // Concatenate the chunks for the same index
                    const existingChunk = finalChunks[index]
                    const concatenated = existingChunk.concat(chunk)
                    // Use the latest chunk's usage_metadata (which has the correct diff details)
                    // @ts-ignore - Custom metadata structure
                    concatenated.message.usage_metadata = chunk.message.usage_metadata
                    finalChunks[index] = concatenated
                }

                // Aggregate token usage for all chunks
                // @ts-ignore - Custom metadata structure
                if (chunk.message.usage_metadata) {
                    // @ts-ignore - Custom metadata structure
                    const usage = chunk.message.usage_metadata as UsageMetadata

                    for (const key of ['input_tokens', 'output_tokens', 'total_tokens'] as const) {
                        // @ts-ignore - Custom metadata structure
                        tokenUsage[key] = (tokenUsage[key] ?? 0) + (usage[key] ?? 0)
                    }

                    for (const detailKey of ['input_token_details', 'output_token_details'] as const) {
                        // @ts-ignore - Custom metadata structure
                        tokenUsage[detailKey] ??= {}
                        // @ts-ignore - Custom metadata structure
                        const detail = usage[detailKey] ?? {}
                        for (const modality in detail) {
                            // @ts-ignore - Custom metadata structure
                            tokenUsage[detailKey][modality] = (tokenUsage[detailKey][modality] ?? 0) + detail[modality]
                        }
                    }
                }
            }

            // Sort and collect all generations in order by index
            const generations = Object.entries(finalChunks)
                .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
                .map(([_, value]) => value)

            // Attach aggregated token usage to each generation
            for (const generation of generations) {
                // @ts-ignore - Custom metadata structure
                generation.message.usage_metadata = tokenUsage
            }

            // Return all generations and estimated token usage
            return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } }
        }

        // Fallback to non-streaming mode
        return this._generateNonStreaming(prompt, options, runManager)
    }

    /**
     * Streams response chunks from the Google Generative AI API as they arrive.
     * Handles token usage calculation and yields ChatGenerationChunk objects for each chunk.
     *
     * @param messages - The array of BaseMessage objects representing the conversation so far.
     * @param options - Parsed call options, including tools and streaming usage flags.
     * @param runManager - Optional callback manager for handling new tokens.
     * @returns AsyncGenerator yielding ChatGenerationChunk objects as they are received from the API.
     */
    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        // Convert input messages to Google API content format
        let prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel)
        prompt = checkIfEmptyContentAndSameRole(prompt)

        // Prepare API request parameters
        const parameters = this.invocationParams(options)
        const request = {
            ...parameters,
            contents: prompt
        }

        // Re-initialize client if tools are provided
        const tools = options.tools ?? []
        if (tools.length > 0) {
            await this.getClient(prompt, tools as Tool[])
        } else {
            await this.getClient(prompt)
        }

        // Start streaming from the API
        const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
            const { stream } = await this.client.generateContentStream(request)
            return stream
        })

        let index = 0 // Tracks the chunk index for multi-candidate support
        let prevInputTokenDetails: Record<string, number> = {} // For diffing input tokens
        let prevOutputTokenDetails: Record<string, number> = {} // For diffing output tokens

        // Iterate over each streamed response chunk
        for await (const response of stream) {
            let usageMetadata: UsageMetadata | undefined

            // If usage metadata is available and streaming usage is enabled, calculate token diffs
            if ('usageMetadata' in response && this.streamUsage !== false && options.streamUsage !== false) {
                const meta = response.usageMetadata as {
                    promptTokenCount?: number
                    candidatesTokenCount?: number
                    thoughtsTokenCount?: number
                    totalTokenCount?: number
                    promptTokensDetails?: { modality: string; tokenCount: number }[]
                    candidatesTokensDetails?: { modality: string; tokenCount: number }[]
                }

                // Extract current input token details by modality
                const currentInputTokenDetails = Array.isArray(meta.promptTokensDetails)
                    ? meta.promptTokensDetails.reduce((acc: Record<string, number>, { modality, tokenCount }) => {
                          if (modality && typeof tokenCount === 'number') {
                              acc[modality.toLowerCase()] = tokenCount // e.g., text, image
                          }
                          return acc
                      }, {})
                    : {}

                // Extract current output token details by modality
                const currentOutputTokenDetails = Array.isArray(meta.candidatesTokensDetails)
                    ? meta.candidatesTokensDetails.reduce((acc: Record<string, number>, { modality, tokenCount }) => {
                          if (modality && typeof tokenCount === 'number') {
                              acc[modality.toLowerCase()] = tokenCount
                          }
                          return acc
                      }, {})
                    : {
                          text: meta.candidatesTokenCount ?? 0,
                          reasoning: meta.thoughtsTokenCount ?? 0
                      }

                // Calculate the difference in input tokens since the last chunk
                const diffInputTokenDetails: Record<string, number> = {}
                for (const modality in currentInputTokenDetails) {
                    const prev = prevInputTokenDetails[modality] ?? 0
                    const curr = currentInputTokenDetails[modality]
                    const diff = curr - prev
                    if (diff > 0) {
                        diffInputTokenDetails[modality] = diff // Only count new tokens
                    }
                }

                // Calculate the difference in output tokens since the last chunk
                const diffOutputTokenDetails: Record<string, number> = {}
                for (const modality in currentOutputTokenDetails) {
                    const prev = prevOutputTokenDetails[modality] ?? 0
                    const curr = currentOutputTokenDetails[modality]
                    const diff = curr - prev
                    if (diff > 0) {
                        diffOutputTokenDetails[modality] = diff
                    }
                }

                // Update previous values for next iteration
                prevInputTokenDetails = currentInputTokenDetails
                prevOutputTokenDetails = currentOutputTokenDetails

                // Compose a standard usageMetadata object for this chunk
                usageMetadata = {
                    // @ts-ignore
                    input_tokens: Object.values(diffInputTokenDetails).reduce((sum, val) => sum + val, 0),
                    output_tokens: Object.values(diffOutputTokenDetails).reduce((sum, val) => sum + val, 0),
                    total_tokens:
                        Object.values(diffInputTokenDetails).reduce((sum, val) => sum + val, 0) +
                        Object.values(diffOutputTokenDetails).reduce((sum, val) => sum + val, 0),
                    input_token_details: diffInputTokenDetails,
                    output_token_details: diffOutputTokenDetails
                }
            }

            // Convert the API response chunk to a ChatGenerationChunk
            const chunk = convertResponseContentToChatGenerationChunk(response, {
                usageMetadata,
                index
            })
            index += 1 // Increment chunk index for next chunk
            if (!chunk) continue // Skip if chunk is null

            // Yield the chunk to the consumer
            yield chunk
            // Optionally notify the run manager of the new token (for streaming UI updates)
            await runManager?.handleLLMNewToken(chunk.text ?? '')
        }
    }
}

export class ChatGoogleGenerativeAI extends LangchainChatGoogleGenerativeAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: GoogleGenerativeAIChatInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxOutputTokens
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (this.modelName === 'gemini-1.0-pro-latest') {
            this.modelName = DEFAULT_IMAGE_MODEL
            this.maxOutputTokens = this.configuredMaxToken ? this.configuredMaxToken : DEFAULT_IMAGE_MAX_TOKEN
        }
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

    throw new Error('Invalid media content')
}

function getMessageAuthor(message: BaseMessage) {
    const type = message._getType()
    if (ChatMessage.isInstance(message)) {
        return message.role
    }
    return message.name ?? type
}

function convertAuthorToRole(author: string) {
    switch (author.toLowerCase()) {
        case 'ai':
        case 'assistant':
        case 'model':
            return 'model'
        case 'function':
        case 'tool':
            return 'function'
        case 'system':
        case 'human':
        default:
            return 'user'
    }
}

function convertMessageContentToParts(message: BaseMessage, isMultimodalModel: boolean): Part[] {
    if (typeof message.content === 'string' && message.content !== '') {
        return [{ text: message.content }]
    }

    let functionCalls: FunctionCallPart[] = []
    let functionResponses: FunctionResponsePart[] = []
    let messageParts: Part[] = []

    if ('tool_calls' in message && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        functionCalls = message.tool_calls.map((tc) => ({
            functionCall: {
                name: tc.name,
                args: tc.args
            }
        }))
    } else if (message._getType() === 'tool' && message.name && message.content) {
        functionResponses = [
            {
                functionResponse: {
                    name: message.name,
                    response: message.content
                }
            }
        ]
    } else if (Array.isArray(message.content)) {
        messageParts = message.content.map((c) => {
            if (c.type === 'text') {
                return {
                    text: c.text
                }
            }

            if (c.type === 'image_url') {
                if (!isMultimodalModel) {
                    throw new Error(`This model does not support images`)
                }
                let source
                if (typeof c.image_url === 'string') {
                    source = c.image_url
                } else if (typeof c.image_url === 'object' && 'url' in c.image_url) {
                    source = c.image_url.url
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
            } else if (c.type === 'media') {
                return messageContentMedia(c)
            } else if (c.type === 'tool_use') {
                return {
                    functionCall: {
                        name: c.name,
                        args: c.input
                    }
                }
            }
            throw new Error(`Unknown content type ${(c as { type: string }).type}`)
        })
    }

    return [...messageParts, ...functionCalls, ...functionResponses]
}

/*
 * This is a dedicated logic for Multi Agent Supervisor to handle the case where the content is empty, and the role is the same
 */

function checkIfEmptyContentAndSameRole(contents: Content[]) {
    let prevRole = ''
    const validContents: Content[] = []

    for (const content of contents) {
        // Skip only if completely empty
        if (!content.parts || !content.parts.length) {
            continue
        }

        // Ensure role is always either 'user' or 'model'
        content.role = content.role === 'model' ? 'model' : 'user'

        // Handle consecutive messages
        if (content.role === prevRole && validContents.length > 0) {
            // Merge with previous content if same role
            validContents[validContents.length - 1].parts.push(...content.parts)
            continue
        }

        validContents.push(content)
        prevRole = content.role
    }

    return validContents
}

function convertBaseMessagesToContent(messages: BaseMessage[], isMultimodalModel: boolean) {
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

            const parts = convertMessageContentToParts(message, isMultimodalModel)

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
            if (actualRole === 'function' || actualRole === 'tool') {
                // GenerativeAI API will throw an error if the role is not "user" or "model."
                actualRole = 'user'
            }
            const content: Content = {
                role: actualRole,
                parts
            }
            return {
                mergeWithPreviousContent: author === 'system',
                content: [...acc.content, content]
            }
        },
        { content: [], mergeWithPreviousContent: false }
    ).content
}

/**
 * Maps the Google Generative AI API response to a ChatResult object for LangChain.
 * Handles function calls, usage metadata, and error/rejection cases.
 *
 * @param response - The EnhancedGenerateContentResponse from the API.
 * @param model_name - The name of the model used for generation.
 * @param extra - Optional extra data, such as usage metadata.
 * @returns ChatResult object with generations and optional LLM output details.
 */
function mapGenerateContentResultToChatResult(
    response: EnhancedGenerateContentResponse,
    model_name?: string,
    extra?: {
        usageMetadata: UsageMetadata | undefined
    }
): ChatResult {
    // if rejected or error, return empty generations with reason in filters
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0]) {
        return {
            generations: [],
            llmOutput: {
                filters: response.promptFeedback // Provide feedback for why generation failed
            }
        }
    }

    // Extract function calls if present (for tool/function calling)
    const functionCalls = response.functionCalls()
    // Use the first candidate (Google API may return multiple candidates)
    const [candidate] = response.candidates

    // Extract content and generation info from the candidate
    const { content, ...generationInfo } = candidate
    // Get the generated text (if any)
    const text = content?.parts[0]?.text ?? ''

    // Extract usage metadata if available (for reporting token usage)
    const usageMetadata: any = extra?.usageMetadata

    // Build the ChatGeneration object for LangChain
    const generation: ChatGeneration = {
        text,
        message: new AIMessage({
            content: text,
            tool_calls: functionCalls,
            additional_kwargs: {
                model_name,
                ...generationInfo
            },
            usage_metadata: {
                input_tokens: usageMetadata?.promptTokenCount ?? 0, // Number of prompt tokens used
                output_tokens: usageMetadata?.candidatesTokenCount ?? 0 + usageMetadata?.thoughtsTokenCount ?? 0, // Output tokens
                total_tokens: usageMetadata?.totalTokenCount ?? 0, // Total tokens used
                input_token_details: Array.isArray(usageMetadata?.promptTokensDetails)
                    ? usageMetadata?.promptTokensDetails.reduce((acc: any, curr: any) => {
                          if (curr.modality && typeof curr.tokenCount === 'number') {
                              acc[curr.modality.toLowerCase()] = curr.tokenCount // e.g., text, image
                          }
                          return acc
                      }, {})
                    : {},

                output_token_details: {
                    text: usageMetadata?.candidatesTokenCount ?? 0,
                    reasoning: usageMetadata?.thoughtsTokenCount ?? 0
                }
            }
        }),
        generationInfo: {
            model_name,
            ...generationInfo
        }
    }

    return {
        generations: [generation]
    }
}

function convertResponseContentToChatGenerationChunk(
    response: EnhancedGenerateContentResponse,
    extra: {
        usageMetadata?: UsageMetadata | undefined
        index: number
    }
): ChatGenerationChunk | null {
    if (!response || !response.candidates || response.candidates.length === 0) {
        return null
    }
    const functionCalls = response.functionCalls()
    const [candidate] = response.candidates
    const { content, ...generationInfo } = candidate
    const text = content?.parts?.[0]?.text ?? ''

    const toolCallChunks: ToolCallChunk[] = []
    if (functionCalls) {
        toolCallChunks.push(
            ...functionCalls.map((fc) => ({
                ...fc,
                args: JSON.stringify(fc.args),
                index: extra.index
            }))
        )
    }

    return new ChatGenerationChunk({
        text,
        message: new AIMessageChunk({
            content: text,
            name: !content ? undefined : content.role,
            tool_call_chunks: toolCallChunks,
            // Each chunk can have unique "generationInfo", and merging strategy is unclear,
            // so leave blank for now.
            additional_kwargs: {},
            usage_metadata: extra.usageMetadata as any
        }),
        generationInfo
    })
}

function zodToGeminiParameters(zodObj: any) {
    // Gemini doesn't accept either the $schema or additionalProperties
    // attributes, so we need to explicitly remove them.
    const jsonSchema: any = zodToJsonSchema(zodObj)
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { $schema, additionalProperties, ...rest } = jsonSchema

    // Ensure all properties have type specified
    if (rest.properties) {
        Object.keys(rest.properties).forEach((key) => {
            const prop = rest.properties[key]

            // Handle enum types
            if (prop.enum?.length) {
                rest.properties[key] = {
                    type: 'string',
                    format: 'enum',
                    enum: prop.enum
                }
            }
            // Handle missing type
            else if (!prop.type && !prop.oneOf && !prop.anyOf && !prop.allOf) {
                // Infer type from other properties
                if (prop.minimum !== undefined || prop.maximum !== undefined) {
                    prop.type = 'number'
                } else if (prop.format === 'date-time') {
                    prop.type = 'string'
                } else if (prop.items) {
                    prop.type = 'array'
                } else if (prop.properties) {
                    prop.type = 'object'
                } else {
                    // Default to string if type can't be inferred
                    prop.type = 'string'
                }
            }
        })
    }

    return rest
}

function convertToGeminiTools(structuredTools: (StructuredToolInterface | Record<string, unknown>)[]) {
    return [
        {
            functionDeclarations: structuredTools.map((structuredTool) => {
                if (isStructuredTool(structuredTool)) {
                    const jsonSchema = zodToGeminiParameters(structuredTool.schema)
                    return {
                        name: structuredTool.name,
                        description: structuredTool.description,
                        parameters: jsonSchema
                    }
                }
                return structuredTool
            })
        }
    ]
}
