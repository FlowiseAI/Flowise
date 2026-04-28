import { flatten } from 'lodash'
import { Client } from '@opensearch-project/opensearch'
import { Document } from '@langchain/core/documents'
import { OpenSearchVectorStore } from '@langchain/community/vectorstores/opensearch'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class OpenSearch_VectorStores implements INode {
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
    outputs: INodeOutputsValue[]
    credential: INodeParams

    constructor() {
        this.label = 'OpenSearch'
        this.name = 'openSearch'
        this.version = 4.0
        this.type = 'OpenSearch'
        this.icon = 'opensearch.svg'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and perform similarity search upon query using OpenSearch, an open-source, all-in-one vector database`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openSearchUrl']
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
                label: 'Index Name',
                name: 'indexName',
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
            },
            {
                label: 'Engine',
                name: 'engine',
                type: 'options',
                description: 'Vector search engine. Use "lucene" or "faiss" for OpenSearch 3.x+, "nmslib" for older versions',
                options: [
                    { label: 'Lucene (OpenSearch 2.x+)', name: 'lucene' },
                    { label: 'Faiss (OpenSearch 2.x+)', name: 'faiss' },
                    { label: 'NMSLIB (Legacy, pre-3.0)', name: 'nmslib' }
                ],
                default: 'lucene',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Space Type',
                name: 'spaceType',
                type: 'options',
                description: 'Distance metric for similarity search',
                options: [
                    { label: 'L2 (Euclidean)', name: 'l2' },
                    { label: 'Cosine Similarity', name: 'cosinesimil' },
                    { label: 'Inner Product', name: 'innerproduct' }
                ],
                default: 'l2',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'OpenSearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'OpenSearch Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(OpenSearchVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const indexName = nodeData.inputs?.indexName as string
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const opensearchURL = getCredentialParam('openSearchUrl', credentialData, nodeData)
            const user = getCredentialParam('user', credentialData, nodeData)
            const password = getCredentialParam('password', credentialData, nodeData)

            const client = getOpenSearchClient(opensearchURL, user, password)

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                await OpenSearchVectorStore.fromDocuments(finalDocs, embeddings, {
                    client,
                    indexName: indexName,
                    vectorSearchOptions: getVectorSearchOptions(nodeData)
                })
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const indexName = nodeData.inputs?.indexName as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const opensearchURL = getCredentialParam('openSearchUrl', credentialData, nodeData)
        const user = getCredentialParam('user', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)

        const client = getOpenSearchClient(opensearchURL, user, password)

        const vectorStore = new OpenSearchVectorStore(embeddings, {
            client,
            indexName,
            vectorSearchOptions: getVectorSearchOptions(nodeData)
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

const getVectorSearchOptions = (nodeData: INodeData) => {
    const engine = (nodeData.inputs?.engine as string) || 'lucene'
    const spaceType = (nodeData.inputs?.spaceType as string) || 'l2'
    // TODO: Remove 'as any' casts when @langchain/community updates OpenSearchEngine types
    // to include 'lucene' and 'faiss' as valid engines (currently only has 'nmslib' | 'hnsw').
    return {
        engine: engine as any,
        spaceType: spaceType as any
    }
}

const getOpenSearchClient = (url: string, user?: string, password?: string): Client => {
    if (user && password) {
        const urlObj = new URL(url)
        urlObj.username = user
        urlObj.password = password
        url = urlObj.toString()
    }

    return new Client({
        nodes: [url]
    })
}

module.exports = { nodeClass: OpenSearch_VectorStores }
