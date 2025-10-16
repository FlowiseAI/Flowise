import { BaseCache } from '@langchain/core/caches'
import { ChatGroq, ChatGroqInput } from '@langchain/groq'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { getBaseClasses } from '../../../src/utils'

class AAIGroq_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    tags: string[]

    constructor() {
        this.label = 'Answer Groq'
        this.name = 'aaiGroqChat'
        this.tags = ['AAI']
        this.version = 1.0
        this.type = 'AAIGroqChat'
        this.icon = 'groq.png'
        this.category = 'Chat Models'
        this.description = 'Groq LPU models • Zero configuration required'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGroq)]
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'llama-3-70b-8192',
                placeholder: 'llama-3-70b-8192'
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
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
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

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'groqChat').then((models) => [
                ...models,
                {
                    label: 'DeepSeek-R1-Distill-Llama-70b',
                    name: 'DeepSeek-R1-Distill-Llama-70b',
                    description: 'DeepSeek-R1-Distill-Llama-70b'
                }
            ])
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean

        // Use AAI default credentials instead of user-provided credentials
        const groqApiKey = process.env.AAI_DEFAULT_GROQ

        if (!groqApiKey) {
            throw new Error('AAI_DEFAULT_GROQ environment variable is not set')
        }

        const obj: ChatGroqInput = {
            model: modelName,
            temperature: parseFloat(temperature),
            apiKey: groqApiKey,
            streaming: streaming ?? true
        }
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (cache) obj.cache = cache

        const model = new ChatGroq(obj)
        return model
    }
}

module.exports = { nodeClass: AAIGroq_ChatModels }
