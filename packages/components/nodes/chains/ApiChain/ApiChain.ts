import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { APIChain } from 'langchain/chains'
import { CustomChainHandler, getBaseClasses } from '../../../src/utils'
import { BaseLanguageModel } from 'langchain/base_language'
import { Document } from 'langchain/document'
import { PromptTemplate } from 'langchain/prompts'

class ApiChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'API Chain'
        this.name = 'apiChain'
        this.type = 'ApiChain'
        this.icon = 'apichain.svg'
        this.category = 'Chains'
        this.description = 'Chain to run queries against API'
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Document',
                name: 'document',
                type: 'Document'
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const docs = nodeData.inputs?.document as Document[]
        const headers = nodeData.inputs?.headers as string

        const chain = await getAPIChain(docs, model, headers)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const docs = nodeData.inputs?.document as Document[]
        const headers = nodeData.inputs?.headers as string

        const chain = await getAPIChain(docs, model, headers)
        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const res = await chain.run(input, [handler])
            return res
        } else {
            const res = await chain.run(input)
            return res
        }
    }
}

const getAPIChain = async (documents: Document[], llm: BaseLanguageModel, headers: any) => {
    const texts = documents.map(({ pageContent }) => pageContent)
    const apiResponsePrompt = new PromptTemplate({
        inputVariables: ['api_docs', 'question', 'api_url', 'api_response'],
        template: 'Given this {api_response} response for {api_url}. use the given response to answer this {question}'
    })

    const chain = APIChain.fromLLMAndAPIDocs(llm, texts.toString(), {
        apiResponsePrompt,
        verbose: process.env.DEBUG === 'true' ? true : false,
        headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {}
    })
    return chain
}

module.exports = { nodeClass: ApiChain_Chains }
