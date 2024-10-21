import { flatten } from 'lodash'
import { Embeddings } from '@langchain/core/embeddings'
import { SingleStoreVectorStore, SingleStoreVectorStoreConfig } from '@langchain/community/vectorstores/singlestore'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class SingleStore_VectorStores implements INode {
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
        this.label = 'SingleStore'
        this.name = 'singlestore'
        this.version = 1.0
        this.type = 'SingleStore'
        this.icon = 'singlestore.svg'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity search upon query using SingleStore, a fast and distributed cloud relational database'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Needed when using SingleStore cloud hosted',
            optional: true,
            credentialNames: ['singleStoreApi']
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
                label: 'Host',
                name: 'host',
                type: 'string'
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

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const user = getCredentialParam('user', credentialData, nodeData)
            const password = getCredentialParam('password', credentialData, nodeData)

            const singleStoreConnectionConfig = {
                connectionOptions: {
                    host: nodeData.inputs?.host as string,
                    port: 3306,
                    user,
                    password,
                    database: nodeData.inputs?.database as string
                },
                ...(nodeData.inputs?.tableName ? { tableName: nodeData.inputs.tableName as string } : {}),
                ...(nodeData.inputs?.contentColumnName ? { contentColumnName: nodeData.inputs.contentColumnName as string } : {}),
                ...(nodeData.inputs?.vectorColumnName ? { vectorColumnName: nodeData.inputs.vectorColumnName as string } : {}),
                ...(nodeData.inputs?.metadataColumnName ? { metadataColumnName: nodeData.inputs.metadataColumnName as string } : {})
            } as SingleStoreVectorStoreConfig

            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                const vectorStore = new SingleStoreVectorStore(embeddings, singleStoreConnectionConfig)
                vectorStore.addDocuments.bind(vectorStore)(finalDocs)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)

        const singleStoreConnectionConfig = {
            connectionOptions: {
                host: nodeData.inputs?.host as string,
                port: 3306,
                user,
                password,
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

        const vectorStore = new SingleStoreVectorStore(embeddings, singleStoreConnectionConfig)

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

module.exports = { nodeClass: SingleStore_VectorStores }
