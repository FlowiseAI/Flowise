import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { flatten } from 'lodash'
import { ElasticVectorSearch } from 'langchain/vectorstores/elasticsearch'
import { Client, ClientOptions } from '@elastic/elasticsearch'

class ElasticSearchUpsert_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'ElasticSearch Upsert Document'
        this.name = 'elasticSearchUpsert'
        this.version = 1.0
        this.type = 'ElasticSearch'
        this.icon = 'elastic-icon.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to ElasticSearch'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['elasticSearchApi', 'elasticSearchUserPassword']
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
                label: 'Index Name',
                name: 'indexName',
                type: 'string'
            },
            {
                label: 'ElasticSearch URL',
                name: 'elasticSearchURL',
                type: 'string',
                optional: true
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
                label: 'ElasticSearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'ElasticSearch Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(ElasticVectorSearch)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const elasticSearchURL = nodeData.inputs?.elasticSearchURL as string
        const indexName = nodeData.inputs?.indexName as string
        const topK = nodeData.inputs?.topK as string

        const output = nodeData.outputs?.output as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const elasticSearchApiKey = getCredentialParam('elasticSearchApiKey', credentialData, nodeData)
        const elasticSearchUser = getCredentialParam('elasticSearchUser', credentialData, nodeData)
        const elasticSearchPassword = getCredentialParam('elasticSearchPassword', credentialData, nodeData)

        const config: ClientOptions = {
            node: elasticSearchURL
        }

        if (elasticSearchApiKey) config.auth = { apiKey: elasticSearchApiKey }
        else if (elasticSearchUser && elasticSearchPassword) config.auth = { username: elasticSearchUser, password: elasticSearchPassword }

        const client = new Client(config)

        const clientArgs = {
            client,
            indexName
        }

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await ElasticVectorSearch.fromDocuments(finalDocs, embeddings, clientArgs)

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

module.exports = { nodeClass: ElasticSearchUpsert_VectorStores }
