import { flatten } from 'lodash'
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client'
import { WeaviateLibArgs, WeaviateStore } from 'langchain/vectorstores/weaviate'
import { Document } from 'langchain/document'
import { Embeddings } from 'langchain/embeddings/base'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Weaviate_VectorStores implements INode {
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
        this.label = 'Weaviate'
        this.name = 'weaviate'
        this.version = 1.0
        this.type = 'Weaviate'
        this.icon = 'weaviate.png'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity search upon query using Weaviate, a scalable open-source vector database'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed when using Weaviate cloud hosted',
            optional: true,
            credentialNames: ['weaviateApi']
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
                label: 'Weaviate Scheme',
                name: 'weaviateScheme',
                type: 'options',
                default: 'https',
                options: [
                    {
                        label: 'https',
                        name: 'https'
                    },
                    {
                        label: 'http',
                        name: 'http'
                    }
                ]
            },
            {
                label: 'Weaviate Host',
                name: 'weaviateHost',
                type: 'string',
                placeholder: 'localhost:8080'
            },
            {
                label: 'Weaviate Index',
                name: 'weaviateIndex',
                type: 'string',
                placeholder: 'Test'
            },
            {
                label: 'Weaviate Text Key',
                name: 'weaviateTextKey',
                type: 'string',
                placeholder: 'text',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Weaviate Metadata Keys',
                name: 'weaviateMetadataKeys',
                type: 'string',
                rows: 4,
                placeholder: `["foo"]`,
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
                label: 'Weaviate Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Weaviate Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(WeaviateStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const weaviateScheme = nodeData.inputs?.weaviateScheme as string
            const weaviateHost = nodeData.inputs?.weaviateHost as string
            const weaviateIndex = nodeData.inputs?.weaviateIndex as string
            const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
            const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

            const clientConfig: any = {
                scheme: weaviateScheme,
                host: weaviateHost
            }
            if (weaviateApiKey) clientConfig.apiKey = new ApiKey(weaviateApiKey)

            const client: WeaviateClient = weaviate.client(clientConfig)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const obj: WeaviateLibArgs = {
                client,
                indexName: weaviateIndex
            }

            if (weaviateTextKey) obj.textKey = weaviateTextKey
            if (weaviateMetadataKeys) obj.metadataKeys = JSON.parse(weaviateMetadataKeys.replace(/\s/g, ''))

            try {
                await WeaviateStore.fromDocuments(finalDocs, embeddings, obj)
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const weaviateScheme = nodeData.inputs?.weaviateScheme as string
        const weaviateHost = nodeData.inputs?.weaviateHost as string
        const weaviateIndex = nodeData.inputs?.weaviateIndex as string
        const weaviateTextKey = nodeData.inputs?.weaviateTextKey as string
        const weaviateMetadataKeys = nodeData.inputs?.weaviateMetadataKeys as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const weaviateApiKey = getCredentialParam('weaviateApiKey', credentialData, nodeData)

        const clientConfig: any = {
            scheme: weaviateScheme,
            host: weaviateHost
        }
        if (weaviateApiKey) clientConfig.apiKey = new ApiKey(weaviateApiKey)

        const client: WeaviateClient = weaviate.client(clientConfig)

        const obj: WeaviateLibArgs = {
            client,
            indexName: weaviateIndex
        }

        if (weaviateTextKey) obj.textKey = weaviateTextKey
        if (weaviateMetadataKeys) obj.metadataKeys = JSON.parse(weaviateMetadataKeys.replace(/\s/g, ''))

        const vectorStore = await WeaviateStore.fromExistingIndex(embeddings, obj)

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

module.exports = { nodeClass: Weaviate_VectorStores }
