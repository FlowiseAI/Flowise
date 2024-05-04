import { LLM, BaseLLMParams } from '@langchain/core/language_models/llms'

export interface CohereInput extends BaseLLMParams {
    /** Sampling temperature to use */
    temperature?: number

    /**
     * Maximum number of tokens to generate in the completion.
     */
    maxTokens?: number

    /** Model to use */
    model?: string

    apiKey?: string
}

export class Cohere extends LLM implements CohereInput {
    temperature = 0

    maxTokens = 250

    model: string

    apiKey: string

    constructor(fields?: CohereInput) {
        super(fields ?? {})

        const apiKey = fields?.apiKey ?? undefined

        if (!apiKey) {
            throw new Error('Please set the COHERE_API_KEY environment variable or pass it to the constructor as the apiKey field.')
        }

        this.apiKey = apiKey
        this.maxTokens = fields?.maxTokens ?? this.maxTokens
        this.temperature = fields?.temperature ?? this.temperature
        this.model = fields?.model ?? this.model
    }

    _llmType() {
        return 'cohere'
    }

    /** @ignore */
    async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
        const { cohere } = await Cohere.imports()

        cohere.init(this.apiKey)

        // Hit the `generate` endpoint on the `large` model
        const generateResponse = await this.caller.callWithOptions({ signal: options.signal }, cohere.generate.bind(cohere), {
            prompt,
            model: this.model,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            end_sequences: options.stop
        })
        try {
            return generateResponse.body.generations[0].text
        } catch {
            throw new Error('Could not parse response.')
        }
    }

    /** @ignore */
    static async imports(): Promise<{
        cohere: typeof import('cohere-ai')
    }> {
        try {
            const { default: cohere } = await import('cohere-ai')
            return { cohere }
        } catch (e) {
            throw new Error('Please install cohere-ai as a dependency with, e.g. `pnpm install cohere-ai`')
        }
    }
}
