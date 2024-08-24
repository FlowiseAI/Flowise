import { flatten } from 'lodash'
import { DataType, ErrorCode, MetricType, IndexType } from '@zilliz/milvus2-sdk-node'
import { Document } from '@langchain/core/documents'
import { MilvusLibArgs, Milvus } from '@langchain/community/vectorstores/milvus'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

interface InsertRow {
    [x: string]: string | number[]
}

class Milvus_VectorStores implements INode {
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
        this.label = 'Milvus'
        this.name = 'milvus'
        this.version = 1.0
        this.type = 'Milvus'
        this.icon = 'milvus.svg'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and perform similarity search upon query using Milvus, world's most advanced open-source vector database`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['milvusAuth']
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
                label: 'Milvus Server URL',
                name: 'milvusServerUrl',
                type: 'string',
                placeholder: 'http://localhost:19530'
            },
            {
                label: 'Milvus Collection Name',
                name: 'milvusCollection',
                type: 'string'
            },
            {
                label: 'Milvus Text Field',
                name: 'milvusTextField',
                type: 'string',
                placeholder: 'langchain_text',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Milvus Filter',
                name: 'milvusFilter',
                type: 'string',
                optional: true,
                description:
                    'Filter data with a simple string query. Refer Milvus <a target="_blank" href="https://milvus.io/blog/2022-08-08-How-to-use-string-data-to-empower-your-similarity-search-applications.md#Hybrid-search">docs</a> for more details.',
                placeholder: 'doc=="a"',
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
                label: 'Milvus Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Milvus Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Milvus)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            // server setup
            const address = nodeData.inputs?.milvusServerUrl as string
            const collectionName = nodeData.inputs?.milvusCollection as string

            // embeddings
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            // credential
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const milvusUser = getCredentialParam('milvusUser', credentialData, nodeData)
            const milvusPassword = getCredentialParam('milvusPassword', credentialData, nodeData)

            // init MilvusLibArgs
            const milVusArgs: MilvusLibArgs = {
                url: address,
                collectionName: collectionName
            }

            if (milvusUser) milVusArgs.username = milvusUser
            if (milvusPassword) milVusArgs.password = milvusPassword

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                const vectorStore = await MilvusUpsert.fromDocuments(finalDocs, embeddings, milVusArgs)

                // Avoid Illegal Invocation
                vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: string) => {
                    return await similaritySearchVectorWithScore(query, k, vectorStore, undefined, filter)
                }

                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // server setup
        const address = nodeData.inputs?.milvusServerUrl as string
        const collectionName = nodeData.inputs?.milvusCollection as string
        const milvusFilter = nodeData.inputs?.milvusFilter as string
        const textField = nodeData.inputs?.milvusTextField as string

        // embeddings
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string

        // output
        const output = nodeData.outputs?.output as string

        // format data
        const k = topK ? parseFloat(topK) : 4

        // credential
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const milvusUser = getCredentialParam('milvusUser', credentialData, nodeData)
        const milvusPassword = getCredentialParam('milvusPassword', credentialData, nodeData)

        // init MilvusLibArgs
        const milVusArgs: MilvusLibArgs = {
            url: address,
            collectionName: collectionName,
            textField: textField
        }

        if (milvusUser) milVusArgs.username = milvusUser
        if (milvusPassword) milVusArgs.password = milvusPassword

        const vectorStore = await Milvus.fromExistingCollection(embeddings, milVusArgs)

        // Avoid Illegal Invocation
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: string) => {
            return await similaritySearchVectorWithScore(query, k, vectorStore, milvusFilter, filter)
        }

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            if (milvusFilter) {
                ;(vectorStore as any).filter = milvusFilter
            }
            return vectorStore
        }
        return vectorStore
    }
}

const checkJsonString = (value: string): { isJson: boolean; obj: any } => {
    try {
        const result = JSON.parse(value)
        return { isJson: true, obj: result }
    } catch (e) {
        return { isJson: false, obj: null }
    }
}

