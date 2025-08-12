import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue } from '../../../src'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'

const toFloat = (v?: string) => (v ? parseFloat(v) : undefined)
const toInt = (v?: string) => (v ? parseInt(v, 10) : undefined)

class ChatAIMLAPI_ChatModels implements INode {
    label = 'AI / ML API Chat'
    name = 'chatAIMLAPI'
    version = 1.0
    type = 'ChatAIMLAPI'
    icon = 'AIMLAPI.svg'
    category = 'Chat Models'
    description = 'Wrapper around AI / ML API Inference API'
    baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]

    credential: INodeParams = {
        label: 'Connect Credential',
        name: 'credential',
        type: 'credential',
        credentialNames: ['AIMLApi'],
        optional: true
    }

    inputs: INodeParams[] = [
        { label: 'Cache', name: 'cache', type: 'BaseCache', optional: true },
        {
            label: 'Model Name',
            name: 'modelName',
            type: 'asyncOptions',
            loadMethod: 'listModels',
            default: 'openai/gpt-4o'
        },
        { label: 'Temperature', name: 'temperature', type: 'number', step: 0.1, default: 0.9, optional: true },
        { label: 'Streaming', name: 'streaming', type: 'boolean', default: true, optional: true, additionalParams: true },
        { label: 'Max Tokens', name: 'maxTokens', type: 'number', step: 1, optional: true, additionalParams: true },
        { label: 'Top Probability', name: 'topP', type: 'number', step: 0.1, optional: true, additionalParams: true },
        { label: 'Frequency Penalty', name: 'frequencyPenalty', type: 'number', step: 0.1, optional: true, additionalParams: true },
        { label: 'Presence Penalty', name: 'presencePenalty', type: 'number', step: 0.1, optional: true, additionalParams: true },
        { label: 'Timeout', name: 'timeout', type: 'number', step: 1, optional: true, additionalParams: true },
        {
            label: 'BasePath',
            name: 'basepath',
            type: 'string',
            optional: true,
            default: 'https://api.aimlapi.com/v1',
            additionalParams: true
        },
        {
            label: 'BaseOptions',
            name: 'baseOptions',
            type: 'json',
            optional: true,
            additionalParams: true
        }
    ]

    loadMethods: {
        listModels: () => Promise<INodeOptionsValue[]>
    } = {
        async listModels(): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []
            try {
                const response = await fetch('https://api.aimlapi.com/v1/models')
                if (!response.ok) {
                    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
                }
                const data = await response.json()
                for (const model of data?.data || []) {
                    if (model.type === 'chat-completion') {
                        returnData.push({
                            name: model.id,
                            label: model.info?.name || model.id
                        })
                    }
                }
            } catch (err) {
                console.error('Failed to load AIMLAPI models:', err)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const {
            modelName,
            temperature,
            maxTokens,
            topP,
            frequencyPenalty,
            presencePenalty,
            timeout,
            streaming,
            basepath,
            baseOptions,
            cache
        } = nodeData.inputs || {}

        const basePath = (basepath as string) || 'https://api.aimlapi.com/v1'

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('AIMLApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('AIMLApiKey is missing. Please configure your credentials.')
        }

        let parsedBaseOptions: Record<string, any> | undefined
        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions as string)
            } catch (e) {
                throw new Error('Invalid JSON in BaseOptions: ' + e)
            }
        }

        const obj: ChatOpenAIFields = {
            modelName: modelName as string,
            openAIApiKey: apiKey,
            temperature: toFloat(temperature),
            maxTokens: toInt(maxTokens),
            topP: toFloat(topP),
            frequencyPenalty: toFloat(frequencyPenalty),
            presencePenalty: toFloat(presencePenalty),
            timeout: toInt(timeout),
            streaming: streaming ?? true,
            cache,
            configuration: {
                baseURL: basePath,
                defaultHeaders: parsedBaseOptions || {}
            }
        }

        return new ChatOpenAI(obj)
    }
}

module.exports = { nodeClass: ChatAIMLAPI_ChatModels }
