import { LLM, BaseLLMParams } from '@langchain/core/language_models/llms'
import { getEnvironmentVariable } from '../../../src/utils'

export interface HFInput {
    /** Model to use */
    model: string

    /** Sampling temperature to use */
    temperature?: number

    /**
     * Maximum number of tokens to generate in the completion.
     */
    maxTokens?: number

    /** Total probability mass of tokens to consider at each step */
    topP?: number

    /** Integer to define the top tokens considered within the sample operation to create new text. */
    topK?: number

    /** Penalizes repeated tokens according to frequency */
    frequencyPenalty?: number

    /** API key to use. */
    apiKey?: string

    /** Private endpoint to use. */
    endpoint?: string
}

export class HuggingFaceInference extends LLM implements HFInput {
    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            apiKey: 'HUGGINGFACEHUB_API_KEY'
        }
    }

    model = 'gpt2'

    temperature: number | undefined = undefined

    maxTokens: number | undefined = undefined

    topP: number | undefined = undefined

    topK: number | undefined = undefined

    frequencyPenalty: number | undefined = undefined

    apiKey: string | undefined = undefined

    endpoint: string | undefined = undefined

    constructor(fields?: Partial<HFInput> & BaseLLMParams) {
        super(fields ?? {})

        this.model = fields?.model ?? this.model
        this.temperature = fields?.temperature ?? this.temperature
        this.maxTokens = fields?.maxTokens ?? this.maxTokens
        this.topP = fields?.topP ?? this.topP
        this.topK = fields?.topK ?? this.topK
        this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty
        this.endpoint = fields?.endpoint ?? ''
        this.apiKey = fields?.apiKey ?? getEnvironmentVariable('HUGGINGFACEHUB_API_KEY')
        if (!this.apiKey) {
            throw new Error(
                'Please set an API key for HuggingFace Hub in the environment variable HUGGINGFACEHUB_API_KEY or in the apiKey field of the HuggingFaceInference constructor.'
            )
        }
    }

    _llmType() {
        return 'hf'
    }

    /** @ignore */
    async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
        const { HfInference } = await HuggingFaceInference.imports()
        const hf = new HfInference(this.apiKey)
        const obj: any = {
            parameters: {
                // make it behave similar to openai, returning only the generated text
                return_full_text: false,
                temperature: this.temperature,
                max_new_tokens: this.maxTokens,
                top_p: this.topP,
                top_k: this.topK,
                repetition_penalty: this.frequencyPenalty
            },
            inputs: prompt
        }
        if (this.endpoint) {
            hf.endpoint(this.endpoint)
        } else {
            obj.model = this.model
        }
        const res = await this.caller.callWithOptions({ signal: options.signal }, hf.textGeneration.bind(hf), obj)
        return res.generated_text
    }

    /** @ignore */
    static async imports(): Promise<{
        HfInference: typeof import('@huggingface/inference').HfInference
    }> {
        try {
            const { HfInference } = await import('@huggingface/inference')
            return { HfInference }
        } catch (e) {
            throw new Error('Please install huggingface as a dependency with, e.g. `yarn add @huggingface/inference`')
        }
    }
}
