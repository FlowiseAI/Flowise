import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Groq, OpenAI } from 'llamaindex'

class ChatGroq_LlamaIndex_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    tags: string[]
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatGroq'
        this.name = 'chatGroq_LlamaIndex'
        this.version = 1.0
        this.type = 'ChatGroq'
        this.icon = 'groq.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Groq LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(Groq)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['groqApi'],
            optional: true
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
                default: 0.9,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'groqChat')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const groqApiKey = getCredentialParam('groqApiKey', credentialData, nodeData)

        const obj: Partial<OpenAI> = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: groqApiKey
        }

        const model = new Groq(obj)
        return model
    }
}

module.exports = { nodeClass: ChatGroq_LlamaIndex_ChatModels }
