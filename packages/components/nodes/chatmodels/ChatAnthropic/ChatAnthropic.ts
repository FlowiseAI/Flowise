import { AnthropicInput, ChatAnthropic as LangchainChatAnthropic } from '@langchain/anthropic'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatAnthropic } from './FlowiseChatAnthropic'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatAnthropic_ChatModels implements INode {
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
        this.label = 'Anthropic Claude'
        this.name = 'chatAnthropic'
        this.version = 8.0
        this.type = 'ChatAnthropic'
        this.icon = 'Anthropic.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around ChatAnthropic large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatAnthropic)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['anthropicApi']
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'claude-3-haiku'
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
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            },
            /*  The manual thinking: {type: "enabled", budget_tokens: N} configuration is deprecated on Opus 4.6 and will be removed in a future model release */
            {
                label: 'Extended Thinking',
                name: 'extendedThinking',
                type: 'boolean',
                description: 'Enable extended thinking for reasoning model such as Claude Sonnet 3.7 and Claude 4',
                optional: true,
                additionalParams: true,
                hide: {
                    modelName: ['claude-opus-4-6', 'claude-sonnet-4-6']
                }
            },
            {
                label: 'Budget Tokens',
                name: 'budgetTokens',
                type: 'number',
                step: 1,
                default: '1024',
                description: 'Maximum number of tokens Claude is allowed use for its internal reasoning process',
                optional: true,
                additionalParams: true,
                show: {
                    extendedThinking: true
                },
                hide: {
                    modelName: ['claude-opus-4-6', 'claude-sonnet-4-6']
                }
            },
            {
                label: 'Adaptive Thinking',
                description:
                    'Claude evaluates the complexity of each request and determines whether and how much to use extended thinking.',
                name: 'adaptiveThinking',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true,
                show: {
                    modelName: ['claude-opus-4-6', 'claude-sonnet-4-6']
                }
            },
            {
                label: 'Thinking Effort',
                description: 'Control how eager Claude is about spending tokens when responding to requests',
                name: 'thinkingEffort',
                type: 'options',
                optional: true,
                options: [
                    {
                        label: 'Low',
                        name: 'low'
                    },
                    {
                        label: 'Medium',
                        name: 'medium'
                    },
                    {
                        label: 'High',
                        name: 'high'
                    },
                    {
                        label: 'Max',
                        name: 'max',
                        description: 'Absolute maximum capability with no constraints on token spending. Opus 4.6 only'
                    }
                ],
                additionalParams: true,
                show: {
                    adaptiveThinking: true,
                    modelName: ['claude-opus-4-6', 'claude-sonnet-4-6']
                }
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
            }
        ]
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
        const adaptiveThinking = nodeData.inputs?.adaptiveThinking as boolean
        const thinkingEffort = nodeData.inputs?.thinkingEffort as 'low' | 'medium' | 'high' | 'max'

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const anthropicApiKey = getCredentialParam('anthropicApiKey', credentialData, nodeData)

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

        if (adaptiveThinking) {
            obj.thinking = {
                type: 'adaptive'
            }
            if (thinkingEffort) {
                obj.outputConfig = {
                    effort: thinkingEffort
                }
            }

            delete obj.temperature
        } else if (extendedThinking) {
            obj.thinking = {
                type: 'enabled',
                budget_tokens: parseInt(budgetTokens ?? '1024', 10)
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

module.exports = { nodeClass: ChatAnthropic_ChatModels }
