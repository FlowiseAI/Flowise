import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { APIChain, createOpenAPIChain } from 'langchain/chains'
import { getBaseClasses } from '../../../src/utils'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'

class OpenApiChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAPI Chain'
        this.name = 'openApiChain'
        this.version = 1.0
        this.type = 'OpenAPIChain'
        this.icon = 'openapi.png'
        this.category = 'Chains'
        this.description = 'Chain that automatically select and call APIs based only on an OpenAPI spec'
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.inputs = [
            {
                label: 'ChatOpenAI Model',
                name: 'model',
                type: 'ChatOpenAI'
            },
            {
                label: 'YAML Link',
                name: 'yamlLink',
                type: 'string',
                placeholder: 'https://api.speak.com/openapi.yaml',
                description: 'If YAML link is provided, uploaded YAML File will be ignored and YAML link will be used instead'
            },
            {
                label: 'YAML File',
                name: 'yamlFile',
                type: 'file',
                fileType: '.yaml',
                description: 'If YAML link is provided, uploaded YAML File will be ignored and YAML link will be used instead'
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
        return await initChain(nodeData)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = await initChain(nodeData)
        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return res
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return res
        }
    }
}

const initChain = async (nodeData: INodeData) => {
    const model = nodeData.inputs?.model as ChatOpenAI
    const headers = nodeData.inputs?.headers as string
    const yamlLink = nodeData.inputs?.yamlLink as string
    const yamlFileBase64 = nodeData.inputs?.yamlFile as string

    let yamlString = ''

    if (yamlLink) {
        yamlString = yamlLink
    } else {
        const splitDataURI = yamlFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        yamlString = bf.toString('utf-8')
    }

    return await createOpenAPIChain(yamlString, {
        llm: model,
        headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {},
        verbose: process.env.DEBUG === 'true' ? true : false
    })
}

module.exports = { nodeClass: OpenApiChain_Chains }
