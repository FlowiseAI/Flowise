import { AnthropicInput, ChatAnthropic as LangchainChatAnthropic } from '@langchain/anthropic'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatAnthropic } from './FlowiseChatAnthropic'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class AAIChatAnthropic_ChatModels implements INode {
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
        this.label = 'Answer ChatAnthropic'
        this.name = 'aaiChatAnthropic'
        this.version = 1.0
        this.type = 'AAIChatAnthropic'
        this.icon = 'Anthropic.svg'
        this.category = 'Chat Models'
        this.description = 'Anthropic Claude • Zero configuration required'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatAnthropic)]
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
                default: 'claude-sonnet-4-0'
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
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokensToSample',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Extended Thinking',
                name: 'extendedThinking',
                type: 'boolean',
                description: 'Enable extended thinking for reasoning model such as Claude Sonnet 3.7',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Budget Tokens',
                name: 'budgetTokens',
                type: 'number',
                step: 1,
                default: 1024,
                description: 'Maximum number of tokens Claude is allowed use for its internal reasoning process',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            }
        ]
        this.tags = ['AAI']
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatAnthropic')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokensToSample as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache
        const extendedThinking = nodeData.inputs?.extendedThinking as boolean
        const budgetTokens = nodeData.inputs?.budgetTokens as string

        // Use AAI default credentials instead of user-provided credentials
        const anthropicApiKey = process.env.AAI_DEFAULT_ANTHROPHIC

        if (!anthropicApiKey) {
            throw new Error('AAI_DEFAULT_ANTHROPHIC environment variable is not set')
        }

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const obj: Partial<AnthropicInput> & BaseLLMParams & { anthropicApiKey?: string } = {
            temperature: parseFloat(temperature),
            modelName,
            anthropicApiKey,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache
        if (extendedThinking) {
            obj.thinking = {
                type: 'enabled',
                budget_tokens: parseInt(budgetTokens, 10)
            }
            delete obj.temperature
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatAnthropic(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: AAIChatAnthropic_ChatModels }
