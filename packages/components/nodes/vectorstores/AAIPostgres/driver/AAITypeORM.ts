import { DataSourceOptions } from 'typeorm'
import { AAIVectorStoreDriver } from './Base'
import { FLOWISE_CHATID, ICommonObject } from '../../../../src'
import { TypeORMVectorStore, TypeORMVectorStoreArgs, TypeORMVectorStoreDocument } from '@langchain/community/vectorstores/typeorm'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { Pool } from 'pg'
import { generateSecureNamespace } from '../../../../src/aaiUtils'

// Security helper functions
function createSecurityFilters(options: ICommonObject, namespace: string): any {
    const filters: any = {
        _namespace: namespace,
        _chatflowId: options.chatflowid
    }
    if (options.user?.organizationId || options.organizationId) {
        filters._organizationId = options.organizationId || options.user?.organizationId
    }
    return filters
}

function addSecurityMetadata(doc: Document, options: ICommonObject, namespace: string): Document {
    doc.metadata = {
        ...doc.metadata,
        _namespace: namespace,
        _chatflowId: options.chatflowid,
        ...(options.user?.organizationId ? { _organizationId: options.user.organizationId } : {}),
        ...(options.organizationId ? { _organizationId: options.organizationId } : {})
    }
    return doc
}

export class AAITypeORMDriver extends AAIVectorStoreDriver {
    protected _postgresConnectionOptions: DataSourceOptions

    protected async getPostgresConnectionOptions() {
        if (!this._postgresConnectionOptions) {
            const additionalConfig = this.nodeData.inputs?.additionalConfig as string

            let additionalConfiguration = {}

            if (additionalConfig) {
                try {
                    additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
                } catch (exception) {
                    throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
                }
            }

            this._postgresConnectionOptions = {
                ...additionalConfiguration,
                type: 'postgres',
                host: this.getHost(),
                port: this.getPort(),
                ssl: this.getSSL(),
                username: this.getUser(), // Required by TypeORMVectorStore
                user: this.getUser(), // Required by Pool in similaritySearchVectorWithScore
                password: this.getPassword(),
                database: this.getDatabase()
            } as DataSourceOptions

            // Prevent using default MySQL port, otherwise will throw uncaught error and crashing the app
            if (this.getPort() === 3006) {
                throw new Error('Invalid port number')
            }
        }
        return this._postgresConnectionOptions
    }

    async getArgs(): Promise<TypeORMVectorStoreArgs> {
        return {
            postgresConnectionOptions: await this.getPostgresConnectionOptions(),
            tableName: this.getTableName()
        }
    }

    async instanciate(metadataFilters?: any) {
        try {
            // Generate namespace and create security filters
            const namespace = generateSecureNamespace(this.options, this.nodeData.inputs?.namespace as string)
            const securityFilters = createSecurityFilters(this.options, namespace)

            // Combine security filters with user filters
            let combinedFilters = securityFilters
            if (metadataFilters) {
                // User filters cannot override security filters
                combinedFilters = { ...metadataFilters, ...securityFilters }
            }

            return this.adaptInstance(await TypeORMVectorStore.fromDataSource(this.getEmbeddings(), await this.getArgs()), combinedFilters)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is related to missing pgvector extension
            if (
                errorMessage.includes('extension "vector"') ||
                errorMessage.includes('operator does not exist') ||
                errorMessage.includes('type "vector" does not exist')
            ) {
                throw new Error(
                    `
❌ pgvector extension is not available in your PostgreSQL database.

🔧 To fix this issue:

1. **Install pgvector on your PostgreSQL server**
   - macOS: brew install pgvector
   - Ubuntu/Debian: sudo apt install postgresql-15-pgvector
   - Docker: Use postgres image with pgvector
   - For other systems: https://github.com/pgvector/pgvector#installation

2. **Enable the extension in your database**
   - Connect as superuser: psql -U postgres -d your_database
   - Run: CREATE EXTENSION IF NOT EXISTS vector;

3. **Use the provided helper script**
   - From project root: node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js

4. **Verify installation**
   - Run: SELECT * FROM pg_extension WHERE extname = 'vector';

💡 Original error: ${errorMessage}
                `.trim()
                )
            }

            // Re-throw other errors as-is
            throw error
        }
    }

    async fromDocuments(documents: Document[]) {
        try {
            // Generate namespace and add security metadata to documents
            const namespace = generateSecureNamespace(this.options, this.nodeData.inputs?.namespace as string)
            const secureDocuments = documents.map((doc) => addSecurityMetadata(new Document(doc), this.options, namespace))

            return this.adaptInstance(await TypeORMVectorStore.fromDocuments(secureDocuments, this.getEmbeddings(), await this.getArgs()))
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Check if error is related to missing pgvector extension
            if (
                errorMessage.includes('extension "vector"') ||
                errorMessage.includes('operator does not exist') ||
                errorMessage.includes('type "vector" does not exist')
            ) {
                throw new Error(
                    `
❌ pgvector extension is not available in your PostgreSQL database.

🔧 To fix this issue:

1. **Install pgvector on your PostgreSQL server**
   - macOS: brew install pgvector
   - Ubuntu/Debian: sudo apt install postgresql-15-pgvector
   - Docker: Use postgres image with pgvector
   - For other systems: https://github.com/pgvector/pgvector#installation

2. **Enable the extension in your database**
   - Connect as superuser: psql -U postgres -d your_database
   - Run: CREATE EXTENSION IF NOT EXISTS vector;

3. **Use the provided helper script**
   - From project root: node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js

4. **Verify installation**
   - Run: SELECT * FROM pg_extension WHERE extname = 'vector';

💡 Original error: ${errorMessage}
                `.trim()
                )
            }

            // Re-throw other errors as-is
            throw error
        }
    }

