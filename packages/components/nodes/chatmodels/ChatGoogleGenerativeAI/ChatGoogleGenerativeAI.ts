import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import type { SafetySetting } from '@google/generative-ai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from './FlowiseChatGoogleGenerativeAI'

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
        this.version = 2.0
        this.type = 'ChatGoogleGenerativeAI'
        this.icon = 'GoogleGemini.svg'
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
                type: 'asyncOptions',
                loadMethod: 'listModels',
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
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Automatically uses vision model when image is being uploaded from chat. Only works with LLMChain, Conversation Chain, ReAct Agent, and Conversational Agent',
                default: false,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatGoogleGenerativeAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('googleGenerativeAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const harmCategory = nodeData.inputs?.harmCategory as string
        const harmBlockThreshold = nodeData.inputs?.harmBlockThreshold as string
        const cache = nodeData.inputs?.cache as BaseCache
        const streaming = nodeData.inputs?.streaming as boolean

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const obj: Partial<GoogleGenerativeAIChatInput> = {
            apiKey: apiKey,
            modelName: modelName,
            streaming: streaming ?? true
        }

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)

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

        return model
    }
}

module.exports = { nodeClass: GoogleGenerativeAI_ChatModels }
