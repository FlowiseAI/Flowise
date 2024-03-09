import { BaseCache } from '@langchain/core/caches'
import { ChatGroq, ChatGroqInput } from '@langchain/groq'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Groq_ChatModels implements INode {
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
        this.label = 'GroqChat'
        this.name = 'groqChat'
        this.version = 2.0
        this.type = 'GroqChat'
        this.icon = 'groq.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Groq API with LPU Inference Engine'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGroq)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['groqApi'],
            optional: true
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
                type: 'string',
                placeholder: 'ft:gpt-3.5-turbo:my-org:custom_suffix:id'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const groqApiKey = getCredentialParam('groqApiKey', credentialData, nodeData)

        const obj: ChatGroqInput = {
            modelName,
            temperature: parseFloat(temperature),
            apiKey: groqApiKey,
            streaming: streaming ?? true
        }
        if (cache) obj.cache = cache

        const model = new ChatGroq(obj)
        return model
    }
}

module.exports = { nodeClass: Groq_ChatModels }
