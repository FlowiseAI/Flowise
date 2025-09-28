import type { BaseChatModelParams, LangSmithParams } from '@langchain/core/language_models/chat_models'
import {
    type OpenAIClient,
    type ChatOpenAICallOptions,
    type OpenAIChatInput,
    type OpenAICoreRequestOptions,
    ChatOpenAICompletions
} from '@langchain/openai'

import { getEnvironmentVariable } from '@langchain/core/utils/env'

type FireworksUnsupportedArgs = 'frequencyPenalty' | 'presencePenalty' | 'logitBias' | 'functions'

type FireworksUnsupportedCallOptions = 'functions' | 'function_call'

export type ChatFireworksCallOptions = Partial<Omit<ChatOpenAICallOptions, FireworksUnsupportedCallOptions>>

export type ChatFireworksParams = Partial<Omit<OpenAIChatInput, 'openAIApiKey' | FireworksUnsupportedArgs>> &
    BaseChatModelParams & {
        /**
         * Prefer `apiKey`
         */
        fireworksApiKey?: string
        /**
         * The Fireworks API key to use.
         */
        apiKey?: string
    }

export class ChatFireworks extends ChatOpenAICompletions<ChatFireworksCallOptions> {
    static lc_name() {
        return 'ChatFireworks'
    }

    _llmType() {
        return 'fireworks'
    }

    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            fireworksApiKey: 'FIREWORKS_API_KEY',
            apiKey: 'FIREWORKS_API_KEY'
        }
    }

    lc_serializable = true

    fireworksApiKey?: string

    apiKey?: string

    constructor(fields?: ChatFireworksParams) {
        const fireworksApiKey = fields?.apiKey || fields?.fireworksApiKey || getEnvironmentVariable('FIREWORKS_API_KEY')

        if (!fireworksApiKey) {
            throw new Error(
                `Fireworks API key not found. Please set the FIREWORKS_API_KEY environment variable or provide the key into "fireworksApiKey"`
            )
        }

        super({
            ...fields,
            model: fields?.model || fields?.modelName || 'accounts/fireworks/models/llama-v3p1-8b-instruct',
            apiKey: fireworksApiKey,
            configuration: {
                baseURL: 'https://api.fireworks.ai/inference/v1'
            },
            streamUsage: false
        })

        this.fireworksApiKey = fireworksApiKey
        this.apiKey = fireworksApiKey
    }

    getLsParams(options: any): LangSmithParams {
        const params = super.getLsParams(options)
        params.ls_provider = 'fireworks'
        return params
    }

    toJSON() {
        const result = super.toJSON()

        if ('kwargs' in result && typeof result.kwargs === 'object' && result.kwargs != null) {
            delete result.kwargs.openai_api_key
            delete result.kwargs.configuration
        }

        return result
    }

    // eslint-disable-next-line
    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming,
        options?: OpenAICoreRequestOptions
    ): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>>

    // eslint-disable-next-line
    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: OpenAICoreRequestOptions
    ): Promise<OpenAIClient.Chat.Completions.ChatCompletion>

    /**
     * Calls the Fireworks API with retry logic in case of failures.
     * @param request The request to send to the Fireworks API.
     * @param options Optional configuration for the API call.
     * @returns The response from the Fireworks API.
     */
    // eslint-disable-next-line
    async completionWithRetry(
        request: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming | OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming,
        options?: OpenAICoreRequestOptions
    ): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk> | OpenAIClient.Chat.Completions.ChatCompletion> {
        delete request.frequency_penalty
        delete request.presence_penalty
        delete request.logit_bias
        delete request.functions

        if (request.stream === true) {
            return super.completionWithRetry(request, options)
        }

        return super.completionWithRetry(request, options)
    }
}
