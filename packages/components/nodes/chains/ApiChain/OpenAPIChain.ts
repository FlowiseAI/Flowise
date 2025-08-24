import { APIChain, createOpenAPIChain } from 'langchain/chains'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { getFileFromStorage } from '../../../src'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

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
    badge: string

    constructor() {
        this.label = 'OpenAPI Chain'
        this.name = 'openApiChain'
        this.version = 2.0
        this.type = 'OpenAPIChain'
        this.icon = 'openapi.svg'
        this.category = 'Chains'
        this.badge = 'DEPRECATING'
        this.description = 'Chain that automatically select and call APIs based only on an OpenAPI spec'
        this.baseClasses = [this.type, ...getBaseClasses(APIChain)]
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
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
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initChain(nodeData, options)
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chain = await initChain(nodeData, options)
        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the OpenAPI chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (options.shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }
        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId)
            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return res
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return res
        }
    }
}

const initChain = async (nodeData: INodeData, options: ICommonObject) => {
    const model = nodeData.inputs?.model as BaseChatModel
    const headers = nodeData.inputs?.headers as string
    const yamlLink = nodeData.inputs?.yamlLink as string
    const yamlFileBase64 = nodeData.inputs?.yamlFile as string

    let yamlString = ''

    if (yamlLink) {
        yamlString = yamlLink
    } else {
        if (yamlFileBase64.startsWith('FILE-STORAGE::')) {
            const file = yamlFileBase64.replace('FILE-STORAGE::', '')
            const orgId = options.orgId
            const chatflowid = options.chatflowid
            const fileData = await getFileFromStorage(file, orgId, chatflowid)
            yamlString = fileData.toString()
        } else {
            const splitDataURI = yamlFileBase64.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            yamlString = bf.toString('utf-8')
        }
    }

    return await createOpenAPIChain(yamlString, {
        llm: model,
        headers: typeof headers === 'object' ? headers : headers ? JSON.parse(headers) : {},
        verbose: process.env.DEBUG === 'true' ? true : false
    })
}

module.exports = { nodeClass: OpenApiChain_Chains }
