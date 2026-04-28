import { VectorStore } from '@langchain/core/vectorstores'
import { getCredentialData, getCredentialParam, ICommonObject, INodeData } from '../../../../src'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { getDatabase, getHost, getPort, getSchemaName, getSSL, getTableName } from '../utils'

export abstract class VectorStoreDriver {
    constructor(protected nodeData: INodeData, protected options: ICommonObject) {}

    abstract instanciate(metaDataFilters?: any): Promise<VectorStore>

    abstract fromDocuments(documents: Document[]): Promise<VectorStore>

    protected async adaptInstance(instance: VectorStore, _metaDataFilters?: any): Promise<VectorStore> {
        return instance
    }

    getHost() {
        return getHost(this.nodeData) as string
    }

    getPort() {
        return getPort(this.nodeData) as number
    }

    getSSL() {
        return getSSL(this.nodeData) as boolean
    }

    getDatabase() {
        return getDatabase(this.nodeData) as string
    }

    getTableName() {
        return this.sanitizeTableName(getTableName(this.nodeData))
    }

    getSchemaName() {
        const schemaName = getSchemaName(this.nodeData)
        return schemaName ? this.sanitizeTableName(schemaName) : undefined
    }

    getTablePath() {
        const schemaName = this.getSchemaName()
        const tableName = this.getTableName()
        if (!schemaName) return `"${tableName}"`
        return `"${schemaName}"."${tableName}"`
    }

    getEmbeddings() {
        return this.nodeData.inputs?.embeddings as Embeddings
    }

    sanitizeTableName(tableName: string): string {
        // Trim and normalize case, turn whitespace into underscores
        tableName = tableName.trim().toLowerCase().replace(/\s+/g, '_')

        // Validate using a regex (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name')
        }

        return tableName
    }

    async getCredentials() {
        const credentialData = await getCredentialData(this.nodeData.credential ?? '', this.options)
        const user = getCredentialParam('user', credentialData, this.nodeData, process.env.POSTGRES_VECTORSTORE_USER)
        const password = getCredentialParam('password', credentialData, this.nodeData, process.env.POSTGRES_VECTORSTORE_PASSWORD)

        return {
            user,
            password
        }
    }
}
