import { VectorStore } from '@langchain/core/vectorstores'
import { ICommonObject, INodeData } from '../../../../src'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { getDatabase, getHost, getPort, getSSL, getTableName, getUser, getPassword } from '../utils'

export abstract class AAIVectorStoreDriver {
    constructor(protected nodeData: INodeData, protected options: ICommonObject) {}

    abstract instanciate(metaDataFilters?: any): Promise<VectorStore>

    abstract fromDocuments(documents: Document[]): Promise<VectorStore>

    protected async adaptInstance(instance: VectorStore, _metaDataFilters?: any): Promise<VectorStore> {
        return instance
    }

    getHost() {
        return getHost() as string
    }

    getPort() {
        return getPort() as number
    }

    getSSL() {
        return getSSL() as boolean
    }

    getDatabase() {
        return getDatabase() as string
    }

    getUser() {
        return getUser() as string
    }

    getPassword() {
        return getPassword() as string
    }

    getTableName() {
        return this.sanitizeTableName(getTableName())
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
}
