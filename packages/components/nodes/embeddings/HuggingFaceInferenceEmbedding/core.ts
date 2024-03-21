import { HfInference } from '@huggingface/inference'
import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings'
import { getEnvironmentVariable } from '../../../src/utils'

export interface HuggingFaceInferenceEmbeddingsParams extends EmbeddingsParams {
    apiKey?: string
    model?: string
    endpoint?: string
}

export class HuggingFaceInferenceEmbeddings extends Embeddings implements HuggingFaceInferenceEmbeddingsParams {
    apiKey?: string

    endpoint?: string

    model: string

    client: HfInference

    constructor(fields?: HuggingFaceInferenceEmbeddingsParams) {
        super(fields ?? {})

        this.model = fields?.model ?? 'sentence-transformers/distilbert-base-nli-mean-tokens'
        this.apiKey = fields?.apiKey ?? getEnvironmentVariable('HUGGINGFACEHUB_API_KEY')
        this.endpoint = fields?.endpoint ?? ''
        this.client = new HfInference(this.apiKey)
        if (this.endpoint) this.client.endpoint(this.endpoint)
    }

    async _embed(texts: string[]): Promise<number[][]> {
        // replace newlines, which can negatively affect performance.
        const clean = texts.map((text) => text.replace(/\n/g, ' '))
        const hf = new HfInference(this.apiKey)
        const obj: any = {
            inputs: clean
        }
        if (this.endpoint) {
            hf.endpoint(this.endpoint)
        } else {
            obj.model = this.model
        }

        const res = await this.caller.callWithOptions({}, hf.featureExtraction.bind(hf), obj)
        return res as number[][]
    }

    async embedQuery(document: string): Promise<number[]> {
        const res = await this._embed([document])
        return res[0]
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        return this._embed(documents)
    }
}
