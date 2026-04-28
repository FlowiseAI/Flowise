/*
* Temporary disabled due to increasing open connections without releasing them
* Use TypeORM instead

import { VectorStoreDriver } from './Base'
import { FLOWISE_CHATID } from '../../../../src'
import { DistanceStrategy, PGVectorStore, PGVectorStoreArgs } from '@langchain/community/vectorstores/pgvector'
import { Document } from '@langchain/core/documents'
import { PoolConfig } from 'pg'
import { getContentColumnName } from '../utils'

export class PGVectorDriver extends VectorStoreDriver {
    static CONTENT_COLUMN_NAME_DEFAULT: string = 'pageContent'

    protected _postgresConnectionOptions: PoolConfig

    protected async getPostgresConnectionOptions() {
        if (!this._postgresConnectionOptions) {
            const { user, password } = await this.getCredentials()
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
                host: this.getHost(),
                port: this.getPort(),
                user: user,
                password: password,
                database: this.getDatabase()
            }

            // Prevent using default MySQL port, otherwise will throw uncaught error and crashing the app
            if (this.getHost() === '3006') {
                throw new Error('Invalid port number')
            }
        }

        return this._postgresConnectionOptions
    }

    async getArgs(): Promise<PGVectorStoreArgs> {
        return {
            postgresConnectionOptions: await this.getPostgresConnectionOptions(),
            tableName: this.getTableName(),
            columns: {
                contentColumnName: getContentColumnName(this.nodeData)
            },
            distanceStrategy: (this.nodeData.inputs?.distanceStrategy || 'cosine') as DistanceStrategy
        }
    }

    async instanciate(metadataFilters?: any) {
        return this.adaptInstance(await PGVectorStore.initialize(this.getEmbeddings(), await this.getArgs()), metadataFilters)
    }

    async fromDocuments(documents: Document[]) {
        const instance = await this.instanciate()

        await instance.addDocuments(documents)

        return this.adaptInstance(instance)
    }

    protected async adaptInstance(instance: PGVectorStore, metadataFilters?: any): Promise<PGVectorStore> {
        const { [FLOWISE_CHATID]: chatId, ...pgMetadataFilter } = metadataFilters || {}

        const baseSimilaritySearchVectorWithScoreFn = instance.similaritySearchVectorWithScore.bind(instance)

        instance.similaritySearchVectorWithScore = async (query, k, filter) => {
            return await baseSimilaritySearchVectorWithScoreFn(query, k, filter ?? pgMetadataFilter)
        }

        const basePoolQueryFn = instance.pool.query.bind(instance.pool)

        // @ts-ignore
        instance.pool.query = async (queryString: string, parameters: any[]) => {
            if (!instance.client) {
                instance.client = await instance.pool.connect()
            }

            const whereClauseRegex = /WHERE ([^\n]+)/
            let chatflowOr = ''

            // Match chatflow uploaded file and keep filtering on other files:
            // https://github.com/FlowiseAI/Flowise/pull/3367#discussion_r1804229295
            if (chatId) {
                parameters.push({ [FLOWISE_CHATID]: chatId })

                chatflowOr = `OR metadata @> $${parameters.length}`
            }

            if (queryString.match(whereClauseRegex)) {
                queryString = queryString.replace(whereClauseRegex, `WHERE (($1) AND NOT (metadata ? '${FLOWISE_CHATID}')) ${chatflowOr}`)
            } else {
                const orderByClauseRegex = /ORDER BY (.*)/
                // Insert WHERE clause before ORDER BY
                queryString = queryString.replace(
                    orderByClauseRegex,
                    `WHERE (metadata @> '{}' AND NOT (metadata ? '${FLOWISE_CHATID}')) ${chatflowOr}
                ORDER BY $1
                `
                )
            }

            // Run base function
            const queryResult = await basePoolQueryFn(queryString, parameters)

            // ensure connection is released
            instance.client.release()
            instance.client = undefined

            return queryResult
        }

        return instance
    }
}
*/
