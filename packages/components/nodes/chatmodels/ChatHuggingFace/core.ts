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
        if (!this.apiKey) {
            throw new Error(
                'Please set an API key for HuggingFace Hub in the environment variable HUGGINGFACEHUB_API_KEY or in the apiKey field of the HuggingFaceInference constructor.'
            )
        }
    }

    _llmType() {
        return 'hf'
    }

    invocationParams(options?: this['ParsedCallOptions']) {
        return {
            model: this.model,
            parameters: {
                // make it behave similar to openai, returning only the generated text
                return_full_text: false,
                temperature: this.temperature,
                max_new_tokens: this.maxTokens,
                stop: options?.stop ?? this.stopSequences,
                top_p: this.topP,
                top_k: this.topK,
                repetition_penalty: this.frequencyPenalty
            }
        }
    }

    async *_streamResponseChunks(
        prompt: string,
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<GenerationChunk> {
        const hfi = await this._prepareHFInference()
        const stream = await this.caller.call(async () =>
            hfi.textGenerationStream({
                ...this.invocationParams(options),
                inputs: prompt
            })
        )
        for await (const chunk of stream) {
            const token = chunk.token.text
            yield new GenerationChunk({ text: token, generationInfo: chunk })
            await runManager?.handleLLMNewToken(token ?? '')

            // stream is done
            if (chunk.generated_text)
                yield new GenerationChunk({
                    text: '',
                    generationInfo: { finished: true }
                })
        }
    }

    /** @ignore */
    async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
        const hfi = await this._prepareHFInference()
        const args = { ...this.invocationParams(options), inputs: prompt }
        const res = await this.caller.callWithOptions({ signal: options.signal }, hfi.textGeneration.bind(hfi), args)
        return res.generated_text
    }

    /** @ignore */
    private async _prepareHFInference() {
        const { HfInference } = await HuggingFaceInference.imports()
        const hfi = new HfInference(this.apiKey, {
            includeCredentials: this.includeCredentials
        })
        return this.endpointUrl ? hfi.endpoint(this.endpointUrl) : hfi
    }

    /** @ignore */
    static async imports(): Promise<{
        HfInference: typeof import('@huggingface/inference').HfInference
    }> {
        try {
            const { HfInference } = await import('@huggingface/inference')
            return { HfInference }
        } catch (e) {
            throw new Error('Please install huggingface as a dependency with, e.g. `pnpm install @huggingface/inference`')
        }
    }
}
