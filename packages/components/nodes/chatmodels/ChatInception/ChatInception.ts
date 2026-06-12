import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

const DEFAULT_BASE_URL = 'https://api.inceptionlabs.ai/v1'

class ChatInception_ChatModels implements INode {
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
        this.label = 'ChatInception'
        this.name = 'chatInception'
        this.version = 1.0
        this.type = 'ChatInception'
        this.icon = 'inception.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Inception Mercury diffusion LLMs (OpenAI-compatible API)'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['inceptionApi']
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
                default: 'mercury-2'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.75,
                optional: true
            },
            {
                label: 'Reasoning Effort',
                name: 'reasoningEffort',
                type: 'options',
                description: 'Controls how much the model thinks before answering. Only applicable to reasoning models such as mercury-2.',
                options: [
                    { label: 'Instant', name: 'instant' },
                    { label: 'Low', name: 'low' },
                    { label: 'Medium', name: 'medium' },
                    { label: 'High', name: 'high' }
                ],
                optional: true,
                additionalParams: true
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
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base Path',
                name: 'basepath',
                type: 'string',
                optional: true,
                default: DEFAULT_BASE_URL,
                description: 'Override the default base URL for the API, e.g., "https://api.inceptionlabs.ai/v1"',
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                description: 'Default headers to include with every request to the API.',
                additionalParams: true
            }
        ]
    }

    loadMethods = {
        async listModels(_: INodeData, __?: ICommonObject): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatInception')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const reasoningEffort = nodeData.inputs?.reasoningEffort as string
        const basePath = nodeData.inputs?.basepath as string
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const inceptionApiKey = getCredentialParam('inceptionApiKey', credentialData, nodeData)

        const obj: ChatOpenAIFields = {
            model: modelName,
            apiKey: inceptionApiKey,
            openAIApiKey: inceptionApiKey,
            streaming: streaming ?? true
        }

        if (temperature != null && temperature !== '') obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        // Inception accepts "instant" in addition to the standard OpenAI reasoning efforts,
        // so pass it through modelKwargs to bypass the stricter ChatOpenAI typing.
        if (reasoningEffort) obj.modelKwargs = { reasoning_effort: reasoningEffort }

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : parseJsonBody(baseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatInception's BaseOptions: " + exception)
            }
        }

        obj.configuration = {
            baseURL: basePath || DEFAULT_BASE_URL,
            defaultHeaders: {
                ...(parsedBaseOptions || {})
            }
        }

        const model = new ChatOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: ChatInception_ChatModels }
