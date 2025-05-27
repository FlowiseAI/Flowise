import { flatten } from 'lodash'
import { createClient, SearchOptions } from 'redis'
import { Embeddings } from '@langchain/core/embeddings'
import { RedisVectorStore, RedisVectorStoreConfig } from '@langchain/community/vectorstores/redis'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { escapeSpecialChars, unEscapeSpecialChars } from './utils'

class Redis_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Redis'
        this.name = 'redis'
        this.version = 1.0
        this.description =
            'Upsert embedded data and perform similarity search upon query using Redis, an open source, in-memory data structure store'
        this.type = 'Redis'
        this.icon = 'redis.svg'
        this.category = 'Vector Stores'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['redisCacheUrlApi', 'redisCacheApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Index Name',
                name: 'indexName',
                placeholder: '<VECTOR_INDEX_NAME>',
                type: 'string'
            },
            {
                label: 'Replace Index on Upsert',
                name: 'replaceIndex',
                description: 'Selecting this option will delete the existing index and recreate a new one when upserting',
                default: false,
                type: 'boolean'
            },
            {
                label: 'Content Field',
                name: 'contentKey',
                description: 'Name of the field (column) that contains the actual content',
                type: 'string',
                default: 'content',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Metadata Field',
                name: 'metadataKey',
                description: 'Name of the field (column) that contains the metadata of the document',
                type: 'string',
                default: 'metadata',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Vector Field',
                name: 'vectorKey',
                description: 'Name of the field (column) that contains the vector',
                type: 'string',
                default: 'content_vector',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Redis Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Redis Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(RedisVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const indexName = nodeData.inputs?.indexName as string
            let contentKey = nodeData.inputs?.contentKey as string
            let metadataKey = nodeData.inputs?.metadataKey as string
            let vectorKey = nodeData.inputs?.vectorKey as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const replaceIndex = nodeData.inputs?.replaceIndex as boolean

            let redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)
            if (!redisUrl || redisUrl === '') {
                const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
                const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
                const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
                const host = getCredentialParam('redisCacheHost', credentialData, nodeData)

                redisUrl = 'redis://' + username + ':' + password + '@' + host + ':' + portStr
            }

            const docs = nodeData.inputs?.document as Document[]

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const document = new Document(flattenDocs[i])
                    finalDocs.push(document)
                }
            }

            try {
                const redisClient = createClient({
                    url: redisUrl,
                    socket: {
                        keepAlive:
                            process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                                ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                                : undefined
                    },
                    pingInterval:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined // Add Redis protocol-level pings
                })
                await redisClient.connect()

                const storeConfig: RedisVectorStoreConfig = {
                    redisClient: redisClient,
                    indexName: indexName
                }
                const isIndexExists = await checkIndexExists(redisClient, indexName)
                if (replaceIndex && isIndexExists) {
                    let response = await redisClient.ft.dropIndex(indexName)
                    if (process.env.DEBUG === 'true') {
                        // eslint-disable-next-line no-console
                        console.log(`Redis Vector Store :: Dropping index [${indexName}], Received Response [${response}]`)
                    }
                }
                const vectorStore = await RedisVectorStore.fromDocuments(finalDocs, embeddings, storeConfig)

                if (!contentKey || contentKey === '') contentKey = 'content'
                if (!metadataKey || metadataKey === '') metadataKey = 'metadata'
                if (!vectorKey || vectorKey === '') vectorKey = 'content_vector'

                // Avoid Illegal invocation error
                vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
                    return await similaritySearchVectorWithScore(
                        query,
                        k,
                        indexName,
                        metadataKey,
                        vectorKey,
                        contentKey,
                        redisClient,
                        filter
                    )
                }

                await redisClient.quit()

                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const indexName = nodeData.inputs?.indexName as string
        let contentKey = nodeData.inputs?.contentKey as string
        let metadataKey = nodeData.inputs?.metadataKey as string
        let vectorKey = nodeData.inputs?.vectorKey as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        let redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)
        if (!redisUrl || redisUrl === '') {
            const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
            const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
            const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
            const host = getCredentialParam('redisCacheHost', credentialData, nodeData)

            redisUrl = 'redis://' + username + ':' + password + '@' + host + ':' + portStr
        }

        const redisClient = createClient({
            url: redisUrl,
            socket: {
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined
            },
            pingInterval:
                process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                    ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                    : undefined // Add Redis protocol-level pings
        })

        const storeConfig: RedisVectorStoreConfig = {
            redisClient: redisClient,
            indexName: indexName
        }

        const vectorStore = new RedisVectorStore(embeddings, storeConfig)

        if (!contentKey || contentKey === '') contentKey = 'content'
        if (!metadataKey || metadataKey === '') metadataKey = 'metadata'
        if (!vectorKey || vectorKey === '') vectorKey = 'content_vector'

        // Avoid Illegal invocation error
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            await redisClient.connect()
            const results = await similaritySearchVectorWithScore(
                query,
                k,
                indexName,
                metadataKey,
                vectorKey,
                contentKey,
                redisClient,
                filter
            )
            await redisClient.quit()
            return results
        }

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

const checkIndexExists = async (redisClient: ReturnType<typeof createClient>, indexName: string) => {
    try {
        await redisClient.ft.info(indexName)
    } catch (err: any) {
        if (err?.message.includes('unknown command')) {
            throw new Error(
                'Failed to run FT.INFO command. Please ensure that you are running a RediSearch-capable Redis instance: https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/redis#setup'
            )
        }
        // index doesn't exist
        return false
    }

    return true
}

const buildQuery = (
    query: number[],
    k: number,
    metadataKey: string,
    vectorKey: string,
    contentKey: string,
    filter?: string[]
): [string, SearchOptions] => {
    const vectorScoreField = 'vector_score'

    let hybridFields = '*'
    // if a filter is set, modify the hybrid query
    if (filter && filter.length) {
        // `filter` is a list of strings, then it's applied using the OR operator in the metadata key
        hybridFields = `@${metadataKey}:(${filter.map(escapeSpecialChars).join('|')})`
    }

    const baseQuery = `${hybridFields} => [KNN ${k} @${vectorKey} $vector AS ${vectorScoreField}]`
    const returnFields = [metadataKey, contentKey, vectorScoreField]

    const options: SearchOptions = {
        PARAMS: {
            vector: Buffer.from(new Float32Array(query).buffer)
        },
        RETURN: returnFields,
        SORTBY: vectorScoreField,
        DIALECT: 2,
        LIMIT: {
            from: 0,
            size: k
        }
    }

    return [baseQuery, options]
}

const similaritySearchVectorWithScore = async (
    query: number[],
    k: number,
    indexName: string,
    metadataKey: string,
    vectorKey: string,
    contentKey: string,
    redisClient: ReturnType<typeof createClient>,
    filter?: string[]
): Promise<[Document, number][]> => {
    const results = await redisClient.ft.search(indexName, ...buildQuery(query, k, metadataKey, vectorKey, contentKey, filter))
    const result: [Document, number][] = []

    if (results.total) {
        for (const res of results.documents) {
            if (res.value) {
                const document = res.value
                if (document.vector_score) {
                    const metadataString = unEscapeSpecialChars(document[metadataKey] as string)
                    result.push([
                        new Document({
                            pageContent: document[contentKey] as string,
                            metadata: JSON.parse(metadataString)
                        }),
                        Number(document.vector_score)
                    ])
                }
            }
        }
    }
    return result
}

module.exports = { nodeClass: Redis_VectorStores }
