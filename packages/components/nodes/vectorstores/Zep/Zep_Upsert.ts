import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ZepVectorStore, IZepConfig } from 'langchain/vectorstores/zep'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { flatten } from 'lodash'

class Zep_Upsert_VectorStores implements INode {
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

    constructor() {
        this.label = 'Zep Upsert Document'
        this.name = 'zepUpsert'
        this.version = 1.0
        this.type = 'Zep'
        this.icon = 'zep.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Zep'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Configure JWT authentication on your Zep instance (Optional)',
            credentialNames: ['zepMemoryApi']
        }
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
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                default: 'http://127.0.0.1:8000'
            },
            {
                label: 'Zep Collection',
                name: 'zepCollection',
                type: 'string',
                placeholder: 'my-first-collection'
            },
            {
                label: 'Embedding Dimension',
                name: 'dimension',
                type: 'number',
                default: 1536,
                additionalParams: true
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
                label: 'Zep Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Zep Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(ZepVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseURL = nodeData.inputs?.baseURL as string
        const zepCollection = nodeData.inputs?.zepCollection as string
        const dimension = (nodeData.inputs?.dimension as number) ?? 1536
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const zepConfig: IZepConfig = {
            apiUrl: baseURL,
            collectionName: zepCollection,
            embeddingDimensions: dimension,
            isAutoEmbedded: false
        }
        if (apiKey) zepConfig.apiKey = apiKey

        const vectorStore = await ZepVectorStore.fromDocuments(finalDocs, embeddings, zepConfig)

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

module.exports = { nodeClass: Zep_Upsert_VectorStores }
