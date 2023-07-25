import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'
import { SingleStoreVectorStore, SingleStoreVectorStoreConfig } from 'langchain/vectorstores/singlestore'

class SingleStoreExisting_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'SingleStore Load Existing Table'
        this.name = 'singlestoreExisting'
        this.type = 'SingleStore'
        this.icon = 'singlestore.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing document from SingleStore'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Host',
                name: 'host',
                type: 'string'
            },
            {
                label: 'User',
                name: 'user',
                type: 'string'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'string'
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string',
                placeholder: 'embeddings',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Content Column Name',
                name: 'contentColumnName',
                type: 'string',
                placeholder: 'content',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Vector Column Name',
                name: 'vectorColumnName',
                type: 'string',
                placeholder: 'vector',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Metadata Column Name',
                name: 'metadataColumnName',
                type: 'string',
                placeholder: 'metadata',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'SingleStore Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'SingleStore Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(SingleStoreVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const singleStoreConnectionConfig = {
            connectionOptions: {
                host: nodeData.inputs?.host as string,
                port: 3306,
                user: nodeData.inputs?.user as string,
                password: nodeData.inputs?.password as string,
                database: nodeData.inputs?.database as string
            },
            ...(nodeData.inputs?.tableName ? { tableName: nodeData.inputs.tableName as string } : {}),
            ...(nodeData.inputs?.contentColumnName ? { contentColumnName: nodeData.inputs.contentColumnName as string } : {}),
            ...(nodeData.inputs?.vectorColumnName ? { vectorColumnName: nodeData.inputs.vectorColumnName as string } : {}),
            ...(nodeData.inputs?.metadataColumnName ? { metadataColumnName: nodeData.inputs.metadataColumnName as string } : {})
        } as SingleStoreVectorStoreConfig

        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        let vectorStore: SingleStoreVectorStore

        vectorStore = new SingleStoreVectorStore(embeddings, singleStoreConnectionConfig)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: SingleStoreExisting_VectorStores }
