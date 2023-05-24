import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Milvus, MilvusLibArgs } from 'langchain/vectorstores/milvus'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'
import { Document } from 'langchain/document'

class Milvus_Upsert_VectorStores implements INode {
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
        this.label = 'Milvus Upsert Document'
        this.name = 'milvusUpsert'
        this.type = 'Milvus'
        this.icon = 'milvus.jpg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Milvus'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Collection Name',
                name: 'milvusCollectionName',
                type: 'string',
                placeholder: 'my_milvus_collection'
            },
            {
                label: 'Milvus URL',
                name: 'milvusURL',
                type: 'string',
                placeholder: 'http://localhost:19530'
            },
            {
                label: 'Primary Field',
                name: 'milvusPrimaryField',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Vector Field',
                name: 'milvusVectorField',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Vector Text Field',
                name: 'milvusTextField',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'SSL',
                name: 'milvusSSL',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Username',
                name: 'milvusUsername',
                type: 'string',
                placeholder: 'db_admin',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Password',
                name: 'milvusPassword',
                type: 'password',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Milvus Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Milvus Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Milvus)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const collectionName = nodeData.inputs?.milvusCollectionName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const milvusURL = nodeData.inputs?.milvusURL as string
        const milvusPrimaryField = nodeData.inputs?.milvusPrimaryField as string
        const milvusVectorField = nodeData.inputs?.milvusVectorField as string
        const milvusTextField = nodeData.inputs?.milvusTextField as string
        const milvusSSL = nodeData.inputs?.milvusSSL as boolean
        const milvusUsername = nodeData.inputs?.milvusUsername as string
        const milvusPassword = nodeData.inputs?.milvusPassword as string
        const output = nodeData.outputs?.output as string
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? docs.flat() : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const obj: MilvusLibArgs = { collectionName, url: milvusURL }
        if (milvusPrimaryField) obj.primaryField = milvusPrimaryField
        if (milvusVectorField) obj.vectorField = milvusVectorField
        if (milvusTextField) obj.textField = milvusTextField
        if (milvusSSL) obj.ssl = milvusSSL
        if (milvusUsername) obj.username = milvusUsername
        if (milvusPassword) obj.password = milvusPassword

        const vectorStore = await Milvus.fromDocuments(finalDocs, embeddings, obj)
        console.log('vectorStore = ', vectorStore)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever()
            return retriever
        } else if (output === 'vectorStore') {
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: Milvus_Upsert_VectorStores }
