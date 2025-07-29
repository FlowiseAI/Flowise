import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses } from '../../../src/utils'
import { index } from '../../../src/indexing'
import { howToUseFileUpload } from '../VectorStoreUtils'
import { VectorStore } from '@langchain/core/vectorstores'
import { AAIVectorStoreDriver } from './driver/Base'
import { AAITypeORMDriver } from './driver/AAITypeORM'
import { getTableName } from './utils'

// Check if AAI environment variables exist
const aaiServerCredentialsExist = !!(
    process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_USER &&
    process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_PASSWORD &&
    process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_HOST &&
    process.env.AAI_DEFAULT_POSTGRES_VECTORSTORE_DATABASE
)

// added temporarily to fix the base class return for VectorStore when postgres node is using TypeORM
function getVectorStoreBaseClasses() {
    // Try getting base classes through the utility function
    const baseClasses = getBaseClasses(VectorStore)

    // If we got results, return them
    if (baseClasses && baseClasses.length > 0) {
        return baseClasses
    }

    // If VectorStore is recognized as a class but getBaseClasses returned nothing,
    // return the known inheritance chain
    if (VectorStore instanceof Function) {
        return ['VectorStore']
    }

    // Fallback to minimum required class
    return ['VectorStore']
}

class AAIPostgres_VectorStores implements INode {
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
    tags: string[]

    constructor() {
        this.label = 'AAI Vector (Postgres)'
        this.name = 'aaiPostgres'
        this.version = 1.0
        this.type = 'AAIPostgres'
        this.icon = 'aaipostgres.svg'
        this.category = 'Vector Stores'
        this.badge = 'AAI'
        this.tags = ['AAI']
        this.description = 'Use Answer Agent Postgres database for vector storage and retrieval with automatic configuration'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi'],
            optional: aaiServerCredentialsExist
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
                label: 'Namespace',
                name: 'namespace',
                type: 'string',
                placeholder: 'my-namespace',
                description: 'Namespace for vector store isolation. If not specified, a secure namespace will be generated',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Distance Strategy',
                name: 'distanceStrategy',
                description: 'Strategy for calculating distances between vectors',
                type: 'options',
                options: [
                    {
                        label: 'Cosine',
                        name: 'cosine'
                    },
                    {
                        label: 'Euclidean',
                        name: 'euclidean'
                    },
                    {
                        label: 'Inner Product',
                        name: 'innerProduct'
                    }
                ],
                additionalParams: true,
                default: 'cosine',
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
                label: 'Additional Configuration',
                name: 'additionalConfig',
                type: 'json',
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
            },
            {
                label: 'Postgres Metadata Filter',
                name: 'pgMetadataFilter',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'AAI Postgres Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'AAI Postgres Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getVectorStoreBaseClasses()]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const tableName = getTableName()
            const docs = nodeData.inputs?.document as Document[]
            const recordManager = nodeData.inputs?.recordManager
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
            const namespace = nodeData.inputs?.namespace as string
            const vectorStoreDriver: AAIVectorStoreDriver = AAIPostgres_VectorStores.getDriverFromConfig(nodeData, options)

            // Verify required options
            if (!options.chatflowid) {
                throw new Error('Chatflow ID is required for AAI Postgres Vector Store')
            }

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

            try {
                if (recordManager) {
                    const vectorStore = await vectorStoreDriver.instanciate()

                    await recordManager.createSchema()

                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: tableName
                        }
                    })

                    return res
                } else {
                    await vectorStoreDriver.fromDocuments(finalDocs)

                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const vectorStoreDriver: AAIVectorStoreDriver = AAIPostgres_VectorStores.getDriverFromConfig(nodeData, options)
            const tableName = getTableName()
            const recordManager = nodeData.inputs?.recordManager
            const namespace = nodeData.inputs?.namespace as string

            // Verify required options
            if (!options.chatflowid) {
                throw new Error('Chatflow ID is required for AAI Postgres Vector Store')
            }

            const vectorStore = await vectorStoreDriver.instanciate()

            try {
                if (recordManager) {
                    const vectorStoreName = tableName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const keys: string[] = await recordManager.listKeys({})

                    await vectorStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await vectorStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const vectorStoreDriver: AAIVectorStoreDriver = AAIPostgres_VectorStores.getDriverFromConfig(nodeData, options)
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const _pgMetadataFilter = nodeData.inputs?.pgMetadataFilter
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
        const namespace = nodeData.inputs?.namespace as string

        // Verify required options
        if (!options.chatflowid) {
            throw new Error('Chatflow ID is required for AAI Postgres Vector Store')
        }

        let pgMetadataFilter: any
        if (_pgMetadataFilter) {
            pgMetadataFilter = typeof _pgMetadataFilter === 'object' ? _pgMetadataFilter : JSON.parse(_pgMetadataFilter)
        }
        if (isFileUploadEnabled && options.chatId) {
            pgMetadataFilter = {
                ...(pgMetadataFilter || {}),
                [FLOWISE_CHATID]: options.chatId
            }
        }

        const vectorStore = await vectorStoreDriver.instanciate(pgMetadataFilter)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            if (pgMetadataFilter) {
                ;(vectorStore as any).filter = pgMetadataFilter
            }
            return vectorStore
        }
        return vectorStore
    }

    static getDriverFromConfig(nodeData: INodeData, options: ICommonObject): AAIVectorStoreDriver {
        return new AAITypeORMDriver(nodeData, options)
    }
}

module.exports = { nodeClass: AAIPostgres_VectorStores }
