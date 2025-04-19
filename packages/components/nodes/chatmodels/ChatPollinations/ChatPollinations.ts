import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatPollinations } from './FlowiseChatPollinations'
import fetch from 'node-fetch'

class ChatPollinations_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatPollinations'
        this.name = 'chatPollinations'
        this.version = 1.0
        this.type = 'ChatPollinations'
        this.icon = 'pollinations.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Pollinations.AI free text generation API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatPollinations)]
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
                default: 'openai'
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
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
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
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://text.pollinations.ai',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Private',
                name: 'private',
                type: 'boolean',
                default: false,
                description: 'Set to true to prevent the response from appearing in the public feed',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Seed',
                name: 'seed',
                type: 'number',
                description: 'Seed for reproducible results',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description: 'Allow image input for vision capabilities',
                default: false,
                optional: true
            }
        ]
    }

    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            try {
                const response = await fetch('https://text.pollinations.ai/models')
                const models = await response.json()
                
                return models.map((model: string) => ({
                    label: model,
                    name: model
                }))
            } catch (error) {
                console.error('Error fetching Pollinations models:', error)
                return [
                    { label: 'openai', name: 'openai' },
                    { label: 'mistral', name: 'mistral' },
                    { label: 'claude', name: 'claude' },
                    { label: 'llama', name: 'llama' },
                    { label: 'searchgpt', name: 'searchgpt' }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const baseUrl = nodeData.inputs?.baseUrl as string
        const isPrivate = nodeData.inputs?.private as boolean
        const seed = nodeData.inputs?.seed as string
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: any = {
            modelName,
            streaming: streaming ?? true
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (baseUrl) obj.baseUrl = baseUrl
        if (isPrivate !== undefined) obj.private = isPrivate
        if (seed) obj.seed = parseInt(seed, 10)
        if (cache) obj.cache = cache

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatPollinations(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatPollinations_ChatModels }
