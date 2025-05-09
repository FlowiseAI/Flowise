import { flatten } from 'lodash'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeStoreParams, PineconeStore } from '@langchain/pinecone'
import type { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import type { VectorStore } from '@langchain/core/vectorstores'
import type { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses } from '../../../src/utils'
import { addMMRInputParams, howToUseFileUpload, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'
import { generateSecureNamespace } from '../../../src/aaiUtils'

// Standalone utility functions
function createSecurityFilters(options: ICommonObject): any {
    const filters: any = {
        _chatflowId: { $eq: options.chatflowid }
    }
    if (options.user?.organizationId) {
        filters._organizationId = { $eq: options.user.organizationId }
    }
    if (options.organizationId) {
        filters._organizationId = { $eq: options.organizationId }
    }
    return filters
}

function addSecurityMetadata(doc: Document, options: ICommonObject): Document {
    doc.metadata = {
        ...doc.metadata,
        _chatflowId: options.chatflowid,
        ...(options.user?.organizationId ? { _organizationId: options.user.organizationId } : {}),
        ...(options.organizationId ? { _organizationId: options.organizationId } : {})
    }
    return doc
}

/**
 * AAI Vector Store - Uses Pinecone with environment variables
 */
class AAI_VectorStores implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'AAI Vector Store'
        this.name = 'aaiVectorStore'
        this.version = 1.0
        this.type = 'AAIVectorStore'
        this.icon = 'answerai-square-black.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity or mmr search using AAI Vector Store'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
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
                label: 'Namespace',
                name: 'namespace',
                type: 'string',
                placeholder: 'my-namespace',
                description: 'Namespace to use in Pinecone',
                optional: true
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
                label: 'Pinecone Text Key',
                name: 'pineconeTextKey',
                description: 'The key in the metadata for storing text. Default to `text`',
                type: 'string',
                placeholder: 'text',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'pineconeMetadataFilter',
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
        addMMRInputParams(this.inputs)
        this.outputs = [
            {
                label: 'AAI Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'AAI Pinecone Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PineconeStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
            const namespace = nodeData.inputs?.namespace as string

            // Get index and API key from environment variables
            const pineconeApiKey = process.env.AAI_DEFAULT_PINECONE
            const _index = process.env.AAI_DEFAULT_PINECONE_INDEX

            if (!pineconeApiKey) {
                throw new Error('AAI_DEFAULT_PINECONE environment variable is not set')
            }

            if (!_index) {
                throw new Error('AAI_DEFAULT_PINECONE_INDEX environment variable is not set')
            }

            if (!options.chatflowid) {
                throw new Error('Chatflow ID is required for AAI Vector Store')
            }

            const client = new Pinecone({ apiKey: pineconeApiKey })
            const pineconeIndex = client.Index(_index)

            const flattenDocs = docs?.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i]?.pageContent) {
                    if (isFileUploadEnabled && options.chatId) {
                        flattenDocs[i].metadata = { ...flattenDocs[i].metadata, [FLOWISE_CHATID]: options.chatId }
                    }
                    // Add security metadata to each document
                    finalDocs.push(addSecurityMetadata(new Document(flattenDocs[i]), options))
                }
            }

            const obj: PineconeStoreParams = {
                pineconeIndex,
                textKey: pineconeTextKey || 'text'
            }

            // Generate secure namespace
            obj.namespace = generateSecureNamespace(options, namespace)

            try {
                if (recordManager) {
                    const vectorStore = (await PineconeStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: obj.namespace || namespace
                        }
                    })
                    return res
                }
                await PineconeStore.fromDocuments(finalDocs, embeddings, obj)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
            const recordManager = nodeData.inputs?.recordManager
            const namespace = nodeData.inputs?.namespace as string

            // Get index and API key from environment variables
            const pineconeApiKey = process.env.AAI_DEFAULT_PINECONE
            const _index = process.env.AAI_DEFAULT_PINECONE_INDEX

            if (!pineconeApiKey) {
                throw new Error('AAI_DEFAULT_PINECONE environment variable is not set')
            }

            if (!_index) {
                throw new Error('AAI_DEFAULT_PINECONE_INDEX environment variable is not set')
            }

            // Require chatflow ID for proper isolation
            if (!options.chatflowid) {
                throw new Error('Chatflow ID is required for AAI Vector Store')
            }

            const client = new Pinecone({ apiKey: pineconeApiKey })
            const pineconeIndex = client.Index(_index)

            const obj: PineconeStoreParams = {
                pineconeIndex,
                textKey: pineconeTextKey || 'text'
            }

            // Generate secure namespace
            obj.namespace = generateSecureNamespace(options, namespace)

            // Add security filters
            obj.filter = createSecurityFilters(options)

            const pineconeStore = new PineconeStore(embeddings, obj)

            try {
                if (recordManager) {
                    const vectorStoreName = obj.namespace || namespace
                    await recordManager.createSchema()
                    recordManager.namespace = `${recordManager.namespace}_${vectorStoreName}`
                    const keys: string[] = await recordManager.listKeys({})

                    await pineconeStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await pineconeStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(
        nodeData: INodeData,
        _: string,
        options: ICommonObject
    ): Promise<VectorStore | ReturnType<typeof resolveVectorStoreOrRetriever>> {
        const pineconeMetadataFilter = nodeData.inputs?.pineconeMetadataFilter
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
        const namespace = nodeData.inputs?.namespace as string

        // Get index and API key from environment variables
        const pineconeApiKey = process.env.AAI_DEFAULT_PINECONE
        const index = process.env.AAI_DEFAULT_PINECONE_INDEX

        if (!pineconeApiKey) {
            throw new Error('AAI_DEFAULT_PINECONE environment variable is not set')
        }

        if (!index) {
            throw new Error('AAI_DEFAULT_PINECONE_INDEX environment variable is not set')
        }

        // Require chatflow ID for proper isolation
        if (!options.chatflowid) {
            throw new Error('Chatflow ID is required for AAI Vector Store')
        }

        const client = new Pinecone({ apiKey: pineconeApiKey })
        const pineconeIndex = client.Index(index)

        const obj: PineconeStoreParams = {
            pineconeIndex,
            textKey: pineconeTextKey || 'text'
        }

        // Generate secure namespace
        obj.namespace = generateSecureNamespace(options, namespace)

        // Create base security filters
        let metadatafilter = createSecurityFilters(options)

        // Apply user-provided filters without compromising security
        // We use $and to combine user filters with security filters
        if (pineconeMetadataFilter) {
            const userFilter = typeof pineconeMetadataFilter === 'object' ? pineconeMetadataFilter : JSON.parse(pineconeMetadataFilter)
            metadatafilter = {
                $and: [metadatafilter, userFilter]
            }
        }

        obj.filter = metadatafilter

        if (isFileUploadEnabled && options.chatId) {
            obj.filter = obj.filter || {}
            obj.filter.$or = [
                ...(obj.filter.$or || []),
                { [FLOWISE_CHATID]: { $eq: options.chatId } },
                { [FLOWISE_CHATID]: { $exists: false } }
            ]
        }

        const vectorStore = (await PineconeStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore

        return resolveVectorStoreOrRetriever(nodeData, vectorStore, obj.filter)
    }
}

module.exports = { nodeClass: AAI_VectorStores }
