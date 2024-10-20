import { flatten } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { SupabaseVectorStore, SupabaseLibArgs, SupabaseFilterRPCCall } from '@langchain/community/vectorstores/supabase'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'

class Supabase_VectorStores implements INode {
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
        this.label = 'Supabase'
        this.name = 'supabase'
        this.version = 4.0
        this.type = 'Supabase'
        this.icon = 'supabase.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity or mmr search upon query using Supabase via pgvector extension'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
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
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true
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
                label: 'Supabase Metadata Filter',
                name: 'supabaseMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Supabase RPC Filter',
                name: 'supabaseRPCFilter',
                type: 'string',
                rows: 4,
                placeholder: `filter("metadata->a::int", "gt", 5)
.filter("metadata->c::int", "gt", 7)
.filter("metadata->>stuff", "eq", "right");`,
                description:
                    'Query builder-style filtering. If this is set, will override the metadata filter. Refer <a href="https://js.langchain.com/v0.1/docs/integrations/vectorstores/supabase/#metadata-query-builder-filtering" target="_blank">here</a> for more information',
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
        addMMRInputParams(this.inputs)
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

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const supabaseProjUrl = nodeData.inputs?.supabaseProjUrl as string
            const tableName = nodeData.inputs?.tableName as string
            const queryName = nodeData.inputs?.queryName as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const supabaseApiKey = getCredentialParam('supabaseApiKey', credentialData, nodeData)

            const client = createClient(supabaseProjUrl, supabaseApiKey)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                if (recordManager) {
                    const vectorStore = await SupabaseUpsertVectorStore.fromExistingIndex(embeddings, {
                        client,
                        tableName: tableName,
                        queryName: queryName
                    })
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: tableName + '_' + queryName
                        }
                    })
                    return res
                } else {
                    await SupabaseUpsertVectorStore.fromDocuments(finalDocs, embeddings, {
                        client,
                        tableName: tableName,
                        queryName: queryName
                    })
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const supabaseProjUrl = nodeData.inputs?.supabaseProjUrl as string
            const tableName = nodeData.inputs?.tableName as string
            const queryName = nodeData.inputs?.queryName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const supabaseApiKey = getCredentialParam('supabaseApiKey', credentialData, nodeData)

            const client = createClient(supabaseProjUrl, supabaseApiKey)

            const supabaseStore = new SupabaseVectorStore(embeddings, {
                client,
                tableName: tableName,
                queryName: queryName
            })

            try {
                if (recordManager) {
                    const vectorStoreName = tableName + '_' + queryName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const keys: string[] = await recordManager.listKeys({})

                    await supabaseStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await supabaseStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const supabaseProjUrl = nodeData.inputs?.supabaseProjUrl as string
        const tableName = nodeData.inputs?.tableName as string
        const queryName = nodeData.inputs?.queryName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const supabaseMetadataFilter = nodeData.inputs?.supabaseMetadataFilter
        const supabaseRPCFilter = nodeData.inputs?.supabaseRPCFilter

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const supabaseApiKey = getCredentialParam('supabaseApiKey', credentialData, nodeData)

        const client = createClient(supabaseProjUrl, supabaseApiKey)

        const obj: SupabaseLibArgs = {
            client,
            tableName,
            queryName
        }

        if (supabaseMetadataFilter) {
            const metadatafilter = typeof supabaseMetadataFilter === 'object' ? supabaseMetadataFilter : JSON.parse(supabaseMetadataFilter)
            obj.filter = metadatafilter
        }

        if (supabaseRPCFilter) {
            const funcString = `return rpc.${supabaseRPCFilter};`
            const funcFilter = new Function('rpc', funcString)
            obj.filter = (rpc: SupabaseFilterRPCCall) => {
                return funcFilter(rpc)
            }
        }

        const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, obj)

        return resolveVectorStoreOrRetriever(nodeData, vectorStore, obj.filter)
    }
}

class SupabaseUpsertVectorStore extends SupabaseVectorStore {
    async addVectors(vectors: number[][], documents: Document[], options?: { ids?: string[] | number[] }): Promise<string[]> {
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
            const chunk = rows.slice(i, i + this.upsertBatchSize).map((row, j) => {
                if (options?.ids) {
                    return { id: options.ids[i + j], ...row }
                }
                return row
            })

            let res = await this.client.from(this.tableName).upsert(chunk).select()

            if (res.error) {
                // If the error is due to null value in column "id", we will generate a new id for the row
                if (res.error.message.includes(`null value in column "id"`)) {
                    const chunk = rows.slice(i, i + this.upsertBatchSize).map((row, y) => {
                        if (options?.ids) {
                            return { id: options.ids[i + y], ...row }
                        }
                        return { id: uuidv4(), ...row }
                    })
                    res = await this.client.from(this.tableName).upsert(chunk).select()

                    if (res.error) {
                        throw new Error(`Error inserting: ${res.error.message} ${res.status} ${res.statusText}`)
                    }
                } else {
                    throw new Error(`Error inserting: ${res.error.message} ${res.status} ${res.statusText}`)
                }
            }

            if (res.data) {
                returnedIds = returnedIds.concat(res.data.map((row) => row.id))
            }
        }

        return returnedIds
    }
}

module.exports = { nodeClass: Supabase_VectorStores }
