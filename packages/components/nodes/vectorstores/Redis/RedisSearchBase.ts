import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'

import { Embeddings } from 'langchain/embeddings/base'
import { VectorStore } from 'langchain/vectorstores/base'
import { Document } from 'langchain/document'
import { createClient } from 'redis'
import { RedisVectorStore } from 'langchain/vectorstores/redis'

export abstract class RedisSearchBase {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
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
        docs: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore>

    async init(nodeData: INodeData, _: string, options: ICommonObject, docs: Document<Record<string, any>>[] | undefined): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const indexName = nodeData.inputs?.indexName as string
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

        this.redisClient = createClient({ url: redisUrl })
        await this.redisClient.connect()

        const vectorStore = await this.constructVectorStore(embeddings, indexName, docs)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}
