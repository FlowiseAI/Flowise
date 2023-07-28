import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { PineconeClient } from '@pinecone-database/pinecone'
import { PineconeLibArgs, PineconeStore } from 'langchain/vectorstores/pinecone'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { flatten } from 'lodash'

class PineconeUpsert_VectorStores implements INode {
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
        this.label = 'Pinecone Upsert Document'
        this.name = 'pineconeUpsert'
        this.version = 1.0
        this.type = 'Pinecone'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Pinecone'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pineconeApi']
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
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Pinecone Namespace',
                name: 'pineconeNamespace',
                type: 'string',
                placeholder: 'my-first-namespace',
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
                label: 'Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Pinecone Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PineconeStore)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const index = nodeData.inputs?.pineconeIndex as string
        const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)
        const pineconeEnv = getCredentialParam('pineconeEnv', credentialData, nodeData)

        const client = new PineconeClient()
        await client.init({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const pineconeIndex = client.Index(index)

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const obj: PineconeLibArgs = {
            pineconeIndex
        }

        if (pineconeNamespace) obj.namespace = pineconeNamespace

        const vectorStore = await PineconeStore.fromDocuments(finalDocs, embeddings, obj)

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

module.exports = { nodeClass: PineconeUpsert_VectorStores }
