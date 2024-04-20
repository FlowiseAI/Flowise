import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient } from '@supabase/supabase-js'
import { flatten } from 'lodash'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class SupabaseUpsert_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Supabase Upsert Document'
        this.name = 'supabaseUpsert'
        this.version = 1.0
        this.type = 'Supabase'
        this.icon = 'supabase.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Supabase'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'DEPRECATING'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['supabaseApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Supabase Project URL',
                name: 'supabaseProjUrl',
                type: 'string'
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string'
            },
            {
                label: 'Query Name',
                name: 'queryName',
                type: 'string'
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
                label: 'Supabase Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Supabase Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(SupabaseVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const supabaseProjUrl = nodeData.inputs?.supabaseProjUrl as string
        const tableName = nodeData.inputs?.tableName as string
        const queryName = nodeData.inputs?.queryName as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const supabaseApiKey = getCredentialParam('supabaseApiKey', credentialData, nodeData)

        const client = createClient(supabaseProjUrl, supabaseApiKey)

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await SupabaseUpsertVectorStore.fromDocuments(finalDocs, embeddings, {
            client,
            tableName: tableName,
            queryName: queryName
        })

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

class SupabaseUpsertVectorStore extends SupabaseVectorStore {
    async addVectors(vectors: number[][], documents: Document[]): Promise<string[]> {
        if (vectors.length === 0) {
            return []
        }
        const rows = vectors.map((embedding, idx) => ({
            content: documents[idx].pageContent,
            embedding,
            metadata: documents[idx].metadata
        }))

        let returnedIds: string[] = []
        for (let i = 0; i < rows.length; i += this.upsertBatchSize) {
            const chunk = rows.slice(i, i + this.upsertBatchSize).map((row, index) => {
                return { id: index, ...row }
            })

            const res = await this.client.from(this.tableName).upsert(chunk).select()
            if (res.error) {
                throw new Error(`Error inserting: ${res.error.message} ${res.status} ${res.statusText}`)
            }
            if (res.data) {
                returnedIds = returnedIds.concat(res.data.map((row) => row.id))
            }
        }
        return returnedIds
    }
}

module.exports = { nodeClass: SupabaseUpsert_VectorStores }
