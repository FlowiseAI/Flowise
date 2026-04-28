import { MongoClient, type Document as MongoDBDocument } from 'mongodb'
import { MaxMarginalRelevanceSearchOptions, VectorStore } from '@langchain/core/vectorstores'
import type { EmbeddingsInterface } from '@langchain/core/embeddings'
import { chunkArray } from '@langchain/core/utils/chunk_array'
import { Document } from '@langchain/core/documents'
import { maximalMarginalRelevance } from '@langchain/core/utils/math'
import { AsyncCaller, AsyncCallerParams } from '@langchain/core/utils/async_caller'
import { getVersion } from '../../../src/utils'

export interface MongoDBAtlasVectorSearchLibArgs extends AsyncCallerParams {
    readonly connectionDetails: {
        readonly mongoDBConnectUrl: string
        readonly databaseName: string
        readonly collectionName: string
    }
    readonly indexName?: string
    readonly textKey?: string
    readonly embeddingKey?: string
    readonly primaryKey?: string
}

type MongoDBAtlasFilter = {
    preFilter?: MongoDBDocument
    postFilterPipeline?: MongoDBDocument[]
    includeEmbeddings?: boolean
} & MongoDBDocument

export class MongoDBAtlasVectorSearch extends VectorStore {
    declare FilterType: MongoDBAtlasFilter

    private readonly connectionDetails: {
        readonly mongoDBConnectUrl: string
        readonly databaseName: string
        readonly collectionName: string
    }

    private readonly indexName: string

    private readonly textKey: string

    private readonly embeddingKey: string

    private readonly primaryKey: string

    private caller: AsyncCaller

    _vectorstoreType(): string {
        return 'mongodb_atlas'
    }

    constructor(embeddings: EmbeddingsInterface, args: MongoDBAtlasVectorSearchLibArgs) {
        super(embeddings, args)
        this.connectionDetails = args.connectionDetails
        this.indexName = args.indexName ?? 'default'
        this.textKey = args.textKey ?? 'text'
        this.embeddingKey = args.embeddingKey ?? 'embedding'
        this.primaryKey = args.primaryKey ?? '_id'
        this.caller = new AsyncCaller(args)
    }

    async getClient() {
        const driverInfo = { name: 'Flowise', version: (await getVersion()).version }
        const mongoClient = new MongoClient(this.connectionDetails.mongoDBConnectUrl, { driverInfo })
        return mongoClient
    }

    async closeConnection(client: MongoClient) {
        await client.close()
    }

    async addVectors(vectors: number[][], documents: Document[], options?: { ids?: string[] }) {
        const client = await this.getClient()
        const collection = client.db(this.connectionDetails.databaseName).collection(this.connectionDetails.collectionName)
        const docs = vectors.map((embedding, idx) => ({
            [this.textKey]: documents[idx].pageContent,
            [this.embeddingKey]: embedding,
            ...documents[idx].metadata
        }))
        if (options?.ids === undefined) {
            await collection.insertMany(docs)
        } else {
            if (options.ids.length !== vectors.length) {
                throw new Error(`If provided, "options.ids" must be an array with the same length as "vectors".`)
            }
            const { ids } = options
            for (let i = 0; i < docs.length; i += 1) {
                await this.caller.call(async () => {
                    await collection.updateOne(
                        { [this.primaryKey]: ids[i] },
                        { $set: { [this.primaryKey]: ids[i], ...docs[i] } },
                        { upsert: true }
                    )
                })
            }
        }
        await this.closeConnection(client)
        return options?.ids ?? docs.map((doc) => doc[this.primaryKey])
    }

    async addDocuments(documents: Document[], options?: { ids?: string[] }) {
        const texts = documents.map(({ pageContent }) => pageContent)
        return this.addVectors(await this.embeddings.embedDocuments(texts), documents, options)
    }

