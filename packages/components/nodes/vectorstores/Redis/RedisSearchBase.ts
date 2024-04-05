import { createClient, SearchOptions, RedisClientOptions } from 'redis'
import { isEqual } from 'lodash'
import { Embeddings } from '@langchain/core/embeddings'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { RedisVectorStore } from '@langchain/community/vectorstores/redis'
import { escapeSpecialChars, unEscapeSpecialChars } from './utils'
import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'

let redisClientSingleton: ReturnType<typeof createClient>
let redisClientOption: RedisClientOptions

const getRedisClient = async (option: RedisClientOptions) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = createClient(option)
        await redisClientSingleton.connect()
        redisClientOption = option
        return redisClientSingleton
    } else if (redisClientSingleton && !isEqual(option, redisClientOption)) {
        // if client exists but option changed
        redisClientSingleton.quit()
        redisClientSingleton = createClient(option)
        await redisClientSingleton.connect()
        redisClientOption = option
        return redisClientSingleton
    }
    return redisClientSingleton
}

export abstract class RedisSearchBase {
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
    redisClient: ReturnType<typeof createClient>

    protected constructor() {
        this.type = 'Redis'
        this.icon = 'redis.svg'
        this.category = 'Vector Stores'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'DEPRECATING'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['redisCacheUrlApi', 'redisCacheApi']
        }
        this.inputs = [
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
                label: 'Replace Index?',
                name: 'replaceIndex',
                description: 'Selecting this option will delete the existing index and recreate a new one',
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

    abstract constructVectorStore(
        embeddings: Embeddings,
        indexName: string,
        replaceIndex: boolean,
        docs: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore>

    async init(nodeData: INodeData, _: string, options: ICommonObject, docs: Document<Record<string, any>>[] | undefined): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const indexName = nodeData.inputs?.indexName as string
        let contentKey = nodeData.inputs?.contentKey as string
        let metadataKey = nodeData.inputs?.metadataKey as string
        let vectorKey = nodeData.inputs?.vectorKey as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const replaceIndex = nodeData.inputs?.replaceIndex as boolean
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

        this.redisClient = await getRedisClient({ url: redisUrl })

        const vectorStore = await this.constructVectorStore(embeddings, indexName, replaceIndex, docs)
        if (!contentKey || contentKey === '') contentKey = 'content'
        if (!metadataKey || metadataKey === '') metadataKey = 'metadata'
        if (!vectorKey || vectorKey === '') vectorKey = 'content_vector'

        const buildQuery = (query: number[], k: number, filter?: string[]): [string, SearchOptions] => {
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

        vectorStore.similaritySearchVectorWithScore = async (
            query: number[],
            k: number,
            filter?: string[]
        ): Promise<[Document, number][]> => {
            const results = await this.redisClient.ft.search(indexName, ...buildQuery(query, k, filter))
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

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}
