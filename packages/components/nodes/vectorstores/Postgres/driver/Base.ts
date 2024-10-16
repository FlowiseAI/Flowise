import { VectorStore } from '@langchain/core/vectorstores'
import { ICommonObject, INodeData } from '../../../../src'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'

export abstract class VectorStoreDriver {
    constructor(protected nodeData: INodeData, protected options: ICommonObject) {}

    abstract instanciate(metaDataFilters?: any): Promise<VectorStore>

    abstract fromDocuments(documents: Document[]): Promise<VectorStore>

    protected adaptInstance(instance: Promise<VectorStore>, _metaDataFilters?: any): Promise<VectorStore> {
        return instance
    }

    getTableName() {
        const _tableName = this.nodeData.inputs?.tableName as string

        return _tableName ? _tableName : 'documents'
    }

    getEmbeddings() {
        return this.nodeData.inputs?.embeddings as Embeddings
    }
}
