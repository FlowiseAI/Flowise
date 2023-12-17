import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseCache } from 'langchain/schema'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

class GoogleGenerativeAI_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatGoogleGenerativeAI'
        this.name = 'chatGoogleGenerativeAI'
        this.version = 1.0
        this.type = 'ChatGoogleGenerativeAI'
        this.icon = 'gemini.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Google Gemini large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGoogleGenerativeAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleGenerativeAI'],
            optional: false,
            description: 'Google Generative AI credential.'
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'gemini-pro',
                        name: 'gemini-pro'
                    }
                ],
                default: 'gemini-pro'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('googleGenerativeAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const cache = nodeData.inputs?.cache as BaseCache

        const obj = {
            apiKey: apiKey,
            modelName: modelName,
            maxOutputTokens: 2048
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)

        const model = new ChatGoogleGenerativeAI(obj)
        if (topP) model.topP = parseFloat(topP)
        if (cache) model.cache = cache
        if (temperature) model.temperature = parseFloat(temperature)
        return model
    }
}

module.exports = { nodeClass: GoogleGenerativeAI_ChatModels }
