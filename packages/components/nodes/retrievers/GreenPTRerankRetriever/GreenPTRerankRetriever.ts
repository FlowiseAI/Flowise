import { BaseRetriever } from '@langchain/core/retrievers'
import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { listGreenPTModels } from '../../../src/greenpt'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { GreenPTRerank } from './GreenPTRerank'

class GreenPTRerankRetriever_Retrievers implements INode {
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
        this.label = 'GreenPT Rerank Retriever'
        this.name = 'greenPTRerankRetriever'
        this.version = 1.0
        this.type = 'GreenPTRerankRetriever'
        this.icon = 'greenpt.svg'
        this.category = 'Retrievers'
        this.description =
            'GreenPT reranks retrieved documents on optimized European infrastructure in data centers powered by 100% renewable energy.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['greenPTApi']
        }
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'green-rerank'
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Query to retrieve documents from retriever. If not specified, the user question is used.',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Top N',
                name: 'topN',
                description: 'Number of top results to return.',
                default: 4,
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'GreenPT Rerank Retriever',
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
                description: 'Concatenated pageContent from reranked documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    loadMethods = {
        async listModels(nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> {
            return listGreenPTModels(nodeData, options, 'rerank')
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('greenPTApiKey', credentialData, nodeData)
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = (nodeData.inputs?.model as string) || 'green-rerank'
        const topN = nodeData.inputs?.topN ? parseInt(nodeData.inputs.topN as string, 10) : 4
        const retriever = new ContextualCompressionRetriever({
            baseCompressor: new GreenPTRerank(apiKey, model, topN),
            baseRetriever
        })
        const query = (nodeData.inputs?.query as string) || input
        const output = nodeData.outputs?.output as string

        if (output === 'document') return retriever.invoke(query)
        if (output === 'text') {
            const documents = await retriever.invoke(query)
            return handleEscapeCharacters(documents.map((document) => document.pageContent).join('\n'), false)
        }
        return retriever
    }
}

module.exports = { nodeClass: GreenPTRerankRetriever_Retrievers }
