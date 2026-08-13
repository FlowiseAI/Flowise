import axios from 'axios'
import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings'

const TWELVELABS_API_BASE = 'https://api.twelvelabs.io/v1.3'

export interface TwelveLabsEmbeddingsParams extends EmbeddingsParams {
    apiKey?: string
    model?: string
    baseUrl?: string
}

interface EmbedSegment {
    float?: number[]
}

interface EmbedResponse {
    text_embedding?: {
        segments?: EmbedSegment[]
    }
}

/**
 * TwelveLabs Marengo embeddings. Marengo generates multimodal embeddings (video,
 * image, audio and text) in a shared 512-dimensional latent space, which is what
 * makes any-to-any semantic search across modalities possible. This class exposes
 * the text side of that model so it can be used as a standard LangChain embedder
 * (e.g. to embed text queries against video embeddings stored in a vector store).
 *
 * Uses the multipart `/embed` REST endpoint directly via axios (already a
 * dependency) rather than pulling in the full TwelveLabs SDK.
 */
export class TwelveLabsEmbeddings extends Embeddings implements TwelveLabsEmbeddingsParams {
    apiKey?: string

    model: string

    baseUrl: string

    constructor(fields?: TwelveLabsEmbeddingsParams) {
        super(fields ?? {})
        this.model = fields?.model ?? 'marengo3.0'
        this.apiKey = fields?.apiKey
        this.baseUrl = fields?.baseUrl || TWELVELABS_API_BASE
    }

    private async embedText(text: string): Promise<number[]> {
        if (!this.apiKey) {
            throw new Error('TwelveLabs API key is required')
        }

        const form = new FormData()
        form.append('model_name', this.model)
        form.append('text', text.replace(/\n/g, ' '))

        const response = await this.caller.call(async () => {
            const res = await axios.post<EmbedResponse>(`${this.baseUrl}/embed`, form, {
                headers: { 'x-api-key': this.apiKey as string }
            })
            return res.data
        })

        const segments = response?.text_embedding?.segments
        if (!segments?.length || !segments[0].float?.length) {
            throw new Error('TwelveLabs did not return a text embedding')
        }
        return segments[0].float
    }

    async embedQuery(document: string): Promise<number[]> {
        return this.embedText(document)
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const embeddings: number[][] = []
        for (const document of documents) {
            embeddings.push(await this.embedText(document))
        }
        return embeddings
    }
}
