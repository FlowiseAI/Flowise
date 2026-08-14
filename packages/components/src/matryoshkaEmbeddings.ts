import { EmbeddingsInterface } from '@langchain/core/embeddings'

export const MATRYOSHKA_TRUNCATE_DIMENSIONS = 'matryoshkaTruncateDimensions'

const parseTruncateDimension = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined

    const dimension = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(dimension) || dimension <= 0) {
        throw new Error('Matryoshka truncate dimension must be a positive integer')
    }

    return dimension
}

const truncateVector = (vector: number[], dimension: number): number[] => vector.slice(0, dimension)

export const applyMatryoshkaTruncation = <T extends EmbeddingsInterface<number[]>>(embeddings: T, truncateDimensions: unknown): T => {
    const dimension = parseTruncateDimension(truncateDimensions)
    if (!dimension) return embeddings

    const wrappedEmbeddings = Object.create(embeddings) as T

    wrappedEmbeddings.embedDocuments = async (documents: string[]): Promise<number[][]> => {
        const vectors = await embeddings.embedDocuments(documents)
        return vectors.map((vector) => truncateVector(vector, dimension))
    }

    wrappedEmbeddings.embedQuery = async (document: string): Promise<number[]> => {
        const vector = await embeddings.embedQuery(document)
        return truncateVector(vector, dimension)
    }

    return wrappedEmbeddings
}
