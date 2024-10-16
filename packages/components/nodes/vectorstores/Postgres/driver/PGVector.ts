import { VectorStoreDriver } from './Base'
import { getCredentialData, getCredentialParam } from '../../../../src'
import { PGVectorStore, PGVectorStoreArgs } from '@langchain/community/vectorstores/pgvector'
import { Document } from '@langchain/core/documents'
import { PoolConfig } from 'pg'
import { VectorStore } from '@langchain/core/vectorstores'

export class PGVectorDriver extends VectorStoreDriver {
    static CONTENT_COLUMN_NAME_DEFAULT: string = 'pageContent'

    protected _postgresConnectionOptions: PoolConfig

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
                host: this.nodeData.inputs?.host as string,
                port: this.nodeData.inputs?.port as number,
                user: user,
                password: password,
                database: this.nodeData.inputs?.database as string
            }
        }

        return this._postgresConnectionOptions
    }

    async getArgs(): Promise<PGVectorStoreArgs> {
        return {
            postgresConnectionOptions: await this.getPostgresConnectionOptions(),
            tableName: this.getTableName(),
            columns: {
                contentColumnName: (this.nodeData.inputs?.contentColumnName || PGVectorDriver.CONTENT_COLUMN_NAME_DEFAULT) as string
            }
        }
    }

    async instanciate(metadataFilters?: any) {
        return this.adaptInstance(PGVectorStore.initialize(this.getEmbeddings(), await this.getArgs()), metadataFilters)
    }

    async fromDocuments(documents: Document[]) {
        const instance = await this.instanciate()

        await instance.addDocuments(documents)

        return this.adaptInstance(Promise.resolve(instance))
    }

    protected async adaptInstance(instancePromise: Promise<VectorStore>, metadataFilters?: any): Promise<VectorStore> {
        const instance = await instancePromise
        const baseFn = instance.similaritySearchVectorWithScore.bind(instance)

        instance.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            return await baseFn(query, k, filter ?? metadataFilters)
        }

        return instance
    }
}
