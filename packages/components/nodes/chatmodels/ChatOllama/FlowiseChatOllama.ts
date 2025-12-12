import { ChatOllama as LCChatOllama, ChatOllamaInput } from '@langchain/ollama'
import { IMultiModalOption, IVisionChatModal } from '../../../src'
import { BaseMessage, AIMessageChunk } from '@langchain/core/messages'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatGenerationChunk } from '@langchain/core/outputs'

export interface FlowiseChatOllamaInput extends ChatOllamaInput {
    reasoningEffort?: 'low' | 'medium' | 'high'
}

export class ChatOllama extends LCChatOllama implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    id: string
    reasoningEffort?: 'low' | 'medium' | 'high'

    constructor(id: string, fields?: FlowiseChatOllamaInput) {
        super(fields)
        this.id = id
        this.configuredModel = fields?.model ?? ''
        this.reasoningEffort = fields?.reasoningEffort
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }

    /**
     * Override _streamResponseChunks to inject the 'think' parameter for reasoning models
     */
    async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        // If reasoningEffort is set, we need to use non-streaming with think parameter
        // because streaming with think requires special handling
        if (this.reasoningEffort) {
            try {
                // Call the non-streaming version and yield the result as a single chunk
                const result = await this._generateNonStreaming(messages, options, runManager)
                if (result) {
                    yield result
                }
                return
            } catch (error: any) {
                // If we get a 405 error, it means the endpoint doesn't support native Ollama API
                // Fall back to regular streaming without the think parameter
                if (error?.message?.includes('405')) {
                    console.warn(
                        'Ollama reasoning effort requires native Ollama API endpoint. Falling back to standard mode.'
                    )
                    // Fall through to use parent's streaming implementation
                } else {
                    throw error
                }
            }
        }

        // Otherwise, use the parent's streaming implementation
        for await (const chunk of super._streamResponseChunks(messages, options, runManager)) {
            yield chunk
        }
    }

    /**
     * Non-streaming generation with think parameter support
     */
    private async _generateNonStreaming(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatGenerationChunk | undefined> {
        let baseUrl = this.baseUrl || 'http://localhost:11434'
        // Remove trailing slash if present
        baseUrl = baseUrl.replace(/\/+$/, '')
        const url = `${baseUrl}/api/chat`

        // Convert messages to Ollama format
        const ollamaMessages = messages.map((msg) => ({
            role: msg._getType() === 'human' ? 'user' : msg._getType() === 'ai' ? 'assistant' : 'system',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }))

        const requestBody: any = {
            model: this.model,
            messages: ollamaMessages,
            stream: false,
            options: {}
        }

        // Add think parameter for reasoning effort
        // GPT-OSS model requires effort level: 'low', 'medium', 'high'
        // Other models (DeepSeek R1, Qwen3) accept boolean true/false
        // We pass the effort level string - Ollama handles this appropriately per model
        if (this.reasoningEffort) {
            requestBody.think = this.reasoningEffort
        }

        // Add other Ollama options
        if (this.temperature !== undefined) requestBody.options.temperature = this.temperature
        if (this.topP !== undefined) requestBody.options.top_p = this.topP
        if (this.topK !== undefined) requestBody.options.top_k = this.topK
        if (this.numCtx !== undefined) requestBody.options.num_ctx = this.numCtx
        if (this.repeatPenalty !== undefined) requestBody.options.repeat_penalty = this.repeatPenalty
        if (this.mirostat !== undefined) requestBody.options.mirostat = this.mirostat
        if (this.mirostatEta !== undefined) requestBody.options.mirostat_eta = this.mirostatEta
        if (this.mirostatTau !== undefined) requestBody.options.mirostat_tau = this.mirostatTau
        if (this.numGpu !== undefined) requestBody.options.num_gpu = this.numGpu
        if (this.numThread !== undefined) requestBody.options.num_thread = this.numThread
        if (this.repeatLastN !== undefined) requestBody.options.repeat_last_n = this.repeatLastN
        if (this.tfsZ !== undefined) requestBody.options.tfs_z = this.tfsZ
        if (this.format) requestBody.format = this.format
        if (this.keepAlive) requestBody.keep_alive = this.keepAlive

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Ollama API error: ${response.status} ${errorText}`)
            }

            const data = await response.json()

            // Extract content and thinking from response
            let content = data.message?.content || ''
            const thinking = data.message?.thinking || ''

            // If there's thinking content, optionally prepend it (or handle separately)
            // For now, we just return the main content
            // The thinking is available in data.message.thinking if needed

            const chunk = new ChatGenerationChunk({
                message: new AIMessageChunk({
                    content,
                    additional_kwargs: thinking ? { thinking } : {}
                }),
                text: content
            })

            await runManager?.handleLLMNewToken(content)

            return chunk
        } catch (error) {
            throw error
        }
    }
}
