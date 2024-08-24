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

    streaming = false

    streamUsage = true

    private client: GenerativeModel

    get _isMultimodalModel() {
        return this.modelName.includes('vision') || this.modelName.startsWith('gemini-1.5')
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

    getClient(tools?: Tool[]) {
        this.client = new GenerativeAI(this.apiKey ?? '').getGenerativeModel({
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
        })
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

    async _generateNonStreaming(
        prompt: Content[],
        options: this['ParsedCallOptions'],
        _runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        //@ts-ignore
        const tools = options.tools ?? []

        this.convertFunctionResponse(prompt)

        if (tools.length > 0) {
            this.getClient(tools as Tool[])
        } else {
            this.getClient()
        }
        const res = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
            let output
            try {
                output = await this.client.generateContent({
                    contents: prompt
                })
            } catch (e: any) {
                if (e.message?.includes('400 Bad Request')) {
                    e.status = 400
                }
                throw e
            }
            return output
        })
        const generationResult = mapGenerateContentResultToChatResult(res.response)
        await _runManager?.handleLLMNewToken(generationResult.generations?.length ? generationResult.generations[0].text : '')
        return generationResult
    }

    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        let prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel)
        prompt = checkIfEmptyContentAndSameRole(prompt)

        // Handle streaming
        if (this.streaming) {
            const tokenUsage: TokenUsage = {}
            const stream = this._streamResponseChunks(messages, options, runManager)
            const finalChunks: Record<number, ChatGenerationChunk> = {}

            for await (const chunk of stream) {
                const index = (chunk.generationInfo as NewTokenIndices)?.completion ?? 0
                if (finalChunks[index] === undefined) {
                    finalChunks[index] = chunk
                } else {
                    finalChunks[index] = finalChunks[index].concat(chunk)
                }
            }
            const generations = Object.entries(finalChunks)
                .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
                .map(([_, value]) => value)

            return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } }
        }
        return this._generateNonStreaming(prompt, options, runManager)
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        let prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel)
        prompt = checkIfEmptyContentAndSameRole(prompt)

        const parameters = this.invocationParams(options)
        const request = {
            ...parameters,
            contents: prompt
        }

        const tools = options.tools ?? []
        if (tools.length > 0) {
            this.getClient(tools as Tool[])
        } else {
            this.getClient()
        }

        const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
            const { stream } = await this.client.generateContentStream(request)
            return stream
        })

        let usageMetadata: UsageMetadata | ICommonObject | undefined
        let index = 0
        for await (const response of stream) {
            if ('usageMetadata' in response && this.streamUsage !== false && options.streamUsage !== false) {
                const genAIUsageMetadata = response.usageMetadata as {
                    promptTokenCount: number
                    candidatesTokenCount: number
                    totalTokenCount: number
                }
                if (!usageMetadata) {
                    usageMetadata = {
                        input_tokens: genAIUsageMetadata.promptTokenCount,
                        output_tokens: genAIUsageMetadata.candidatesTokenCount,
                        total_tokens: genAIUsageMetadata.totalTokenCount
                    }
                } else {
                    // Under the hood, LangChain combines the prompt tokens. Google returns the updated
                    // total each time, so we need to find the difference between the tokens.
                    const outputTokenDiff = genAIUsageMetadata.candidatesTokenCount - (usageMetadata as ICommonObject).output_tokens
                    usageMetadata = {
                        input_tokens: 0,
                        output_tokens: outputTokenDiff,
                        total_tokens: outputTokenDiff
                    }
                }
            }

            const chunk = convertResponseContentToChatGenerationChunk(response, {
                usageMetadata: usageMetadata as UsageMetadata,
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
        if (this.modelName !== 'gemini-pro-vision' && this.modelName !== 'gemini-1.5-pro-latest') {
            this.modelName = 'gemini-1.5-pro-latest'
            this.maxOutputTokens = this.configuredMaxToken ? this.configuredMaxToken : 8192
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
    switch (author) {
        /**
         *  Note: Gemini currently is not supporting system messages
         *  we will convert them to human messages and merge with following
         * */
        case 'ai':
        case 'model': // getMessageAuthor returns message.name. code ex.: return message.name ?? type;
            return 'model'
        case 'system':
        case 'human':
            return 'user'
        case 'function':
        case 'tool':
            return 'function'
        default:
            // Instead of throwing, we return model (Needed for Multi Agent)
            // throw new Error(`Unknown / unsupported author: ${author}`)
            return 'model'
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
    const removedContents: Content[] = []
    for (const content of contents) {
        const role = content.role
        if (content.parts.length && content.parts[0].text === '' && role === prevRole) {
            removedContents.push(content)
        }

        prevRole = role
    }

    return contents.filter((content) => !removedContents.includes(content))
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
            if (actualRole === 'function') {
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

function mapGenerateContentResultToChatResult(
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
    const { content, ...generationInfo } = candidate
    const text = content?.parts[0]?.text ?? ''

    const generation: ChatGeneration = {
        text,
        message: new AIMessage({
            content: text,
            tool_calls: functionCalls,
            additional_kwargs: {
                ...generationInfo
            },
            usage_metadata: extra?.usageMetadata as any
        }),
        generationInfo
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
    if (!response.candidates || response.candidates.length === 0) {
        return null
    }
    const functionCalls = response.functionCalls()
    const [candidate] = response.candidates
    const { content, ...generationInfo } = candidate
    const text = content?.parts[0]?.text ?? ''

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
    if (rest.properties) {
        Object.keys(rest.properties).forEach((key) => {
            if (rest.properties[key].enum?.length) {
                rest.properties[key] = { type: 'string', format: 'enum', enum: rest.properties[key].enum }
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
