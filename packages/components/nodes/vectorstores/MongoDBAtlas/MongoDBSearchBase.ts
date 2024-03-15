import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'
import { Embeddings } from '@langchain/core/embeddings'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas'
import { Collection, MongoClient } from 'mongodb'

export abstract class MongoDBSearchBase {
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
    mongoClient: MongoClient

    protected constructor() {
        this.type = 'MongoDB Atlas'
        this.icon = 'mongodb.svg'
        this.category = 'Vector Stores'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'DEPRECATING'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mongoDBUrlApi']
        }
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Database',
                name: 'databaseName',
                placeholder: '<DB_NAME>',
                type: 'string'
            },
            {
                label: 'Collection Name',
                name: 'collectionName',
                placeholder: '<COLLECTION_NAME>',
                type: 'string'
            },
            {
                label: 'Index Name',
                name: 'indexName',
                placeholder: '<VECTOR_INDEX_NAME>',
                type: 'string'
            },
            {
                label: 'Content Field',
                name: 'textKey',
                description: 'Name of the field (column) that contains the actual content',
                type: 'string',
                default: 'text',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Embedded Field',
                name: 'embeddingKey',
                description: 'Name of the field (column) that contains the Embedding',
                type: 'string',
                default: 'embedding',
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
                label: 'MongoDB Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'MongoDB Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(MongoDBAtlasVectorSearch)]
            }
        ]
    }

    abstract constructVectorStore(
        embeddings: Embeddings,
        collection: Collection,
        indexName: string,
        textKey: string,
        embeddingKey: string,
        docs: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore>

    async init(nodeData: INodeData, _: string, options: ICommonObject, docs: Document<Record<string, any>>[] | undefined): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const databaseName = nodeData.inputs?.databaseName as string
        const collectionName = nodeData.inputs?.collectionName as string
        const indexName = nodeData.inputs?.indexName as string
        let textKey = nodeData.inputs?.textKey as string
        let embeddingKey = nodeData.inputs?.embeddingKey as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        let mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

        this.mongoClient = new MongoClient(mongoDBConnectUrl)
        const collection = this.mongoClient.db(databaseName).collection(collectionName)
        if (!textKey || textKey === '') textKey = 'text'
        if (!embeddingKey || embeddingKey === '') embeddingKey = 'embedding'
        const vectorStore = await this.constructVectorStore(embeddings, collection, indexName, textKey, embeddingKey, docs)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}
