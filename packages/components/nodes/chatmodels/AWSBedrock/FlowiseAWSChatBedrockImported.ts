import { BaseChatModel, type BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { ChatResult, ChatGenerationChunk } from '@langchain/core/outputs'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import { IVisionChatModal, IMultiModalOption } from '../../../src'

/**
 * Request format used when calling Bedrock's InvokeModel API for imported models.
 *
 * - 'bedrock-completion': Uses { prompt, max_gen_len, temperature } request shape.
 *   Response: { generation, stop_reason }. For models without a chat template (e.g. GPTBigCode).
 * - 'openai-chat-completion': Uses { messages, max_tokens, temperature } request shape.
 *   Response: { choices: [{ message }], usage }. For models with chat support (Llama, Qwen, etc.).
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/invoke-imported-model.html
 */
export type ImportedModelFormat = 'bedrock-completion' | 'openai-chat-completion'

export interface BedrockImportedChatInput extends BaseChatModelParams {
    region: string
    modelId: string
    format: ImportedModelFormat
    temperature?: number
    maxTokens?: number
    streaming?: boolean
    credentials?: {
        accessKeyId: string
        secretAccessKey: string
        sessionToken?: string
    }
}

interface OpenAIToolCall {
    id: string
    type: 'function'
    function: { name: string; arguments: string }
}

interface ImportedModelInfo {
    instructSupported?: boolean
    modelArchitecture?: string
    supportedFormats?: string[]
}

const _modelInfoCache = new Map<string, ImportedModelInfo>()

/**
 * Fetches metadata and supported request formats for an imported Bedrock model.
 *
 * Two-step process:
 * 1. Calls GetImportedModel to retrieve instructSupported and modelArchitecture.
 * 2. Probes InvokeModel with an empty body — the resulting ValidationException
 *    lists the formats the model accepts (e.g. "ChatCompletionRequest, BedrockMetaCompletionRequest").
 *
 * Results are cached per modelId for the process lifetime.
 * Errors propagate directly — if the model doesn't exist, the caller gets the real Bedrock error.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetImportedModel.html
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/invoke-imported-model.html
 */
export async function getImportedModelInfo(
    modelId: string,
    region: string,
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<ImportedModelInfo> {
    if (_modelInfoCache.has(modelId)) {
        return _modelInfoCache.get(modelId)!
    }

    const info: ImportedModelInfo = {}

    // Step 1: GetImportedModel for metadata (instructSupported, modelArchitecture)
    const { BedrockClient, GetImportedModelCommand } = await import('@aws-sdk/client-bedrock')
    const client = new BedrockClient({
        region,
        ...(credentials && { credentials })
    })
    const resp = await client.send(new GetImportedModelCommand({ modelIdentifier: modelId }))
    info.instructSupported = resp.instructSupported
    info.modelArchitecture = resp.modelArchitecture

    // Step 2: Probe InvokeModel with an empty body to discover supported formats.
    // Bedrock returns a ValidationException whose message lists the formats, e.g.:
    // "Available for this model: ChatCompletionRequest, BedrockMetaCompletionRequest, ..."
    // This is a control-plane call that fails instantly — no inference cost.
    try {
        const runtimeClient = new BedrockRuntimeClient({
            region,
            ...(credentials && { credentials })
        })
        await runtimeClient.send(
            new InvokeModelCommand({
                modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify({})
            })
        )
    } catch (probeErr: any) {
        const msg = probeErr?.message ?? ''
        const match = msg.match(/Available for this model:\s*(.+?)(?:"|$)/)
        if (match) {
            info.supportedFormats = match[1].split(',').map((s: string) => s.trim().toLowerCase())
        } else if (msg.includes('prompt') && msg.includes('must be provided')) {
            // Model expects a prompt field (completion-style, no chat template)
            info.supportedFormats = ['completionrequest']
        } else {
            throw probeErr
        }
    }

    _modelInfoCache.set(modelId, info)
    return info
}

/**
 * Selects the best request format based on the model's supported formats.
 * Prefers OpenAIChatCompletion (structured messages, tool_calls, token usage)
 * over BedrockCompletion (raw prompt string). Falls back to openai-chat-completion
 * if no format info is available.
 */
export function detectFormat(supportedFormats?: string[]): ImportedModelFormat {
    if (!supportedFormats?.length) {
        return 'openai-chat-completion'
    }

    // Prefer OpenAI Chat if available — structured messages, tool_calls, token usage
    if (supportedFormats.some((f) => f.includes('chatcompletion'))) {
        return 'openai-chat-completion'
    }

    return 'bedrock-completion'
}

export function _resetModelInfoCache(): void {
    _modelInfoCache.clear()
}

/**
 * LangChain-compatible chat model for Bedrock imported models that don't support
 * the Converse API (instructSupported: false).
 *
 * Uses InvokeModel / InvokeModelWithResponseStream instead of Converse / ConverseStream.
 * Supports two request formats (auto-detected at init time via getImportedModelInfo):
 * - OpenAIChatCompletion: messages array with tool_calls support
 * - BedrockCompletion: raw prompt string with max_gen_len
 *
 * This class is instantiated by AWSChatBedrock.init() when it detects an imported-model
 * ARN in the Custom Model ARN field. Users don't interact with it directly.
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/invoke-imported-model.html
 * @see https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
 */
export class BedrockImportedChat extends BaseChatModel implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string

    private region: string
    private modelId: string
    private format: ImportedModelFormat
    private temperature: number
    private maxTokens: number
    private streamingEnabled: boolean
    private credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
    private client: BedrockRuntimeClient

    constructor(id: string, fields: BedrockImportedChatInput) {
        super(fields)
        this.id = id
        this.region = fields.region
        this.modelId = fields.modelId
        this.format = fields.format
        this.temperature = fields.temperature ?? 0.7
        this.maxTokens = fields.maxTokens ?? 200
        this.streamingEnabled = fields.streaming ?? true
        this.credentials = fields.credentials
        this.configuredModel = fields.modelId
        this.configuredMaxToken = fields.maxTokens

        this.client = new BedrockRuntimeClient({
            region: this.region,
            ...(this.credentials && { credentials: this.credentials })
        })
    }

    _llmType(): string {
        return 'bedrock-imported'
    }

    get callKeys(): string[] {
        return ['stop', 'signal', 'options']
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        if (this.streamingEnabled && runManager) {
            const generations: ChatGenerationChunk[] = []
            let fullText = ''
            for await (const chunk of this._streamResponseChunks(messages, options, runManager)) {
                generations.push(chunk)
                fullText += chunk.text
            }
            return {
                generations: [{ text: fullText, message: new AIMessage(fullText) }]
            }
        }

        const body = this.buildRequestBody(messages)
        try {
            const resp = await this.client.send(
                new InvokeModelCommand({
                    modelId: this.modelId,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify(body)
                })
            )
            if (resp.body == null) throw new Error('Response body is undefined')
            const decoded = JSON.parse(new TextDecoder().decode(resp.body))
            return this.parseResponse(decoded)
        } catch (err) {
            throw this.normalizeError(err)
        }
    }

    async *_streamResponseChunks(
        messages: BaseMessage[],
        _options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        const body = this.buildRequestBody(messages)
        try {
            const resp = await this.client.send(
                new InvokeModelWithResponseStreamCommand({
                    modelId: this.modelId,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify(body)
                })
            )

            if (!resp.body) {
                throw new Error('No response stream received from Bedrock')
            }

            for await (const event of resp.body) {
                if (event.chunk?.bytes) {
                    const decoded = JSON.parse(new TextDecoder().decode(event.chunk.bytes))
                    const text = this.extractStreamChunkText(decoded)
                    if (text) {
                        const chunk = new ChatGenerationChunk({
                            text,
                            message: new AIMessageChunk(text)
                        })
                        yield chunk
                        await runManager?.handleLLMNewToken(text)
                    }
                }
            }
        } catch (err) {
            throw this.normalizeError(err)
        }
    }

    private buildRequestBody(messages: BaseMessage[]): Record<string, unknown> {
        if (this.format === 'openai-chat-completion') {
            return this.buildOpenAIChatBody(messages)
        }
        return this.buildBedrockCompletionBody(messages)
    }

    private buildBedrockCompletionBody(messages: BaseMessage[]): Record<string, unknown> {
        const prompt = this.convertMessagesToPrompt(messages)
        return {
            prompt,
            temperature: this.temperature,
            max_gen_len: this.maxTokens
        }
    }

    private buildOpenAIChatBody(messages: BaseMessage[]): Record<string, unknown> {
        const openaiMessages = this.convertMessagesToOpenAI(messages)
        return {
            messages: openaiMessages,
            temperature: this.temperature,
            max_tokens: this.maxTokens
        }
    }

    convertMessagesToPrompt(messages: BaseMessage[]): string {
        const parts: string[] = []
        for (const msg of messages) {
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            if (msg instanceof SystemMessage) {
                parts.push(`${content}\n`)
            } else if (msg instanceof HumanMessage) {
                parts.push(`User: ${content}`)
            } else if (msg instanceof AIMessage) {
                parts.push(`Assistant: ${content}`)
            } else if (msg instanceof ToolMessage) {
                parts.push(`Tool: ${content}`)
            } else {
                parts.push(content)
            }
        }
        parts.push('Assistant:')
        return parts.join('\n')
    }

    convertMessagesToOpenAI(messages: BaseMessage[]): Array<Record<string, unknown>> {
        return messages.map((msg) => {
            const content = typeof msg.content === 'string' ? msg.content : this.convertMultiModalContent(msg.content)
            if (msg instanceof SystemMessage) {
                return { role: 'system', content }
            }
            if (msg instanceof HumanMessage) {
                return { role: 'user', content }
            }
            if (msg instanceof AIMessage) {
                const result: Record<string, unknown> = { role: 'assistant', content }
                if (msg.additional_kwargs?.tool_calls) {
                    result.tool_calls = msg.additional_kwargs.tool_calls
                }
                return result
            }
            if (msg instanceof ToolMessage) {
                return {
                    role: 'tool',
                    content,
                    tool_call_id: (msg as ToolMessage).tool_call_id
                }
            }
            return { role: 'user', content }
        })
    }

    private convertMultiModalContent(content: unknown): unknown {
        if (!Array.isArray(content)) return content
        return content.map((part: any) => {
            if (part.type === 'image_url' && typeof part.image_url?.url === 'string') {
                const url = part.image_url.url
                if (!url.startsWith('data:')) {
                    throw new Error(
                        'AWS Bedrock Imported models only support base64 data URLs for images, ' +
                            'not remote URLs. Convert the image to a data URL first.'
                    )
                }
                return part
            }
            return part
        })
    }

    private parseResponse(decoded: Record<string, unknown>): ChatResult {
        if (this.format === 'openai-chat-completion') {
            return this.parseOpenAIChatResponse(decoded)
        }
        return this.parseBedrockCompletionResponse(decoded)
    }

    private parseBedrockCompletionResponse(decoded: Record<string, unknown>): ChatResult {
        const text = (decoded.completion as string) ?? (decoded.generation as string) ?? ''
        return {
            generations: [{ text, message: new AIMessage(text) }]
        }
    }

    private parseOpenAIChatResponse(decoded: Record<string, unknown>): ChatResult {
        const choices = decoded.choices as Array<Record<string, any>> | undefined
        if (!choices?.length) {
            return { generations: [{ text: '', message: new AIMessage('') }] }
        }
        const choice = choices[0]
        const message = choice.message ?? {}
        const text = (message.content as string) ?? ''
        const toolCalls: OpenAIToolCall[] | undefined = message.tool_calls

        const aiMsg = new AIMessage({
            content: text,
            additional_kwargs: toolCalls ? { tool_calls: toolCalls } : {}
        })

        return {
            generations: [{ text, message: aiMsg }],
            llmOutput: decoded.usage
                ? {
                      tokenUsage: {
                          promptTokens: (decoded.usage as any).prompt_tokens,
                          completionTokens: (decoded.usage as any).completion_tokens,
                          totalTokens: (decoded.usage as any).total_tokens
                      }
                  }
                : undefined
        }
    }

    private extractStreamChunkText(decoded: Record<string, unknown>): string {
        if (this.format === 'openai-chat-completion') {
            const choices = decoded.choices as Array<Record<string, any>> | undefined
            if (!choices?.length) return ''
            const delta = choices[0].delta ?? {}
            return (delta.content as string) ?? ''
        }
        return (decoded.completion as string) ?? (decoded.generation as string) ?? (decoded.outputText as string) ?? ''
    }

    private normalizeError(err: unknown): Error {
        if (!(err instanceof Error)) return err as Error
        const msg = err.message ?? ''

        if (msg.includes('ModelNotReadyException') || msg.includes('not ready')) {
            return new Error(
                `The imported model is not ready to serve requests. ` +
                    `This can happen shortly after import or if the model is being updated. ` +
                    `Wait a few minutes and try again. Original error: ${msg}`
            )
        }

        if (msg.includes('ValidationException') && msg.includes('format')) {
            return new Error(
                `The request format may not match what this imported model expects. ` +
                    `The auto-detected format is "${this.format}". ` +
                    `Original error: ${msg}`
            )
        }

        if (msg.includes('ResourceNotFoundException')) {
            return new Error(
                `Model not found: "${this.modelId}". ` +
                    `Verify the model ARN or ID is correct and the model exists in the "${this.region}" region. ` +
                    `Original error: ${msg}`
            )
        }

        return err
    }
}
