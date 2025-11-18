import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOpenAI } from './FlowiseChatOpenAI'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { OpenAI as OpenAIClient } from 'openai'

class ChatOpenAI_ChatModels implements INode {
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
        this.label = 'ChatOpenAI'
        this.name = 'chatOpenAI'
        this.version = 8.3
        this.type = 'ChatOpenAI'
        this.icon = 'openai.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around OpenAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
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
                default: 'gpt-4o-mini'
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
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
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
                label: 'Strict Tool Calling',
                name: 'strictToolCalling',
                type: 'boolean',
                description:
                    'Whether the model supports the `strict` argument when passing in tools. If not specified, the `strict` argument will not be passed to OpenAI.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Stop Sequence',
                name: 'stopSequence',
                type: 'string',
                rows: 4,
                optional: true,
                description: 'List of stop words to use when generating. Use comma to separate multiple stop words.',
                additionalParams: true
            },
            {
                label: 'BasePath',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Proxy Url',
                name: 'proxyUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BaseOptions',
                name: 'baseOptions',
                type: 'json',
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
            {
                label: 'Image Resolution',
                description: 'This parameter controls the resolution in which the model views the image.',
                name: 'imageResolution',
                type: 'options',
                options: [
                    {
                        label: 'Low',
                        name: 'low'
                    },
                    {
                        label: 'High',
                        name: 'high'
                    },
                    {
                        label: 'Auto',
                        name: 'auto'
                    }
                ],
                default: 'low',
                optional: false,
                show: {
                    allowImageUploads: true
                }
            },
            {
                label: 'Reasoning',
                description: 'Whether the model supports reasoning. Only applicable for reasoning models.',
                name: 'reasoning',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Reasoning Effort',
                description: 'Constrains effort on reasoning for reasoning models',
                name: 'reasoningEffort',
                type: 'options',
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
                    }
                ],
                additionalParams: true,
                show: {
                    reasoning: true
                }
            },
            {
                label: 'Reasoning Summary',
                description: `A summary of the reasoning performed by the model. This can be useful for debugging and understanding the model's reasoning process`,
                name: 'reasoningSummary',
                type: 'options',
                options: [
                    {
                        label: 'Auto',
                        name: 'auto'
                    },
                    {
                        label: 'Concise',
                        name: 'concise'
                    },
                    {
                        label: 'Detailed',
                        name: 'detailed'
                    }
                ],
                additionalParams: true,
                show: {
                    reasoning: true
                }
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatOpenAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const stopSequence = nodeData.inputs?.stopSequence as string
        const streaming = nodeData.inputs?.streaming as boolean
        const strictToolCalling = nodeData.inputs?.strictToolCalling as boolean
        const basePath = nodeData.inputs?.basepath as string
        const proxyUrl = nodeData.inputs?.proxyUrl as string
        const baseOptions = nodeData.inputs?.baseOptions
        const reasoningEffort = nodeData.inputs?.reasoningEffort as OpenAIClient.ReasoningEffort | null
        const reasoningSummary = nodeData.inputs?.reasoningSummary as 'auto' | 'concise' | 'detailed' | null

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey,
            apiKey: openAIApiKey,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        if (stopSequence) {
            const stopSequenceArray = stopSequence.split(',').map((item) => item.trim())
            obj.stop = stopSequenceArray
        }
        if (strictToolCalling) obj.supportsStrictToolCalling = strictToolCalling

        if (modelName.includes('o1') || modelName.includes('o3') || modelName.includes('gpt-5')) {
            delete obj.temperature
            delete obj.stop
            const reasoning: OpenAIClient.Reasoning = {}
            if (reasoningEffort) {
                reasoning.effort = reasoningEffort
            }
            if (reasoningSummary) {
                reasoning.summary = reasoningSummary
            }
            obj.reasoning = reasoning
        }

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatOpenAI's BaseOptions: " + exception)
            }
        }

        if (basePath || parsedBaseOptions) {
            obj.configuration = {
                baseURL: basePath,
                defaultHeaders: parsedBaseOptions
            }
        }

        if (proxyUrl) {
            obj.configuration = {
                ...obj?.configuration,
                httpAgent: new HttpsProxyAgent(proxyUrl)
            }
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }

        const model = new ChatOpenAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_ChatModels }