const similaritySearchVectorWithScore = async (query: number[], k: number, vectorStore: Milvus, milvusFilter?: string, filter?: string) => {
    const hasColResp = await vectorStore.client.hasCollection({
        collection_name: vectorStore.collectionName
    })
    if (hasColResp.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Error checking collection: ${hasColResp}`)
    }
    if (hasColResp.value === false) {
        throw new Error(`Collection not found: ${vectorStore.collectionName}, please create collection before search.`)
    }

    const filterStr = milvusFilter ?? filter ?? ''

    await vectorStore.grabCollectionFields()

    const loadResp = await vectorStore.client.loadCollectionSync({
        collection_name: vectorStore.collectionName
    })

    if (loadResp.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Error loading collection: ${loadResp}`)
    }

    const outputFields = vectorStore.fields.filter((field) => field !== vectorStore.vectorField)

    const search_params: any = {
        anns_field: vectorStore.vectorField,
        topk: k.toString(),
        metric_type: vectorStore.indexCreateParams.metric_type,
        params: vectorStore.indexSearchParams
    }
    const searchResp = await vectorStore.client.search({
        collection_name: vectorStore.collectionName,
        search_params,
        output_fields: outputFields,
        vector_type: DataType.FloatVector,
        vectors: [query],
        filter: filterStr
    })
    if (searchResp.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Error searching data: ${JSON.stringify(searchResp)}`)
    }
    const results: [Document, number][] = []
    searchResp.results.forEach((result) => {
        const fields = {
            pageContent: '',
            metadata: {} as Record<string, any>
        }
        Object.keys(result).forEach((key) => {
            if (key === vectorStore.textField) {
                fields.pageContent = result[key]
            } else if (vectorStore.fields.includes(key) || key === vectorStore.primaryField) {
                if (typeof result[key] === 'string') {
                    const { isJson, obj } = checkJsonString(result[key])
                    fields.metadata[key] = isJson ? obj : result[key]
                } else {
                    fields.metadata[key] = result[key]
                }
            }
        })
        results.push([new Document(fields), result.score])
    })
    return results
}

class MilvusUpsert extends Milvus {
    async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
        if (vectors.length === 0) {
            return
        }
        await this.ensureCollection(vectors, documents)

        const insertDatas: InsertRow[] = []

        for (let index = 0; index < vectors.length; index++) {
            const vec = vectors[index]
            const doc = documents[index]
            const data: InsertRow = {
                [this.textField]: doc.pageContent,
                [this.vectorField]: vec
            }
            this.fields.forEach((field) => {
                switch (field) {
                    case this.primaryField:
                        if (!this.autoId) {
                            if (doc.metadata[this.primaryField] === undefined) {
                                throw new Error(
                                    `The Collection's primaryField is configured with autoId=false, thus its value must be provided through metadata.`
                                )
                            }
                            data[field] = doc.metadata[this.primaryField]
                        }
                        break
                    case this.textField:
                        data[field] = doc.pageContent
                        break
                    case this.vectorField:
                        data[field] = vec
                        break
                    default: // metadata fields
                        if (doc.metadata[field] === undefined) {
                            throw new Error(`The field "${field}" is not provided in documents[${index}].metadata.`)
                        } else if (typeof doc.metadata[field] === 'object') {
                            data[field] = JSON.stringify(doc.metadata[field])
                        } else {
                            data[field] = doc.metadata[field]
                        }
                        break
                }
            })

            insertDatas.push(data)
        }

        const descIndexResp = await this.client.describeIndex({
            collection_name: this.collectionName
        })

        if (descIndexResp.status.error_code === ErrorCode.IndexNotExist) {
            const resp = await this.client.createIndex({
                collection_name: this.collectionName,
                field_name: this.vectorField,
                index_name: `myindex_${Date.now().toString()}`,
                index_type: IndexType.AUTOINDEX,
                metric_type: MetricType.L2
            })
            if (resp.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error creating index`)
            }
        }

        const insertResp = await this.client.insert({
            collection_name: this.collectionName,
            fields_data: insertDatas
        })

        if (insertResp.status.error_code !== ErrorCode.SUCCESS) {
            throw new Error(`Error inserting data: ${JSON.stringify(insertResp)}`)
        }

        await this.client.flushSync({ collection_names: [this.collectionName] })
    }
}

module.exports = { nodeClass: Milvus_VectorStores }
