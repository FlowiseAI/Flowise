import { HfInference } from '@huggingface/inference'
import { Embeddings, EmbeddingsParams } from 'langchain/embeddings/base'
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
        const obj: any = {
            inputs: clean
        }
        if (!this.endpoint) obj.model = this.model
        return this.caller.call(() => this.client.featureExtraction(obj)) as Promise<number[][]>
    }

    embedQuery(document: string): Promise<number[]> {
        return this._embed([document]).then((embeddings) => embeddings[0])
    }

    embedDocuments(documents: string[]): Promise<number[][]> {
        return this._embed(documents)
    }
}
