import { DataSourceOptions } from 'typeorm'
import { VectorStoreDriver } from './Base'
import { getCredentialData, getCredentialParam, ICommonObject } from '../../../../src'
import { TypeORMVectorStore, TypeORMVectorStoreArgs, TypeORMVectorStoreDocument } from '@langchain/community/vectorstores/typeorm'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { Pool } from 'pg'

export class TypeORMDriver extends VectorStoreDriver {
    protected _postgresConnectionOptions: DataSourceOptions

    protected async getPostgresConnectionOptions() {
        if (!this._postgresConnectionOptions) {
            const credentialData = await getCredentialData(this.nodeData.credential ?? '', this.options)
            const user = getCredentialParam('user', credentialData, this.nodeData)
            const password = getCredentialParam('password', credentialData, this.nodeData)
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
                host: this.nodeData.inputs?.host as string,
                port: this.nodeData.inputs?.port as number,
                username: user, // Required by TypeORMVectorStore
                user: user, // Required by Pool in similaritySearchVectorWithScore
                password: password,
                database: this.nodeData.inputs?.database as string
            } as DataSourceOptions
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
        return this.adaptInstance(TypeORMVectorStore.fromDataSource(this.getEmbeddings(), await this.getArgs()), metadataFilters)
    }

    async fromDocuments(documents: Document[]) {
        return this.adaptInstance(TypeORMVectorStore.fromDocuments(documents, this.getEmbeddings(), await this.getArgs()))
    }

    sanitizeDocuments(documents: Document[]) {
        // Remove NULL characters which triggers error on PG
        for (var i in documents) {
            documents[i].pageContent = documents[i].pageContent.replace(/\0/g, '')
        }

        return documents
    }

    protected async adaptInstance(instancePromise: Promise<TypeORMVectorStore>, metadataFilters?: any): Promise<VectorStore> {
        const instance = await instancePromise
        const _tableName = this.nodeData.inputs?.tableName as string
        const tableName = _tableName ? _tableName : 'documents'

        // Rewrite the method to use pg pool connection instead of the default connection
        /* Otherwise a connection error is displayed when the chain tries to execute the function
            [chain/start] [1:chain:ConversationalRetrievalQAChain] Entering Chain run with input: { "question": "what the document is about", "chat_history": [] }
            [retriever/start] [1:chain:ConversationalRetrievalQAChain > 2:retriever:VectorStoreRetriever] Entering Retriever run with input: { "query": "what the document is about" }
            [ERROR]: uncaughtException:  Illegal invocation TypeError: Illegal invocation at Socket.ref (node:net:1524:18) at Connection.ref (.../node_modules/pg/lib/connection.js:183:17) at Client.ref (.../node_modules/pg/lib/client.js:591:21) at BoundPool._pulseQueue (/node_modules/pg-pool/index.js:148:28) at .../node_modules/pg-pool/index.js:184:37 at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
        */
        instance.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            return await TypeORMDriver.similaritySearchVectorWithScore(
                query,
                k,
                tableName,
                await this.getPostgresConnectionOptions(),
                filter ?? metadataFilters
            )
        }

        instance.delete = async (params: { ids: string[] }): Promise<void> => {
            const { ids } = params

            if (ids?.length) {
                try {
                    instance.appDataSource.getRepository(instance.documentEntity).delete(ids)
                } catch (e) {
                    console.error('Failed to delete')
                }
            }
        }

        const baseAddVectorsFn = instance.addVectors.bind(instance)

        instance.addVectors = async (vectors, documents) => {
            return baseAddVectorsFn(vectors, this.sanitizeDocuments(documents))
        }

        return instance
    }

    static similaritySearchVectorWithScore = async (
        query: number[],
        k: number,
        tableName: string,
        postgresConnectionOptions: ICommonObject,
        filter?: any
    ) => {
        const embeddingString = `[${query.join(',')}]`
        let _filter = '{}'
        let notExists = ''
        if (filter && typeof filter === 'object') {
            if (filter.$notexists) {
                notExists = `OR NOT (metadata ? '${filter.$notexists}')`
                delete filter.$notexists
            }
            _filter = JSON.stringify(filter)
        }

        const queryString = `
            SELECT *, embedding <=> $1 as "_distance"
            FROM ${tableName}
            WHERE metadata @> $2
            ${notExists}
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
}
