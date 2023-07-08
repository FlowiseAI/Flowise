import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { APIChain, createOpenAPIChain } from 'langchain/chains'
import { CustomChainHandler, getBaseClasses } from '../../../src/utils'
import { ChatOpenAI } from 'langchain/chat_models/openai'

class OpenApiChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAPI Chain'
        this.name = 'openApiChain'
        this.type = 'openApiChain'
        this.icon = 'openapi.png'
        this.category = 'Chains'
        this.description = 'Chain to run queries against OpenAPI'
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.inputs = [
            {
                label: 'ChatOpenAI Model',
                name: 'model',
                type: 'ChatOpenAI'
            },
            {
                label: 'YAML File',
                name: 'yamlFile',
                type: 'file',
                fileType: '.yaml'
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
        const model = nodeData.inputs?.model as ChatOpenAI
        const headers = nodeData.inputs?.headers as string
        const yamlFileBase64 = nodeData.inputs?.yamlFile as string
        const splitDataURI = yamlFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const utf8String = bf.toString('utf-8')
        const chain = await createOpenAPIChain(utf8String, {
            llm: model,
            headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {}
        })
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const model = nodeData.inputs?.model as ChatOpenAI
        const headers = nodeData.inputs?.headers as string
        const yamlFileBase64 = nodeData.inputs?.yamlFile as string
        const splitDataURI = yamlFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const utf8String = bf.toString('utf-8')
        const chain = await createOpenAPIChain(utf8String, {
            llm: model,
            headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {}
        })
        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId, 2)
            const res = await chain.run(input, [handler])
            return res
        } else {
            const res = await chain.run(input)
            return res
        }
    }
}

module.exports = { nodeClass: OpenApiChain_Chains }
