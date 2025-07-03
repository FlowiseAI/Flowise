// Groq_ChatModels.ts

import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'

import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

import { FlowiseChatGroq } from './FlowiseChatGroq'

class Groq_ChatModels implements INode {
    label = 'GroqChat'
    name = 'groqChat'
    version = 1.0
    type = 'GroqChat'
    icon = 'groq.png'
    category = 'Chat Models'
    description = 'LangChain-compatible wrapper around Groq API'
    baseClasses = [this.type, ...getBaseClasses(FlowiseChatGroq)]
    tags = ['Groq', 'LangChain']
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['groqApi'],
            optional: false
        }

        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                placeholder: 'llama3-70b-8192'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true
            }
        ]
    }

    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'groqChat')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<FlowiseChatGroq> {
        const model = nodeData.inputs?.modelName as string
        const temperature = parseFloat(nodeData.inputs?.temperature ?? '0.7')
        const maxTokens = nodeData.inputs?.maxTokens ? parseInt(nodeData.inputs?.maxTokens as string, 10) : undefined
        const streaming = nodeData.inputs?.streaming ?? true

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const groqApiKey = getCredentialParam('groqApiKey', credentialData, nodeData)

        return new FlowiseChatGroq({
            model,
            temperature,
            maxTokens,
            streaming,
            apiKey: groqApiKey
        })
    }
}

module.exports = { nodeClass: Groq_ChatModels }
