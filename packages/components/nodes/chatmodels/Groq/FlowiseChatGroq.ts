import { ChatResult } from '@langchain/core/outputs'
import { BaseMessage, AIMessage } from '@langchain/core/messages'
import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatGroq, ChatGroqInput } from '@langchain/groq'

export class FlowiseChatGroq extends BaseChatModel<BaseChatModelCallOptions> implements ChatGroqInput {
    model: string
    temperature?: number
    maxTokens?: number
    apiKey: string
    streaming: boolean
    private client: ChatGroq

    constructor(fields: ChatGroqInput) {
        super(fields)
        this.model = fields.model
        if (fields.apiKey) this.apiKey = fields.apiKey
        this.temperature = fields.temperature ?? 0.7
        this.maxTokens = fields.maxTokens
        this.streaming = fields.streaming ?? false

        this.client = new ChatGroq({
            model: this.model,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            apiKey: this.apiKey,
            streaming: this.streaming
        })
    }

    _llmType(): string {
        return 'groq'
    }

    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const response = await this.client.invoke(messages, {
            callbacks: runManager ? [runManager] : undefined
        })

        const text = (response?.content ?? '') as string

        if (runManager && text) {
            await runManager.handleLLMNewToken(text)
        }

        const responseMeta = (response as AIMessage).response_metadata
        const usage = responseMeta?.usage

        const usageMetadata = usage
            ? {
                  input_tokens: usage.prompt_tokens ?? usage.input_tokens,
                  output_tokens: usage.completion_tokens ?? usage.output_tokens,

                  input_token_details: {
                      text: usage.prompt_tokens ?? usage.input_tokens
                  },
                  output_token_details: {
                      text: usage.completion_tokens ?? usage.output_tokens
                  }
              }
            : undefined

        const result: ChatResult = {
            generations: [
                {
                    text,
                    message: response
                }
            ],
            llmOutput: usageMetadata ? { tokenUsage: usageMetadata } : undefined
        }

        return result
    }
}
