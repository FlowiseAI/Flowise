import { flatten } from 'lodash'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { CouchbaseVectorStore, CouchbaseVectorStoreArgs } from '@langchain/community/vectorstores/couchbase'
import { Cluster } from 'couchbase'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { resolveVectorStoreOrRetriever } from '../VectorStoreUtils'

class Couchbase_VectorStores implements INode {
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
        this.label = 'Couchbase'
        this.name = 'couchbase'
        this.version = 1.0
        this.type = 'Couchbase'
        this.icon = 'couchbase.svg'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and load existing index using Couchbase, a award-winning distributed NoSQL database`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['couchbaseApi']
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
                label: 'Bucket Name',
                name: 'bucketName',
                placeholder: '<DB_BUCKET_NAME>',
                type: 'string'
            },
            {
                label: 'Scope Name',
                name: 'scopeName',
                placeholder: '<SCOPE_NAME>',
                type: 'string'
            },
            {
                label: 'Collection Name',
                name: 'collectionName',
                placeholder: '<COLLECTION_NAME>',
                type: 'string'
            },
            {
                label: 'Index Name',
                name: 'indexName',
                placeholder: '<VECTOR_INDEX_NAME>',
                type: 'string'
            },
            {
                label: 'Content Field',
                name: 'textKey',
                description: 'Name of the field (column) that contains the actual content',
                type: 'string',
                default: 'text',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Embedded Field',
                name: 'embeddingKey',
                description: 'Name of the field (column) that contains the Embedding',
                type: 'string',
                default: 'embedding',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Couchbase Metadata Filter',
                name: 'couchbaseMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
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
                label: 'Couchbase Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Couchbase Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(CouchbaseVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const bucketName = nodeData.inputs?.bucketName as string
            const scopeName = nodeData.inputs?.scopeName as string
            const collectionName = nodeData.inputs?.collectionName as string
            const indexName = nodeData.inputs?.indexName as string
            let textKey = nodeData.inputs?.textKey as string
            let embeddingKey = nodeData.inputs?.embeddingKey as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            let connectionString = getCredentialParam('connectionString', credentialData, nodeData)
            let databaseUsername = getCredentialParam('username', credentialData, nodeData)
            let databasePassword = getCredentialParam('password', credentialData, nodeData)

            const docs = nodeData.inputs?.document as Document[]

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const document = new Document(flattenDocs[i])
                    finalDocs.push(document)
                }
            }

            const couchbaseClient = await Cluster.connect(connectionString, {
                username: databaseUsername,
                password: databasePassword,
                configProfile: 'wanDevelopment'
            })

            const couchbaseConfig: CouchbaseVectorStoreArgs = {
                cluster: couchbaseClient,
                bucketName: bucketName,
                scopeName: scopeName,
                collectionName: collectionName,
                indexName: indexName,
                textKey: textKey,
                embeddingKey: embeddingKey
            }

            try {
                if (!textKey || textKey === '') couchbaseConfig.textKey = 'text'
                if (!embeddingKey || embeddingKey === '') couchbaseConfig.embeddingKey = 'embedding'

                await CouchbaseVectorStore.fromDocuments(finalDocs, embeddings, couchbaseConfig)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const bucketName = nodeData.inputs?.bucketName as string
        const scopeName = nodeData.inputs?.scopeName as string
        const collectionName = nodeData.inputs?.collectionName as string
        const indexName = nodeData.inputs?.indexName as string
        let textKey = nodeData.inputs?.textKey as string
        let embeddingKey = nodeData.inputs?.embeddingKey as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const couchbaseMetadataFilter = nodeData.inputs?.couchbaseMetadataFilter

        let connectionString = getCredentialParam('connectionString', credentialData, nodeData)
        let databaseUsername = getCredentialParam('username', credentialData, nodeData)
        let databasePassword = getCredentialParam('password', credentialData, nodeData)
        let metadatafilter

        const couchbaseClient = await Cluster.connect(connectionString, {
            username: databaseUsername,
            password: databasePassword,
            configProfile: 'wanDevelopment'
        })

        const couchbaseConfig: CouchbaseVectorStoreArgs = {
            cluster: couchbaseClient,
            bucketName: bucketName,
            scopeName: scopeName,
            collectionName: collectionName,
            indexName: indexName,
            textKey: textKey,
            embeddingKey: embeddingKey
        }

        try {
            if (!textKey || textKey === '') couchbaseConfig.textKey = 'text'
            if (!embeddingKey || embeddingKey === '') couchbaseConfig.embeddingKey = 'embedding'

            if (couchbaseMetadataFilter) {
                metadatafilter =
                    typeof couchbaseMetadataFilter === 'object' ? couchbaseMetadataFilter : parseJsonBody(couchbaseMetadataFilter)
            }

            const vectorStore = await CouchbaseVectorStore.initialize(embeddings, couchbaseConfig)

            return resolveVectorStoreOrRetriever(nodeData, vectorStore, metadatafilter)
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: Couchbase_VectorStores }
