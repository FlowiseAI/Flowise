import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import type { SafetySetting } from '@google/generative-ai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getBaseClasses } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from './FlowiseChatGoogleGenerativeAI'
import type FlowiseGoogleAICacheManager from '../../cache/GoogleGenerativeAIContextCache/FlowiseGoogleAICacheManager'

class AAIGoogleGenerativeAI_ChatModels implements INode {
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
        this.label = 'Answer ChatGoogleGenerativeAI'
        this.name = 'aaiChatGoogleGenerativeAI'
        this.tags = ['AAI']
        this.version = 1.0
        this.type = 'AAIChatGoogleGenerativeAI'
        this.icon = 'GoogleGemini.svg'
        this.category = 'Chat Models'
        this.description = 'Google Gemini • Zero configuration required'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGoogleGenerativeAI)]
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Context Cache',
                name: 'contextCache',
                type: 'GoogleAICacheManager',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'gemini-2.5-flash'
            },
            {
                label: 'Custom Model Name',
                name: 'customModelName',
                type: 'string',
                placeholder: 'gemini-1.5-pro-exp-0801',
                description: 'Custom model name to use. If provided, it will override the model selected',
                additionalParams: true,
                optional: true
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
            },
            {
                label: 'Top Next Highest Probability Tokens',
                name: 'topK',
                type: 'number',
                description: `Decode using top-k sampling: consider the set of top_k most probable tokens. Must be positive`,
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Harm Category',
                name: 'harmCategory',
                type: 'multiOptions',
                description:
                    'Refer to <a target="_blank" href="https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/configure-safety-attributes#safety_attribute_definitions">official guide</a> on how to use Harm Category',
                options: [
                    {
                        label: 'Dangerous',
                        name: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
                    },
                    {
                        label: 'Harassment',
                        name: HarmCategory.HARM_CATEGORY_HARASSMENT
                    },
                    {
                        label: 'Hate Speech',
                        name: HarmCategory.HARM_CATEGORY_HATE_SPEECH
                    },
                    {
                        label: 'Sexually Explicit',
                        name: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Harm Block Threshold',
                name: 'harmBlockThreshold',
                type: 'multiOptions',
                description:
                    'Refer to <a target="_blank" href="https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/configure-safety-attributes#safety_setting_thresholds">official guide</a> on how to use Harm Block Threshold',
                options: [
                    {
                        label: 'Low and Above',
                        name: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
                    },
                    {
                        label: 'Medium and Above',
                        name: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        label: 'None',
                        name: HarmBlockThreshold.BLOCK_NONE
                    },
                    {
                        label: 'Only High',
                        name: HarmBlockThreshold.BLOCK_ONLY_HIGH
                    },
                    {
                        label: 'Threshold Unspecified',
                        name: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                description: 'Base URL for the API. Leave empty to use the default.',
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
                label: 'Response Modalities',
                name: 'responseModalities',
                type: 'multiOptions',
                description: 'Specify output modalities. Enable IMAGE for image generation capabilities.',
                options: [
                    {
                        label: 'TEXT',
                        name: 'TEXT'
                    },
                    {
                        label: 'IMAGE',
                        name: 'IMAGE'
                    }
                ],
                default: ['TEXT'],
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatGoogleGenerativeAI')
        }
    }

    async init(nodeData: INodeData, _: string, _options: ICommonObject): Promise<any> {
        // Use AAI default credentials instead of user-provided credentials
        const apiKey = process.env.AAI_DEFAULT_GOOGLE_GENERATIVE_AI_API_KEY

        if (!apiKey) {
            throw new Error('AAI_DEFAULT_GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set')
        }

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const harmCategory = nodeData.inputs?.harmCategory as string
        const harmBlockThreshold = nodeData.inputs?.harmBlockThreshold as string
        const cache = nodeData.inputs?.cache as BaseCache
        const contextCache = nodeData.inputs?.contextCache as FlowiseGoogleAICacheManager
        const streaming = nodeData.inputs?.streaming as boolean
        const baseUrl = nodeData.inputs?.baseUrl as string | undefined
        const responseModalities = nodeData.inputs?.responseModalities as string

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const obj: Partial<GoogleGenerativeAIChatInput> = {
            apiKey: apiKey,
            modelName: customModelName || modelName,
            streaming: streaming ?? true
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)
        if (baseUrl) obj.baseUrl = baseUrl
        if (responseModalities) obj.responseModalities = convertMultiOptionsToStringArray(responseModalities)

        // Safety Settings
        let harmCategories: string[] = convertMultiOptionsToStringArray(harmCategory)
        let harmBlockThresholds: string[] = convertMultiOptionsToStringArray(harmBlockThreshold)
        if (harmCategories.length != harmBlockThresholds.length)
            throw new Error(`Harm Category & Harm Block Threshold are not the same length`)
        const safetySettings: SafetySetting[] = harmCategories.map((harmCategory, index) => {
            return {
                category: harmCategory as HarmCategory,
                threshold: harmBlockThresholds[index] as HarmBlockThreshold
            }
        })
        if (safetySettings.length > 0) obj.safetySettings = safetySettings

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatGoogleGenerativeAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        if (contextCache) model.setContextCache(contextCache)

        // Set user context for image uploads
        if (_options?.user) {
            model.setUserContext({
                organizationId: _options.user.organizationId,
                userId: _options.user.id,
                userEmail: _options.user.email || `${_options.user.id}@local`
            })
        }

        return model
    }
}

module.exports = { nodeClass: AAIGoogleGenerativeAI_ChatModels }
