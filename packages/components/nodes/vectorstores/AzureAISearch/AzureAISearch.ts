import { flatten } from 'lodash'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { AzureAISearchVectorStore, AzureAISearchConfig } from '@langchain/community/vectorstores/azure_aisearch'
import { resolveVectorStoreOrRetriever } from '../VectorStoreUtils'

class AzureAISearch_VectorStores implements INode {
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
        this.label = 'AzureAI Search'
        this.name = 'azureAISearch'
        this.version = 1.0
        this.type = 'AzureAISearch'
        this.icon = 'azureAISearch.png'
        this.category = 'Vector Stores'
        this.description = `Enterprise-ready information retrieval system for building RAG-based applications on Azure`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureAISearchAuth']
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
                label: 'Index Name',
                name: 'azureAISearchIndexName',
                type: 'string'
            },
            {
                label: 'Search Type',
                name: 'azureAISearchType',
                type: 'options',
                default: 'similarity',
                options: [
                    {
                        label: 'similarity',
                        name: 'similarity'
                    },
                    {
                        label: 'similarity_hybrid',
                        name: 'similarity_hybrid'
                    },
                    {
                        label: 'semantic_hybrid',
                        name: 'semantic_hybrid'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'AzureAISearch Metadata Filter',
                name: 'azureAISearchMetadataFilter',
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
                label: 'AzureAISearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'AzureAISearch Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(AzureAISearchVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            // Get input data
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const indexName = nodeData.inputs?.azureAIIndexName as string

            // Get credential data
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const azureSearchEndpoint = credentialData?.azureSearchEndpoint
            const azureSearchApiKey = credentialData?.azureSearchApiKey

            const azureConfig: AzureAISearchConfig = {
                indexName,
                endpoint: azureSearchEndpoint,
                key: azureSearchApiKey
            }

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                await AzureAISearchVectorStore.fromDocuments(finalDocs, embeddings, azureConfig)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const indexName = nodeData.inputs?.azureAIIndexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const azureAISearchMetadataFilter = nodeData.inputs?.azureAISearchMetadataFilter as string
        const azureAISearchType = nodeData.inputs?.azureAISearchType as 'similarity' | 'similarity_hybrid' | 'semantic_hybrid'

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureSearchEndpoint = credentialData?.azureSearchEndpoint
        const azureSearchApiKey = credentialData?.azureSearchApiKey

        const azureConfig: AzureAISearchConfig = {
            indexName,
            endpoint: azureSearchEndpoint,
            key: azureSearchApiKey,
            search: {
                type: azureAISearchType
            }
        }

        let azureAISearchFilter: AzureAISearchVectorStore['FilterType'] = {}

        try {
            const store = new AzureAISearchVectorStore(embeddings, azureConfig)
            if (azureAISearchMetadataFilter) {
                azureAISearchFilter =
                    typeof azureAISearchMetadataFilter === 'object' ? azureAISearchMetadataFilter : JSON.parse(azureAISearchMetadataFilter)
            }
            return resolveVectorStoreOrRetriever(nodeData, store, azureAISearchFilter)
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: AzureAISearch_VectorStores }
