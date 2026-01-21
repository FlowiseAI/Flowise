import { LLM, BaseLLMParams } from '@langchain/core/language_models/llms'
import { getEnvironmentVariable } from '../../../src/utils'
import { GenerationChunk } from '@langchain/core/outputs'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'

export interface HFInput {
    model: string
    temperature?: number
    maxTokens?: number
    stopSequences?: string[]
    topP?: number
    topK?: number
    frequencyPenalty?: number
    apiKey?: string
    endpointUrl?: string
    includeCredentials?: string | boolean
}

export class HuggingFaceInference extends LLM implements HFInput {
    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            apiKey: 'HUGGINGFACEHUB_API_KEY'
        }
    }

    model = 'gpt2'

    temperature: number | undefined = undefined

    stopSequences: string[] | undefined = undefined

    maxTokens: number | undefined = undefined

    topP: number | undefined = undefined

    topK: number | undefined = undefined

    frequencyPenalty: number | undefined = undefined

    apiKey: string | undefined = undefined

    endpointUrl: string | undefined = undefined

    includeCredentials: string | boolean | undefined = undefined

    constructor(fields?: Partial<HFInput> & BaseLLMParams) {
        super(fields ?? {})

        this.model = fields?.model ?? this.model
        this.temperature = fields?.temperature ?? this.temperature
        this.maxTokens = fields?.maxTokens ?? this.maxTokens
        this.stopSequences = fields?.stopSequences ?? this.stopSequences
        this.topP = fields?.topP ?? this.topP
        this.topK = fields?.topK ?? this.topK
        this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty
        this.apiKey = fields?.apiKey ?? getEnvironmentVariable('HUGGINGFACEHUB_API_KEY')
        this.endpointUrl = fields?.endpointUrl
        this.includeCredentials = fields?.includeCredentials
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error(
                'Please set an API key for HuggingFace Hub. Either configure it in the credential settings in the UI, or set the environment variable HUGGINGFACEHUB_API_KEY.'
            )
        }
    }

    _llmType() {
        return 'hf'
    }

    invocationParams(options?: this['ParsedCallOptions']) {
        // Return parameters compatible with chatCompletion API (OpenAI-compatible format)
        const params: any = {
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            stop: options?.stop ?? this.stopSequences,
            top_p: this.topP
        }
        // Include optional parameters if they are defined
        if (this.topK !== undefined) {
            params.top_k = this.topK
        }
        if (this.frequencyPenalty !== undefined) {
            params.frequency_penalty = this.frequencyPenalty
        }
        return params
    }

    async *_streamResponseChunks(
        prompt: string,
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<GenerationChunk> {
        try {
            const client = await this._prepareHFInference()
            const stream = await this.caller.call(async () =>
                client.chatCompletionStream({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    ...this.invocationParams(options)
                })
            )
            for await (const chunk of stream) {
                const token = chunk.choices[0]?.delta?.content || ''
                if (token) {
                    yield new GenerationChunk({ text: token, generationInfo: chunk })
                    await runManager?.handleLLMNewToken(token)
                }
                // stream is done when finish_reason is set
                if (chunk.choices[0]?.finish_reason) {
                    yield new GenerationChunk({
                        text: '',
                        generationInfo: { finished: true }
                    })
                    break
                }
            }
        } catch (error: any) {
            console.error('[ChatHuggingFace] Error in _streamResponseChunks:', error)
            // Provide more helpful error messages
            if (error?.message?.includes('endpointUrl') || error?.message?.includes('third-party provider')) {
                throw new Error(
                    `Cannot use custom endpoint with model "${this.model}" that includes a provider. Please leave the Endpoint field blank in the UI. Original error: ${error.message}`
                )
            }
            throw error
        }
    }

    /** @ignore */
    async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
        try {
            const client = await this._prepareHFInference()
            // Use chatCompletion for chat models (v4 supports conversational models via Inference Providers)
            const args = {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                ...this.invocationParams(options)
            }
            const res = await this.caller.callWithOptions({ signal: options.signal }, client.chatCompletion.bind(client), args)
            const content = res.choices[0]?.message?.content || ''
            if (!content) {
                console.error('[ChatHuggingFace] No content in response:', JSON.stringify(res))
                throw new Error(`No content received from HuggingFace API. Response: ${JSON.stringify(res)}`)
            }
            return content
        } catch (error: any) {
            console.error('[ChatHuggingFace] Error in _call:', error.message)
            // Provide more helpful error messages
            if (error?.message?.includes('endpointUrl') || error?.message?.includes('third-party provider')) {
                throw new Error(
                    `Cannot use custom endpoint with model "${this.model}" that includes a provider. Please leave the Endpoint field blank in the UI. Original error: ${error.message}`
                )
            }
            if (error?.message?.includes('Invalid username or password') || error?.message?.includes('authentication')) {
                throw new Error(
                    `HuggingFace API authentication failed. Please verify your API key is correct and starts with "hf_". Original error: ${error.message}`
                )
            }
            throw error
        }
    }

    /** @ignore */
    private async _prepareHFInference() {
        if (!this.apiKey || this.apiKey.trim() === '') {
            console.error('[ChatHuggingFace] API key validation failed: Empty or undefined')
            throw new Error('HuggingFace API key is required. Please configure it in the credential settings.')
        }

        const { InferenceClient } = await HuggingFaceInference.imports()
        // Use InferenceClient for chat models (works better with Inference Providers)
        const client = new InferenceClient(this.apiKey)

        // Don't override endpoint if model uses a provider (contains ':') or if endpoint is router-based
        // When using Inference Providers, endpoint should be left blank - InferenceClient handles routing automatically
        if (
            this.endpointUrl &&
            !this.model.includes(':') &&
            !this.endpointUrl.includes('/v1/chat/completions') &&
            !this.endpointUrl.includes('router.huggingface.co')
        ) {
            return client.endpoint(this.endpointUrl)
        }

        // Return client without endpoint override - InferenceClient will use Inference Providers automatically
        return client
    }

    /** @ignore */
    static async imports(): Promise<{
        InferenceClient: typeof import('@huggingface/inference').InferenceClient
    }> {
        try {
            const { InferenceClient } = await import('@huggingface/inference')
            return { InferenceClient }
        } catch (e) {
            throw new Error('Please install huggingface as a dependency with, e.g. `pnpm install @huggingface/inference`')
        }
    }
}
