import {
    BaseNode,
    Document,
    Metadata,
    IEmbedModel,
    VectorStoreBase,
    VectorStoreNoEmbedModel,
    VectorStoreQuery,
    VectorStoreQueryResult,
    serviceContextFromDefaults,
    storageContextFromDefaults,
    VectorStoreIndex,
    BaseEmbedding
} from 'llamaindex'
import { FetchResponse, Index, Pinecone, ScoredPineconeRecord } from '@pinecone-database/pinecone'
import { flatten } from 'lodash'
import { Document as LCDocument } from 'langchain/document'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { flattenObject, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'

class PineconeLlamaIndex_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Pinecone'
        this.name = 'pineconeLlamaIndex'
        this.version = 1.0
        this.type = 'Pinecone'
        this.icon = 'pinecone.svg'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and perform similarity search upon query using Pinecone, a leading fully managed hosted vector database`
        this.baseClasses = [this.type, 'VectorIndexRetriever']
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pineconeApi']
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
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Pinecone Namespace',
                name: 'pineconeNamespace',
                type: 'string',
                placeholder: 'my-first-namespace',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'pineconeMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Pinecone Vector Store Index',
                name: 'vectorStore',
                baseClasses: [this.type, 'VectorStoreIndex']
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const indexName = nodeData.inputs?.pineconeIndex as string
            const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
            const docs = nodeData.inputs?.document as LCDocument[]
            const embeddings = nodeData.inputs?.embeddings as BaseEmbedding
            const model = nodeData.inputs?.model

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)

            const pcvs = new PineconeVectorStore({
                indexName,
                apiKey: pineconeApiKey,
                namespace: pineconeNamespace,
                embedModel: embeddings
            })

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new LCDocument(flattenDocs[i]))
                }
            }

            const llamadocs: Document[] = []
            for (const doc of finalDocs) {
                llamadocs.push(new Document({ text: doc.pageContent, metadata: doc.metadata }))
            }

            const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
            const storageContext = await storageContextFromDefaults({ vectorStore: pcvs })

            try {
                await VectorStoreIndex.fromDocuments(llamadocs, { serviceContext, storageContext })
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const indexName = nodeData.inputs?.pineconeIndex as string
        const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
        const pineconeMetadataFilter = nodeData.inputs?.pineconeMetadataFilter
        const embeddings = nodeData.inputs?.embeddings as BaseEmbedding
        const model = nodeData.inputs?.model
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)

        const obj: PineconeParams = {
            indexName,
            apiKey: pineconeApiKey,
            embedModel: embeddings
        }

        if (pineconeNamespace) obj.namespace = pineconeNamespace

        let metadatafilter = {}
        if (pineconeMetadataFilter) {
            metadatafilter = typeof pineconeMetadataFilter === 'object' ? pineconeMetadataFilter : parseJsonBody(pineconeMetadataFilter)
            obj.queryFilter = metadatafilter
        }

        const pcvs = new PineconeVectorStore(obj)

        const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
        const storageContext = await storageContextFromDefaults({ vectorStore: pcvs })

        const index = await VectorStoreIndex.init({
            nodes: [],
            storageContext,
            serviceContext
        })

        const output = nodeData.outputs?.output as string

        if (output === 'retriever') {
            const retriever = index.asRetriever()
            retriever.similarityTopK = k
            ;(retriever as any).serviceContext = serviceContext
            return retriever
        } else if (output === 'vectorStore') {
            ;(index as any).k = k
            if (metadatafilter) {
                ;(index as any).metadatafilter = metadatafilter
            }
            return index
        }
        return index
    }
}

type PineconeParams = {
    indexName: string
    apiKey: string
    namespace?: string
    chunkSize?: number
    queryFilter?: object
} & IEmbedModel

class PineconeVectorStore extends VectorStoreBase implements VectorStoreNoEmbedModel {
    storesText: boolean = true
    db?: Pinecone
    indexName: string
    apiKey: string
    chunkSize: number
    namespace?: string
    queryFilter?: object

    constructor(params: PineconeParams) {
        super(params?.embedModel)
        this.indexName = params?.indexName
        this.apiKey = params?.apiKey
        this.namespace = params?.namespace ?? ''
        this.chunkSize = params?.chunkSize ?? Number.parseInt(process.env.PINECONE_CHUNK_SIZE ?? '100')
        this.queryFilter = params?.queryFilter ?? {}
    }

    private async getDb(): Promise<Pinecone> {
        if (!this.db) {
            this.db = new Pinecone({
                apiKey: this.apiKey
            })
        }
        return Promise.resolve(this.db)
    }

    client() {
        return this.getDb()
    }

    async index() {
        const db: Pinecone = await this.getDb()
        return db.Index(this.indexName)
    }

    async clearIndex() {
        const db: Pinecone = await this.getDb()
        return await db.index(this.indexName).deleteAll()
    }

    async add(embeddingResults: BaseNode<Metadata>[]): Promise<string[]> {
        if (embeddingResults.length == 0) {
            return Promise.resolve([])
        }

        const idx: Index = await this.index()
        const nodes = embeddingResults.map(this.nodeToRecord)

        for (let i = 0; i < nodes.length; i += this.chunkSize) {
            const chunk = nodes.slice(i, i + this.chunkSize)
            const result = await this.saveChunk(idx, chunk)
            if (!result) {
                return Promise.reject()
            }
        }
        return Promise.resolve([])
    }

    protected async saveChunk(idx: Index, chunk: any) {
        try {
            const namespace = idx.namespace(this.namespace ?? '')
            await namespace.upsert(chunk)
            return true
        } catch (err) {
            return false
        }
    }

    async delete(refDocId: string): Promise<void> {
        const idx = await this.index()
        const namespace = idx.namespace(this.namespace ?? '')
        return namespace.deleteOne(refDocId)
    }

    async query(query: VectorStoreQuery): Promise<VectorStoreQueryResult> {
        const queryOptions: any = {
            vector: query.queryEmbedding,
            topK: query.similarityTopK
        }

        if (this.queryFilter && Object.keys(this.queryFilter).length > 0) {
            queryOptions.filter = this.queryFilter
        }

        const idx = await this.index()
        const namespace = idx.namespace(this.namespace ?? '')
        const results = await namespace.query(queryOptions)

        const idList = results.matches.map((row) => row.id)
        const records: FetchResponse<any> = await namespace.fetch(idList)
        const rows = Object.values(records.records)

        const nodes = rows.map((row) => {
            return new Document({
                id_: row.id,
                text: this.textFromResultRow(row),
                metadata: this.metaWithoutText(row.metadata),
                embedding: row.values
            })
        })

        const result = {
            nodes: nodes,
            similarities: results.matches.map((row) => row.score || 999),
            ids: results.matches.map((row) => row.id)
        }

        return Promise.resolve(result)
    }

    /**
     * Required by VectorStore interface. Currently ignored.
     */
    persist(): Promise<void> {
        return Promise.resolve()
    }

    textFromResultRow(row: ScoredPineconeRecord<Metadata>): string {
        return row.metadata?.text ?? ''
    }

    metaWithoutText(meta: Metadata): any {
        return Object.keys(meta)
            .filter((key) => key != 'text')
            .reduce((acc: any, key: string) => {
                acc[key] = meta[key]
                return acc
            }, {})
    }

    nodeToRecord(node: BaseNode<Metadata>) {
        let id: any = node.id_.length ? node.id_ : null
        return {
            id: id,
            values: node.getEmbedding(),
            metadata: {
                ...cleanupMetadata(node.metadata),
                text: (node as any).text
            }
        }
    }
}

const cleanupMetadata = (nodeMetadata: ICommonObject) => {
    // Pinecone doesn't support nested objects, so we flatten them
    const documentMetadata: any = { ...nodeMetadata }
    // preserve string arrays which are allowed
    const stringArrays: Record<string, string[]> = {}
    for (const key of Object.keys(documentMetadata)) {
        if (Array.isArray(documentMetadata[key]) && documentMetadata[key].every((el: any) => typeof el === 'string')) {
            stringArrays[key] = documentMetadata[key]
            delete documentMetadata[key]
        }
    }
    const metadata: {
        [key: string]: string | number | boolean | string[] | null
    } = {
        ...flattenObject(documentMetadata),
        ...stringArrays
    }
    // Pinecone doesn't support null values, so we remove them
    for (const key of Object.keys(metadata)) {
        if (metadata[key] == null) {
            delete metadata[key]
        } else if (typeof metadata[key] === 'object' && Object.keys(metadata[key] as unknown as object).length === 0) {
            delete metadata[key]
        }
    }
    return metadata
}

module.exports = { nodeClass: PineconeLlamaIndex_VectorStores }
