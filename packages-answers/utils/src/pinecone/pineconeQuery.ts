import { PineconeClient, QueryRequest } from '@pinecone-database/pinecone'

export const pinecone = new PineconeClient()

export const pineconeQuery = async (
    embeddings: number[],
    { filter, topK = 20, namespace = process.env.PINECONE_INDEX_NAMESPACE }: { filter?: any; topK?: number; namespace?: string }
) => {
    const ts = `${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const queryStr = JSON.stringify({ filter, topK, namespace })

    // TODO: Use metadata inferred from the question
    try {
        console.time(`[${ts}] PineconeQuery ${queryStr}`)
        await pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT!,
            apiKey: process.env.PINECONE_API_KEY!
        })

        const queryRequest: QueryRequest = {
            vector: embeddings,
            topK,
            filter,
            includeMetadata: true,
            namespace
        }

        const pinconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
        //@ts-ignore-next-line
        const result = await pinconeIndex.query(queryRequest)

        console.timeEnd(`[${ts}] PineconeQuery ${queryStr}`)

        return result?.data
    } catch (error) {
        console.timeEnd(`[${ts}] PineconeQuery ${queryStr}`)
        throw error
    }
}
