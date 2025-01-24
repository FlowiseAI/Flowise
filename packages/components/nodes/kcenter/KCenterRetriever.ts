import { BaseRetriever, BaseRetrieverInput } from '@langchain/core/retrievers'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../src/Interface'
import { Document } from '@langchain/core/documents'
import axios from 'axios'
import { getCredentialData, getCredentialParam, ICommonObject } from '../../src'

class KCenter_Retrievers implements INode {
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
        this.label = 'KAI Retriever'
        this.name = 'kaiRetriever'
        this.version = 1.0
        this.type = 'KAI Vector Store Retriever'
        this.icon = 'logo.svg'
        this.category = 'KCenter'
        this.description = 'Return results from KAI VectoreStore'
        this.baseClasses = [this.type, 'BaseRetriever']
        ;(this.credential = {
            label: 'KAI Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['kcenterVsApi'],
            optional: true
        }),
            (this.inputs = [
                /*
            {
                label: 'KAI URL',
                name: 'connectionString',
                type: 'string',
                placeholder: 'Your connection string here',
                optional: true
            },
            {
                label: 'KAI API-Key',
                name: 'apiKey',
                type: 'string',
                placeholder: 'api-key',
                optional: true
            },
            */
                {
                    label: 'KAI KnowledgeBase',
                    name: 'collectionName',
                    type: 'string',
                    placeholder: 'my_collection'
                },
                {
                    label: 'Query',
                    name: 'query',
                    type: 'string',
                    description: 'Query to retrieve documents from retriever. If not specified, user question will be used',
                    optional: true,
                    acceptVariable: true
                },
                {
                    label: 'Language',
                    name: 'language',
                    type: 'string',
                    description: 'Language to use',
                    optional: true,
                    acceptVariable: true
                },
                {
                    label: 'Top K',
                    name: 'topK',
                    description: 'Number of top results to fetch. Default to vector store topK',
                    placeholder: '1',
                    type: 'number',
                    optional: true,
                    acceptVariable: true
                }
            ])
        this.outputs = [
            {
                label: 'Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and content',
                baseClasses: ['Document', 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from content of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const DEFAULT_TOP_K: number = 1

        console.debug('Input data: ', nodeData.inputs)

        //const connectionString = nodeData.inputs?.connectionString as string
        //const apiKey = nodeData.inputs?.apiKey as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const connectionString = getCredentialParam('baseUrl', credentialData, nodeData)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const collectionName = nodeData.inputs?.collectionName as string
        const language = nodeData.inputs?.language as string
        const query = nodeData.inputs?.query as string

        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : DEFAULT_TOP_K
        const output = nodeData.outputs?.output as string

        const retrieverConfig = {
            knowledgeBaseId: collectionName,
            url: connectionString,
            apiKey: apiKey,
            languages: language ? [language] : [],
            topK: k ?? DEFAULT_TOP_K
        } as KCenterRetrieverRetrieverArgs

        console.debug('RetrieverConfig: ', retrieverConfig)

        const retriever = new KCenterRetriever(retrieverConfig)

        if (output === 'retriever') return retriever

        return retriever
    }
}

export interface KCenterRetrieverRetrieverArgs {
    url: string
    knowledgeBaseId: string
    apiKey: string
    languages: string[]
    topK: number
}

class KCenterRetriever extends BaseRetriever {
    lc_namespace = ['langchain', 'retrievers']

    config: KCenterRetrieverRetrieverArgs

    constructor(input: KCenterRetrieverRetrieverArgs) {
        super({ verbose: false } as BaseRetrieverInput)

        this.config = input
    }

    async _getRelevantDocuments(query: string): Promise<Document[]> {
        let documents: Document[] = []

        const requestConfig = {
            headers: {
                'X-API-KEY': `${this.config.apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        }

        const baseUrl = this.config.url.endsWith('/') ? this.config.url.slice(0, -1) : this.config.url
        const encodedKbaseId = encodeURIComponent(this.config.knowledgeBaseId)
        const url = `${baseUrl}/api/v1/knowledgebases/${encodedKbaseId}/search`

        const requestBody = {
            query: query,
            lang: this.config.languages ?? [],
            limit: this.config.topK ?? 1
        }

        try {
            console.debug(`Send search request to URL ${url}: `, requestBody)

            let returnedDocs = await axios.post(url, requestBody, requestConfig)

            const finalResults: Document<Record<string, any>>[] = []

            returnedDocs.data.results.forEach((result: any) => {
                const doc = new Document({
                    id: result.id,
                    pageContent: result.text,
                    metadata: {
                        relevance_score: result.score,
                        guid: result.meta?.docref?.guid || result.meta?.guid,
                        lang: result.meta?.docref?.lang || result.meta?.lang,
                        title: result.meta?.docref?.title || result.meta?.title,
                        url: result.meta?.docref?.url || result.meta?.url
                    }
                })

                finalResults.push(doc)
            })

            const spliceResults = finalResults.splice(0, this.config.topK)

            console.debug('Final result set: ', spliceResults)

            return spliceResults
        } catch (error) {
            return documents
        }
    }
}

module.exports = { nodeClass: KCenter_Retrievers }
