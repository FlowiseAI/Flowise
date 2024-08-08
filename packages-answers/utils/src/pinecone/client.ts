import { PineconeClient as PC } from '@pinecone-database/pinecone'

import chunkArray from '../utilities/chunkArray'
import getAxiosErrorMessage from '../utilities/getAxiosErrorMessage'

import type { UpsertRequest } from '@pinecone-database/pinecone'

const PINECONE_INDEX_NAMESPACE = process.env.PINECONE_INDEX_NAMESPACE

class PineconeClient {
    client: PC
    apiKey: any
    environment: any
    namespace: any
    indexName: any
    index: undefined

    constructor(config: { namespace: any; indexName: any; apiKey?: any; environment?: any }) {
        const apiKey = config.apiKey || process.env.PINECONE_API_KEY
        const environment = config.environment || process.env.PINECONE_ENVIRONMENT

        if (!apiKey) {
            throw new Error('Missing Pinecone API key. Please provide one in the config or set the PINECONE_API_KEY environment variable.')
        }

        if (!environment) {
            throw new Error(
                'Missing Pinecone environment. Please provide one in the config or set the PINECONE_ENVIRONMENT environment variable.'
            )
        }

        // Create a client
        this.client = new PC()

        this.apiKey = apiKey
        this.environment = environment
        this.namespace = config.namespace
        this.indexName = config.indexName
        this.index = undefined
        this.init()
    }

    async init() {
        await this.client.init({
            apiKey: this.apiKey,
            environment: this.environment
        })
    }

    async deleteIndex(index: { delete1: (arg0: never[], arg1: boolean, arg2: any) => any }) {
        return index.delete1([], true, this.namespace)
    }

    async deleteIndexByName(indexName = this.indexName) {
        const index = this.client.Index(indexName)
        return index.delete1([], true, this.namespace)
    }

    async writeVectorToIndex(vector: any) {
        const timerName = `[writeVectorToIndex] @ ${Date.now()}`
        try {
            console.time(timerName)
            await this.init()
            const index = this.client.Index(this.indexName)
            //TODO: Remove after testing
            // await this.deleteIndex(index);

            const upsertRequest: UpsertRequest = {
                vectors: [vector],
                namespace: this.namespace
            }

            //@ts-ignore-next-line
            await index.upsert({ upsertRequest })
        } catch (error: unknown) {
            let message = getAxiosErrorMessage(error)
            throw new Error(`[Error in writeVectorToIndex] ${message}`)
        } finally {
            console.timeEnd(timerName)
        }
    }

    async writeVectorsToIndex(vectors: any[], organizationId?: string) {
        try {
            await this.init()

            const index = this.client.Index(this.indexName)
            const namespace = organizationId ? `org-${organizationId}` : PINECONE_INDEX_NAMESPACE
            //TODO: Remove after testing
            // await this.deleteIndex(index);
            // console.log('Vector', vectors[0]);
            //TODO add checks for token size and chunk efficiently
            const chunks = chunkArray(vectors, 100)
            const results = await Promise.all(
                chunks.map(async (chunkedVectors) => {
                    const upsertRequest = {
                        vectors: chunkedVectors,
                        namespace
                    }
                    try {
                        await index.upsert(upsertRequest)
                    } catch (error: unknown) {
                        let message = getAxiosErrorMessage(error)
                        return { error: `[Error in writeVectorsToIndex] ${message}` }
                    }
                })
            )

            const errors = results.filter((result) => !!result?.error)

            if (errors?.length) {
                // TODO - handle errors
                throw errors[0]
            }
        } catch (error: unknown) {
            let message = getAxiosErrorMessage(error)
            return { error: `[Error in writeVectorsToIndex] ${message}` }
        }
    }
}

export default PineconeClient
