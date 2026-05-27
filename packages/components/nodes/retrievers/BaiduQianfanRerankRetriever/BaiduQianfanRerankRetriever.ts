import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { BaiduQianfanRerank } from './BaiduQianfanRerank'

class BaiduQianfanRerankRetriever_Retrievers implements INode {
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
        this.label = 'Baidu Qianfan Rerank Retriever'
        this.name = 'baiduQianfanRerankRetriever'
        this.version = 1.0
        this.type = 'BaiduQianfanRerankRetriever'
        this.icon = 'baiduwenxin.svg'
        this.category = 'Retrievers'
        this.description = 'Baidu Qianfan Rerank indexes the documents from most to least semantically relevant to the query.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['baiduQianfanApiKey', 'baiduQianfanApi']
        }
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'bce-reranker-base',
                        name: 'bce-reranker-base'
                    }
                ],
                default: 'bce-reranker-base',
                optional: true
            },
            {
                label: 'Custom Model Name',
                name: 'customModelName',
                type: 'string',
                placeholder: 'bce-reranker-base',
                description: 'Custom model name to use. If provided, it will override the selected model.',
                additionalParams: true,
                optional: true
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
                label: 'Top N',
                name: 'topN',
                description: 'Number of top results to fetch. Default to the TopK of the Base Retriever',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Baidu Qianfan Rerank Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: ['Document', 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const query = nodeData.inputs?.query as string
        const topN = nodeData.inputs?.topN as string
        const output = nodeData.outputs?.output as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qianfanApiKey =
            getCredentialParam('qianfanApiKey', credentialData, nodeData) || getCredentialParam('qianfanAccessKey', credentialData, nodeData)
        const k = topN ? parseFloat(topN) : (baseRetriever as VectorStoreRetriever).k ?? 4

        const qianfanCompressor = new BaiduQianfanRerank(qianfanApiKey, customModelName || modelName, k)
        const retriever = new ContextualCompressionRetriever({
            baseCompressor: qianfanCompressor,
            baseRetriever
        })

        if (output === 'retriever') return retriever
        if (output === 'document') return await retriever.invoke(query ? query : input)
        if (output === 'text') {
            const docs = await retriever.invoke(query ? query : input)
            let finaltext = ''
            for (const doc of docs) finaltext += `${doc.pageContent}\n`
            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: BaiduQianfanRerankRetriever_Retrievers }
