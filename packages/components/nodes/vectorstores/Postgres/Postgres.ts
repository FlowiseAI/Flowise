import { Pool } from 'pg'
import { flatten } from 'lodash'
import { DataSourceOptions } from 'typeorm'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { TypeORMVectorStore, TypeORMVectorStoreDocument } from '@langchain/community/vectorstores/typeorm'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { index } from '../../../src/indexing'

class Postgres_VectorStores implements INode {
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
        this.label = 'Postgres'
        this.name = 'postgres'
        this.version = 5.0
        this.type = 'Postgres'
        this.icon = 'postgres.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity search upon query using pgvector on Postgres'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi']
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
                label: 'Port',
                name: 'port',
                type: 'number',
                placeholder: '6432',
                optional: true
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string',
                placeholder: 'documents',
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
                label: 'Postgres Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Postgres Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(TypeORMVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const user = getCredentialParam('user', credentialData, nodeData)
            const password = getCredentialParam('password', credentialData, nodeData)
            const _tableName = nodeData.inputs?.tableName as string
            const tableName = _tableName ? _tableName : 'documents'
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const additionalConfig = nodeData.inputs?.additionalConfig as string
            const recordManager = nodeData.inputs?.recordManager

            let additionalConfiguration = {}
            if (additionalConfig) {
                try {
                    additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
                } catch (exception) {
                    throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
                }
            }

            const postgresConnectionOptions = {
                ...additionalConfiguration,
                type: 'postgres',
                host: nodeData.inputs?.host as string,
                port: nodeData.inputs?.port as number,
                username: user,
                password: password,
                database: nodeData.inputs?.database as string
            }

            const args = {
                postgresConnectionOptions: postgresConnectionOptions as DataSourceOptions,
                tableName: tableName
            }

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                if (recordManager) {
                    const vectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args)

                    // Avoid Illegal invocation error
                    vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
                        return await similaritySearchVectorWithScore(query, k, tableName, postgresConnectionOptions, filter)
                    }

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
                    const vectorStore = await TypeORMVectorStore.fromDocuments(finalDocs, embeddings, args)

                    // Avoid Illegal invocation error
                    vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
                        return await similaritySearchVectorWithScore(query, k, tableName, postgresConnectionOptions, filter)
                    }

                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)
        const _tableName = nodeData.inputs?.tableName as string
        const tableName = _tableName ? _tableName : 'documents'
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const _pgMetadataFilter = nodeData.inputs?.pgMetadataFilter

        let pgMetadataFilter: any
        if (_pgMetadataFilter) {
            pgMetadataFilter = typeof _pgMetadataFilter === 'object' ? _pgMetadataFilter : JSON.parse(_pgMetadataFilter)
        }

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const postgresConnectionOptions = {
            ...additionalConfiguration,
            type: 'postgres',
            host: nodeData.inputs?.host as string,
            port: nodeData.inputs?.port as number,
            username: user, // Required by TypeORMVectorStore
            user: user, // Required by Pool in similaritySearchVectorWithScore
            password: password,
            database: nodeData.inputs?.database as string
        }

        const args = {
            postgresConnectionOptions: postgresConnectionOptions as DataSourceOptions,
            tableName: tableName
        }

        const vectorStore = await TypeORMVectorStore.fromDataSource(embeddings, args)

        // Rewrite the method to use pg pool connection instead of the default connection
        /* Otherwise a connection error is displayed when the chain tries to execute the function
            [chain/start] [1:chain:ConversationalRetrievalQAChain] Entering Chain run with input: { "question": "what the document is about", "chat_history": [] }
            [retriever/start] [1:chain:ConversationalRetrievalQAChain > 2:retriever:VectorStoreRetriever] Entering Retriever run with input: { "query": "what the document is about" }
            [ERROR]: uncaughtException:  Illegal invocation TypeError: Illegal invocation at Socket.ref (node:net:1524:18) at Connection.ref (.../node_modules/pg/lib/connection.js:183:17) at Client.ref (.../node_modules/pg/lib/client.js:591:21) at BoundPool._pulseQueue (/node_modules/pg-pool/index.js:148:28) at .../node_modules/pg-pool/index.js:184:37 at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
        */
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            return await similaritySearchVectorWithScore(query, k, tableName, postgresConnectionOptions, filter ?? pgMetadataFilter)
        }

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
}

const similaritySearchVectorWithScore = async (
    query: number[],
    k: number,
    tableName: string,
    postgresConnectionOptions: ICommonObject,
    filter?: any
) => {
    const embeddingString = `[${query.join(',')}]`
    let _filter = '{}'
    if (filter && typeof filter === 'object') _filter = JSON.stringify(filter)

    const queryString = `
        SELECT *, embedding <=> $1 as "_distance"
        FROM ${tableName}
        WHERE metadata @> $2
        ORDER BY "_distance" ASC
        LIMIT $3;`

    const pool = new Pool(postgresConnectionOptions)
    const conn = await pool.connect()

    const documents = await conn.query(queryString, [embeddingString, _filter, k])

    conn.release()

    const results = [] as [TypeORMVectorStoreDocument, number][]
    for (const doc of documents.rows) {
        if (doc._distance != null && doc.pageContent != null) {
            const document = new Document(doc) as TypeORMVectorStoreDocument
            document.id = doc.id
            results.push([document, doc._distance])
        }
    }

    return results
}

module.exports = { nodeClass: Postgres_VectorStores }
