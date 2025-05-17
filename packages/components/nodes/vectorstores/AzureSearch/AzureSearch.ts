import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { AzureAISearchVectorStore } from '@langchain/community/vectorstores/azure_aisearch'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { howToUseFileUpload, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'

const serverCredentialsExists = !!process.env.AZURE_SEARCH_KEY && !!process.env.AZURE_SEARCH_ENDPOINT

class AzureSearch_VectorStores implements INode {
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
        this.label = 'Azure Cognitive Search'
        this.name = 'azureSearch'
        this.version = 1.0
        this.type = 'AzureSearch'
        this.icon = 'Azure.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity search using Azure Cognitive Search'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureSearchApi'],
            optional: serverCredentialsExists
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
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true
            },
            {
                label: 'Azure Search Endpoint',
                name: 'azureSearchEndpoint',
                type: 'string',
                placeholder: process.env.AZURE_SEARCH_ENDPOINT,
                optional: !!process.env.AZURE_SEARCH_ENDPOINT
            },
            {
                label: 'Index Name',
                name: 'indexName',
                type: 'string',
                placeholder: process.env.AZURE_SEARCH_INDEX_NAME,
                optional: !!process.env.AZURE_SEARCH_INDEX_NAME
            },
            {
                label: 'File Upload',
                name: 'fileUpload',
                description: 'Allow file upload on the chat',
                hint: {
                    label: 'How to use',
                    value: howToUseFileUpload
                },
                type: 'boolean',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Search Type',
                name: 'searchType',
                type: 'options',
                options: [
                    { label: 'Similarity', name: 'similarity' },
                    { label: 'Similarity Hybrid', name: 'similarity_hybrid' },
                    { label: 'Semantic', name: 'semantic' },
                    { label: 'Semantic Hybrid', name: 'semantic_hybrid' }
                ],
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
                label: 'Azure Search Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Azure Search Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(AzureAISearchVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const endpoint = nodeData.inputs?.azureSearchEndpoint as string
            const indexName = nodeData.inputs?.indexName as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const searchType = nodeData.inputs?.searchType as string
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('azureSearchKey', credentialData, nodeData)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    if (isFileUploadEnabled && options.chatId) {
                        flattenDocs[i].metadata = { ...flattenDocs[i].metadata, [FLOWISE_CHATID]: options.chatId }
                    }
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const config = {
                azureSearchKey: apiKey,
                azureSearchEndpoint: endpoint || process.env.AZURE_SEARCH_ENDPOINT,
                indexName,
                searchType
            }

            try {
                if (recordManager) {
                    const vectorStore = await AzureAISearchVectorStore.fromExistingIndex(embeddings, config)
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: indexName
                        }
                    })
                    return res
                } else {
                    await AzureAISearchVectorStore.fromDocuments(finalDocs, embeddings, config)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e as any)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const endpoint = nodeData.inputs?.azureSearchEndpoint as string
            const indexName = nodeData.inputs?.indexName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const searchType = nodeData.inputs?.searchType as string

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('azureSearchKey', credentialData, nodeData)

            const config = {
                azureSearchKey: apiKey,
                azureSearchEndpoint: endpoint || process.env.AZURE_SEARCH_ENDPOINT,
                indexName,
                searchType
            }

            const vectorStore = new AzureAISearchVectorStore(embeddings, config)

            try {
                if (recordManager) {
                    const vectorStoreName = indexName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const keys: string[] = await recordManager.listKeys({})

                    await vectorStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await vectorStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e as any)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const endpoint = nodeData.inputs?.azureSearchEndpoint as string
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const searchType = nodeData.inputs?.searchType as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('azureSearchKey', credentialData, nodeData)

        const config = {
            azureSearchKey: apiKey,
            azureSearchEndpoint: endpoint || process.env.AZURE_SEARCH_ENDPOINT,
            indexName,
            searchType
        }

        const vectorStore = await AzureAISearchVectorStore.fromExistingIndex(embeddings, config)

        return resolveVectorStoreOrRetriever(nodeData, vectorStore)
    }
}

module.exports = { nodeClass: AzureSearch_VectorStores }
