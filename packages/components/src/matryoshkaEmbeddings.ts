import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings'

/**
 * Truncates an embedding vector to the specified number of dimensions.
 * Used for Matryoshka embedding models where the most important information
 * is concentrated in the first dimensions of the vector.
 */
function truncateVector(vector: number[], dimensions: number): number[] {
    return vector.slice(0, dimensions)
}

export interface MatryoshkaEmbeddingsParams extends EmbeddingsParams {
    /** The underlying embeddings instance to wrap */
    embeddings: Embeddings
    /** The target number of dimensions to truncate to */
    dimensions: number
}

/**
 * Wrapper around any Embeddings instance that truncates the output vectors
 * to a specified number of dimensions. This enables Matryoshka embedding
 * support for models that produce embeddings where the most significant
 * information is stored in the first dimensions of the vector.
 *
 * @see https://huggingface.co/blog/matryoshka
 */
export class MatryoshkaEmbeddings extends Embeddings {
    private embeddings: Embeddings
    private dimensions: number

    constructor(params: MatryoshkaEmbeddingsParams) {
        super(params)
        this.embeddings = params.embeddings
        this.dimensions = params.dimensions
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const vectors = await this.embeddings.embedDocuments(texts)
        return vectors.map((vector) => truncateVector(vector, this.dimensions))
    }

    async embedQuery(text: string): Promise<number[]> {
        const vector = await this.embeddings.embedQuery(text)
        return truncateVector(vector, this.dimensions)
    }
}