    async similaritySearchVectorWithScore(query: number[], k: number, filter?: MongoDBAtlasFilter): Promise<[Document, number][]> {
        const client = await this.getClient()
        const collection = client.db(this.connectionDetails.databaseName).collection(this.connectionDetails.collectionName)

        const postFilterPipeline = filter?.postFilterPipeline ?? []
        const preFilter: MongoDBDocument | undefined =
            filter?.preFilter || filter?.postFilterPipeline || filter?.includeEmbeddings ? filter.preFilter : filter
        const removeEmbeddingsPipeline = !filter?.includeEmbeddings
            ? [
                  {
                      $project: {
                          [this.embeddingKey]: 0
                      }
                  }
              ]
            : []

        const pipeline: MongoDBDocument[] = [
            {
                $vectorSearch: {
                    queryVector: this.fixArrayPrecision(query),
                    index: this.indexName,
                    path: this.embeddingKey,
                    limit: k,
                    numCandidates: 10 * k,
                    ...(preFilter && { filter: preFilter })
                }
            },
            {
                $set: {
                    score: { $meta: 'vectorSearchScore' }
                }
            },
            ...removeEmbeddingsPipeline,
            ...postFilterPipeline
        ]

        const results = await collection
            .aggregate(pipeline)
            .map<[Document, number]>((result) => {
                const { score, [this.textKey]: text, ...metadata } = result
                return [new Document({ pageContent: text, metadata }), score]
            })
            .toArray()

        await this.closeConnection(client)

        return results
    }

    async maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this['FilterType']>): Promise<Document[]> {
        const { k, fetchK = 20, lambda = 0.5, filter } = options

        const queryEmbedding = await this.embeddings.embedQuery(query)

        // preserve the original value of includeEmbeddings
        const includeEmbeddingsFlag = options.filter?.includeEmbeddings || false

        // update filter to include embeddings, as they will be used in MMR
        const includeEmbeddingsFilter = {
            ...filter,
            includeEmbeddings: true
        }

        const resultDocs = await this.similaritySearchVectorWithScore(
            this.fixArrayPrecision(queryEmbedding),
            fetchK,
            includeEmbeddingsFilter
        )

        const embeddingList = resultDocs.map((doc) => doc[0].metadata[this.embeddingKey])

        const mmrIndexes = maximalMarginalRelevance(queryEmbedding, embeddingList, lambda, k)

        return mmrIndexes.map((idx) => {
            const doc = resultDocs[idx][0]

            // remove embeddings if they were not requested originally
            if (!includeEmbeddingsFlag) {
                delete doc.metadata[this.embeddingKey]
            }
            return doc
        })
    }

    async delete(params: { ids: any[] }): Promise<void> {
        const client = await this.getClient()
        const collection = client.db(this.connectionDetails.databaseName).collection(this.connectionDetails.collectionName)
        const CHUNK_SIZE = 50
        const chunkIds: any[][] = chunkArray(params.ids, CHUNK_SIZE)
        for (const chunk of chunkIds) {
            await collection.deleteMany({ _id: { $in: chunk } })
        }
        await this.closeConnection(client)
    }

    static async fromTexts(
        texts: string[],
        metadatas: object[] | object,
        embeddings: EmbeddingsInterface,
        dbConfig: MongoDBAtlasVectorSearchLibArgs & { ids?: string[] }
    ): Promise<MongoDBAtlasVectorSearch> {
        const docs: Document[] = []
        for (let i = 0; i < texts.length; i += 1) {
            const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas
            const newDoc = new Document({
                pageContent: texts[i],
                metadata
            })
            docs.push(newDoc)
        }
        return MongoDBAtlasVectorSearch.fromDocuments(docs, embeddings, dbConfig)
    }

    static async fromDocuments(
        docs: Document[],
        embeddings: EmbeddingsInterface,
        dbConfig: MongoDBAtlasVectorSearchLibArgs & { ids?: string[] }
    ): Promise<MongoDBAtlasVectorSearch> {
        const instance = new this(embeddings, dbConfig)
        await instance.addDocuments(docs, { ids: dbConfig.ids })
        return instance
    }

    fixArrayPrecision(array: number[]) {
        return array.map((value) => {
            if (Number.isInteger(value)) {
                return value + 0.000000000000001
            }
            return value
        })
    }
}
