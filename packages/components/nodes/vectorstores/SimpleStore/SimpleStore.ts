import path from 'path'
import { flatten } from 'lodash'
import { storageContextFromDefaults, serviceContextFromDefaults, VectorStoreIndex, Document } from 'llamaindex'
import { Document as LCDocument } from 'langchain/document'
import { INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getUserHome } from '../../../src'

class SimpleStoreUpsert_LlamaIndex_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'SimpleStore'
        this.name = 'simpleStoreLlamaIndex'
        this.version = 1.0
        this.type = 'SimpleVectorStore'
        this.icon = 'simplevs.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data to local path and perform similarity search'
        this.baseClasses = [this.type, 'VectorIndexRetriever']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'BaseEmbedding_LlamaIndex'
            },
            {
                label: 'Base Path to store',
                name: 'basePath',
                description:
                    'Path to store persist embeddings indexes with persistence. If not specified, default to same path where database is stored',
                type: 'string',
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'SimpleStore Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'SimpleStore Vector Store Index',
                name: 'vectorStore',
                baseClasses: [this.type, 'VectorStoreIndex']
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData): Promise<Partial<IndexingResult>> {
            const basePath = nodeData.inputs?.basePath as string
            const docs = nodeData.inputs?.document as LCDocument[]
            const embeddings = nodeData.inputs?.embeddings
            const model = nodeData.inputs?.model

            let filePath = ''
            if (!basePath) filePath = path.join(getUserHome(), '.flowise', 'llamaindex')
            else filePath = basePath

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                finalDocs.push(new LCDocument(flattenDocs[i]))
            }

            const llamadocs: Document[] = []
            for (const doc of finalDocs) {
                llamadocs.push(new Document({ text: doc.pageContent, metadata: doc.metadata }))
            }

            const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
            const storageContext = await storageContextFromDefaults({ persistDir: filePath })

            try {
                await VectorStoreIndex.fromDocuments(llamadocs, { serviceContext, storageContext })
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData): Promise<any> {
        const basePath = nodeData.inputs?.basePath as string
        const embeddings = nodeData.inputs?.embeddings
        const model = nodeData.inputs?.model
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        let filePath = ''
        if (!basePath) filePath = path.join(getUserHome(), '.flowise', 'llamaindex')
        else filePath = basePath

        const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
        const storageContext = await storageContextFromDefaults({ persistDir: filePath })

        const index = await VectorStoreIndex.init({ storageContext, serviceContext })

        const output = nodeData.outputs?.output as string

        if (output === 'retriever') {
            const retriever = index.asRetriever()
            retriever.similarityTopK = k
            ;(retriever as any).serviceContext = serviceContext
            return retriever
        } else if (output === 'vectorStore') {
            ;(index as any).k = k
            return index
        }
        return index
    }
}

module.exports = { nodeClass: SimpleStoreUpsert_LlamaIndex_VectorStores }
