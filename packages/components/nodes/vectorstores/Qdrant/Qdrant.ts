import { flatten } from 'lodash'
import { QdrantClient } from '@qdrant/js-client-rest'
import { VectorStoreRetrieverInput } from 'langchain/vectorstores/base'
import { Document } from 'langchain/document'
import { QdrantVectorStore, QdrantLibArgs } from 'langchain/vectorstores/qdrant'
import { Embeddings } from 'langchain/embeddings/base'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

type RetrieverConfig = Partial<VectorStoreRetrieverInput<QdrantVectorStore>>

class Qdrant_VectorStores implements INode {
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
        this.label = 'Qdrant'
        this.name = 'qdrant'
        this.version = 1.0
        this.type = 'Qdrant'
        this.icon = 'qdrant.png'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity search upon query using Qdrant, a scalable open source vector database written in Rust'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed when using Qdrant cloud hosted',
            optional: true,
            credentialNames: ['qdrantApi']
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
                label: 'Qdrant Server URL',
                name: 'qdrantServerUrl',
                type: 'string',
                placeholder: 'http://localhost:6333'
            },
            {
                label: 'Qdrant Collection Name',
                name: 'qdrantCollection',
                type: 'string'
            },
            {
                label: 'Vector Dimension',
                name: 'qdrantVectorDimension',
                type: 'number',
                default: 1536,
                additionalParams: true
            },
            {
                label: 'Similarity',
                name: 'qdrantSimilarity',
                description: 'Similarity measure used in Qdrant.',
                type: 'options',
                default: 'Cosine',
                options: [
                    {
                        label: 'Cosine',
                        name: 'Cosine'
                    },
                    {
                        label: 'Euclid',
                        name: 'Euclid'
                    },
                    {
                        label: 'Dot',
                        name: 'Dot'
                    }
                ],
                additionalParams: true
            },
            {
                label: 'Additional Collection Cofiguration',
                name: 'qdrantCollectionConfiguration',
                description:
                    'Refer to <a target="_blank" href="https://qdrant.tech/documentation/concepts/collections">collection docs</a> for more reference',
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
            },
            {
                label: 'Qdrant Search Filter',
                name: 'qdrantFilter',
                description: 'Only return points which satisfy the conditions',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Qdrant Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Qdrant Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(QdrantVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
            const collectionName = nodeData.inputs?.qdrantCollection as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
            const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

            const client = new QdrantClient({
                url: qdrantServerUrl,
                apiKey: qdrantApiKey
            })

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const dbConfig: QdrantLibArgs = {
                client,
                url: qdrantServerUrl,
                collectionName,
                collectionConfig: {
                    vectors: {
                        size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                        distance: qdrantSimilarity ?? 'Cosine'
                    }
                }
            }

            try {
                await QdrantVectorStore.fromDocuments(finalDocs, embeddings, dbConfig)
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
        const collectionName = nodeData.inputs?.qdrantCollection as string
        let qdrantCollectionConfiguration = nodeData.inputs?.qdrantCollectionConfiguration
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
        const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        let queryFilter = nodeData.inputs?.queryFilter

        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

        const client = new QdrantClient({
            url: qdrantServerUrl,
            apiKey: qdrantApiKey
        })

        const dbConfig: QdrantLibArgs = {
            client,
            collectionName
        }

        const retrieverConfig: RetrieverConfig = {
            k
        }

        if (qdrantCollectionConfiguration) {
            qdrantCollectionConfiguration =
                typeof qdrantCollectionConfiguration === 'object'
                    ? qdrantCollectionConfiguration
                    : JSON.parse(qdrantCollectionConfiguration)
            dbConfig.collectionConfig = {
                ...qdrantCollectionConfiguration,
                vectors: {
                    ...qdrantCollectionConfiguration.vectors,
                    size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                    distance: qdrantSimilarity ?? 'Cosine'
                }
            }
        }

        if (queryFilter) {
            retrieverConfig.filter = typeof queryFilter === 'object' ? queryFilter : JSON.parse(queryFilter)
        }

        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, dbConfig)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(retrieverConfig)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: Qdrant_VectorStores }
