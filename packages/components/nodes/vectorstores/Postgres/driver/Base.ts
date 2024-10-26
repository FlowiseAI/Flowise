import { VectorStore } from '@langchain/core/vectorstores'
import { getCredentialData, getCredentialParam, ICommonObject, INodeData } from '../../../../src'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { getDatabase, getHost, getPort, getTableName } from '../utils'

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

    getDatabase() {
        return getDatabase(this.nodeData) as string
    }

    getTableName() {
        return getTableName(this.nodeData)
    }

    getEmbeddings() {
        return this.nodeData.inputs?.embeddings as Embeddings
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
