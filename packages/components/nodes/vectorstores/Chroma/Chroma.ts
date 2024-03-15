import { flatten } from 'lodash'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChromaExtended } from './core'

class Chroma_VectorStores implements INode {
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
        this.label = 'Chroma'
        this.name = 'chroma'
        this.version = 1.0
        this.type = 'Chroma'
        this.icon = 'chroma.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity search upon query using Chroma, an open-source embedding database'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed if you have chroma on cloud services with X-Api-key',
            optional: true,
            credentialNames: ['chromaApi']
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
                label: 'Collection Name',
                name: 'collectionName',
                type: 'string'
            },
            {
                label: 'Chroma URL',
                name: 'chromaURL',
                type: 'string',
                optional: true
            },
            {
                label: 'Chroma Metadata Filter',
                name: 'chromaMetadataFilter',
                type: 'json',
                optional: true,
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
                label: 'Chroma Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Chroma Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Chroma)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const collectionName = nodeData.inputs?.collectionName as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const chromaURL = nodeData.inputs?.chromaURL as string

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const chromaApiKey = getCredentialParam('chromaApiKey', credentialData, nodeData)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const obj: {
                collectionName: string
                url?: string
                chromaApiKey?: string
            } = { collectionName }
            if (chromaURL) obj.url = chromaURL
            if (chromaApiKey) obj.chromaApiKey = chromaApiKey

            try {
                await ChromaExtended.fromDocuments(finalDocs, embeddings, obj)
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const collectionName = nodeData.inputs?.collectionName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const chromaURL = nodeData.inputs?.chromaURL as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const chromaApiKey = getCredentialParam('chromaApiKey', credentialData, nodeData)

        const chromaMetadataFilter = nodeData.inputs?.chromaMetadataFilter

        const obj: {
            collectionName: string
            url?: string
            chromaApiKey?: string
            filter?: object | undefined
        } = { collectionName }
        if (chromaURL) obj.url = chromaURL
        if (chromaApiKey) obj.chromaApiKey = chromaApiKey
        if (chromaMetadataFilter) {
            const metadatafilter = typeof chromaMetadataFilter === 'object' ? chromaMetadataFilter : JSON.parse(chromaMetadataFilter)
            obj.filter = metadatafilter
        }

        const vectorStore = await ChromaExtended.fromExistingCollection(embeddings, obj)

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

module.exports = { nodeClass: Chroma_VectorStores }
