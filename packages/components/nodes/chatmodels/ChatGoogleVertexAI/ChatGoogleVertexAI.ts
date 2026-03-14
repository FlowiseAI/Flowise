import { BaseCache } from '@langchain/core/caches'
import { ChatVertexAIInput, ChatVertexAI as LcChatVertexAI } from '@langchain/google-vertexai'
import { GoogleGenerativeAIChatInput } from '@langchain/google-genai'
import { buildGoogleCredentials } from '../../../src/google-utils'
import {
    ICommonObject,
    IMultiModalOption,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IVisionChatModal
} from '../../../src/Interface'
import { getModels, getRegions, MODEL_TYPE } from '../../../src/modelLoader'
import { getBaseClasses } from '../../../src/utils'

const DEFAULT_IMAGE_MAX_TOKEN = 8192
const DEFAULT_IMAGE_MODEL = 'gemini-1.5-flash-latest'

class ChatVertexAI extends LcChatVertexAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: ChatVertexAIInput) {
        // @ts-ignore
        if (fields?.model) {
            fields.modelName = fields.model
            delete fields.model
        }
        super(fields ?? {})
        this.id = id
        this.configuredModel = fields?.modelName || ''
        this.configuredMaxToken = fields?.maxOutputTokens ?? 2048
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.modelName.startsWith('claude-3')) {
            this.modelName = DEFAULT_IMAGE_MODEL
            this.maxOutputTokens = this.configuredMaxToken ? this.configuredMaxToken : DEFAULT_IMAGE_MAX_TOKEN
        }
    }
}

class GoogleVertexAI_ChatModels implements INode {
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
        this.label = 'Google VertexAI'
        this.name = 'chatGoogleVertexAI'
        this.version = 5.3
        this.type = 'ChatGoogleVertexAI'
        this.icon = 'GoogleVertex.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around VertexAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatVertexAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth'],
            optional: true,
            description:
                'Google Vertex AI credential. If you are using a GCP service like Cloud Run, or if you have installed default credentials on your local machine, you do not need to set this credential.'
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Region',
                description: 'Region to use for the model.',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels'
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
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            },
            /** The thinkingLevel parameter, recommended for Gemini 3 models and onwards. */
            {
                label: 'Thinking Budget',
                name: 'thinkingBudget',
                type: 'number',
                description: 'Guides the number of thinking tokens. -1 for dynamic, 0 to disable, or positive integer (Gemini 2.5 models).',
                step: 1,
                optional: true,
                additionalParams: true,
                show: {
                    modelName: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
                }
            },
            {
                label: 'Thinking Level',
                name: 'thinkingLevel',
                type: 'options',
                description: 'Adjust the amount of reasoning effort based on the complexity of the user request',
                options: [
                    {
                        label: 'Low',
                        name: 'LOW'
                    },
                    {
                        label: 'Medium',
                        name: 'MEDIUM'
                    },
                    {
                        label: 'High',
                        name: 'HIGH'
                    }
                ],
                optional: true,
                additionalParams: true,
                show: {
                    modelName: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview']
                }
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
                label: 'Thinking Budget',
                name: 'thinkingBudget',
                type: 'number',
                description: 'Number of tokens to use for thinking process (0 to disable)',
                step: 1,
                placeholder: '1024',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatGoogleVertexAI')
        },
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'chatGoogleVertexAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const cache = nodeData.inputs?.cache as BaseCache
        const topK = nodeData.inputs?.topK as string
        const streaming = nodeData.inputs?.streaming as boolean
        const region = nodeData.inputs?.region as string
        const thinkingBudget = nodeData.inputs?.thinkingBudget as string
        const thinkingLevel = nodeData.inputs?.thinkingLevel as 'LOW' | 'MEDIUM' | 'HIGH'

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const obj: ChatVertexAIInput & Partial<GoogleGenerativeAIChatInput> = {
            temperature: parseFloat(temperature),
            modelName: customModelName || modelName,
            streaming: streaming ?? true
        }

        const authOptions = await buildGoogleCredentials(nodeData, options)
        if (authOptions && Object.keys(authOptions).length !== 0) obj.authOptions = authOptions

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache
        if (topK) obj.topK = parseFloat(topK)
        if (region) obj.location = region
        if (thinkingLevel) {
            obj.thinkingConfig = {
                thinkingLevel: thinkingLevel,
                includeThoughts: true
            }
        } else if (thinkingBudget) {
            obj.thinkingConfig = {
                thinkingBudget: parseInt(thinkingBudget, 10),
                includeThoughts: true
            }
        }

        const model = new ChatVertexAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)

        return model
    }
}

module.exports = { nodeClass: GoogleVertexAI_ChatModels }