    sanitizeDocuments(documents: Document[]) {
        // Remove NULL characters which triggers error on PG
        for (var i in documents) {
            documents[i].pageContent = documents[i].pageContent.replace(/\0/g, '')
        }

        return documents
    }

    protected async adaptInstance(instance: TypeORMVectorStore, metadataFilters?: any): Promise<VectorStore> {
        const tableName = this.getTableName()

        // Rewrite the method to use pg pool connection instead of the default connection
        /* Otherwise a connection error is displayed when the chain tries to execute the function
            [chain/start] [1:chain:ConversationalRetrievalQAChain] Entering Chain run with input: { "question": "what the document is about", "chat_history": [] }
            [retriever/start] [1:chain:ConversationalRetrievalQAChain > 2:retriever:VectorStoreRetriever] Entering Retriever run with input: { "query": "what the document is about" }
            [ERROR]: uncaughtException:  Illegal invocation TypeError: Illegal invocation at Socket.ref (node:net:1524:18) at Connection.ref (.../node_modules/pg/lib/connection.js:183:17) at Client.ref (.../node_modules/pg/lib/client.js:591:21) at BoundPool._pulseQueue (/node_modules/pg-pool/index.js:148:28) at .../node_modules/pg-pool/index.js:184:37 at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
        */
        instance.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            return await AAITypeORMDriver.similaritySearchVectorWithScore(
                query,
                k,
                tableName,
                await this.getPostgresConnectionOptions(),
                filter ?? metadataFilters,
                this.computedOperatorString
            )
        }

        instance.delete = async (params: { ids: string[] }): Promise<void> => {
            const { ids } = params

            if (ids?.length) {
                try {
                    // Generate namespace for filtering
                    const namespace = generateSecureNamespace(this.options, this.nodeData.inputs?.namespace as string)
                    const tableName = this.getTableName()

                    // First, query to find documents that match both the IDs and namespace
                    const pool = new Pool(await this.getPostgresConnectionOptions())
                    const conn = await pool.connect()

                    // Build query to find documents with matching IDs and namespace
                    const placeholders = ids.map((_, index) => `$${index + 2}`).join(', ')
                    const queryString = `
                        SELECT id FROM ${tableName}
                        WHERE id IN (${placeholders})
                        AND metadata @> $1
                    `

                    const namespaceFilter = JSON.stringify({ _namespace: namespace })
                    const result = await conn.query(queryString, [namespaceFilter, ...ids])
                    conn.release()

                    // Only delete documents that match namespace
                    const validIds = result.rows.map((row) => row.id)
                    if (validIds.length > 0) {
                        await instance.appDataSource.getRepository(instance.documentEntity).delete(validIds)
                    }
                } catch (e) {
                    console.error('Failed to delete:', e)
                    throw e
                }
            }
        }

        const baseAddVectorsFn = instance.addVectors.bind(instance)

        instance.addVectors = async (vectors, documents) => {
            // Generate namespace and add security metadata to documents
            const namespace = generateSecureNamespace(this.options, this.nodeData.inputs?.namespace as string)
            const secureDocuments = documents.map((doc) => addSecurityMetadata(new Document(doc), this.options, namespace))

            return baseAddVectorsFn(vectors, this.sanitizeDocuments(secureDocuments))
        }

        return instance
    }

    get computedOperatorString() {
        const { distanceStrategy = 'cosine' } = this.nodeData.inputs || {}

        switch (distanceStrategy) {
            case 'cosine':
                return '<=>'
            case 'innerProduct':
                return '<#>'
            case 'euclidean':
                return '<->'
            default:
                throw new Error(`Unknown distance strategy: ${distanceStrategy}`)
        }
    }

    static similaritySearchVectorWithScore = async (
        query: number[],
        k: number,
        tableName: string,
        postgresConnectionOptions: ICommonObject,
        filter?: any,
        distanceOperator: string = '<=>'
    ) => {
        const embeddingString = `[${query.join(',')}]`
        let chatflowOr = ''
        const { [FLOWISE_CHATID]: chatId, ...restFilters } = filter || {}

        const _filter = JSON.stringify(restFilters || {})
        const parameters: any[] = [embeddingString, _filter, k]

        // Match chatflow uploaded file and keep filtering on other files:
        // https://github.com/FlowiseAI/Flowise/pull/3367#discussion_r1804229295
        if (chatId) {
            parameters.push({ [FLOWISE_CHATID]: chatId })
            chatflowOr = `OR metadata @> $${parameters.length}`
        }

        const queryString = `
            SELECT *, embedding ${distanceOperator} $1 as "_distance"
            FROM ${tableName}
            WHERE ((metadata @> $2) AND NOT (metadata ? '${FLOWISE_CHATID}')) ${chatflowOr}
            ORDER BY "_distance" ASC
            LIMIT $3;`

        const pool = new Pool(postgresConnectionOptions)

        const conn = await pool.connect()

        const documents = await conn.query(queryString, parameters)

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
}
