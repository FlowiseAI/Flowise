import axios from 'axios'
import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOrcaRouter } from './FlowiseChatOrcaRouter'

const ORCAROUTER_DEFAULT_BASE_URL = 'https://api.orcarouter.ai/v1'
const ORCAROUTER_PRICING_URL = 'https://www.orcarouter.ai/api/pricing'
const ORCAROUTER_REFERER = 'https://www.orcarouter.ai/'
const ORCAROUTER_TITLE = 'Flowise'

const ORCAROUTER_AUTO: INodeOptionsValue = { label: 'Auto router (orcarouter/auto)', name: 'orcarouter/auto' }

// Offline fallback used when the live model list cannot be fetched.
const ORCAROUTER_FALLBACK_MODELS: INodeOptionsValue[] = [
    ORCAROUTER_AUTO,
    { label: 'OpenAI GPT-5.5', name: 'openai/gpt-5.5' },
    { label: 'Anthropic Claude Opus 4.8', name: 'anthropic/claude-opus-4.8' },
    { label: 'Google Gemini 3.5 Flash', name: 'google/gemini-3.5-flash' },
    { label: 'xAI Grok 4.3', name: 'grok/grok-4.3' },
    { label: 'DeepSeek V4 Pro', name: 'deepseek/deepseek-v4-pro' },
    { label: 'MiniMax M2.7', name: 'minimax/minimax-m2.7' },
    { label: 'Qwen 3.7 Max', name: 'qwen/qwen3.7-max' }
]

// Keep only chat-completions models; drop image/video/embedding/tts/stt/rerank and
// models served on non chat-completions endpoints (responses/completions only).
const isChatModel = (name: string, entry: any): boolean => {
    const endpoints = new Set<string>(entry?.supported_endpoint_types || [])
    const outputs = new Set<string>(entry?.output_modalities || [])
    const n = (name || '').toLowerCase()
    if (endpoints.has('image-generation') || endpoints.has('openai-video')) return false
    if (outputs.has('image')) return false
    if (['imagen', 'dall-e', 'gpt-image', 'grok-imagine'].some((k) => n.includes(k))) return false
    if (n.includes('embedding') || n.includes('tts') || n.endsWith('-speech')) return false
    if (n.includes('whisper') || n.includes('transcrib') || n.includes('rerank')) return false
    if (endpoints.has('openai-response') && !endpoints.has('openai')) return false
    if (n.includes('codex')) return false
    if (/^openai\/gpt-5(\.\d+)?-pro/.test(n)) return false
    return true
}

class ChatOrcaRouter_ChatModels implements INode {
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
        this.label = 'ChatOrcaRouter'
        this.name = 'chatOrcaRouter'
        this.version = 1.0
        this.type = 'ChatOrcaRouter'
        this.icon = 'orcaRouter.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around OrcaRouter, an OpenAI-compatible LLM router that exposes 150+ models behind a single endpoint.'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['orcaRouterApi']
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
                freeSolo: true,
                default: 'orcarouter/auto',
                description:
                    'The list is fetched live from the OrcaRouter catalog; you can also type any model id from <a target="_blank" href="https://www.orcarouter.ai/models">https://www.orcarouter.ai/models</a>. <code>orcarouter/auto</code> routes each request through the workspace-configured router.'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                description:
                    'Leave blank to use the upstream default. Reasoning models (e.g. Claude Opus 4.8, GPT-5 family, DeepSeek Reasoner) and the auto router reject this field, so it is not set by default.'
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
                label: 'Base Path',
                name: 'basepath',
                type: 'string',
                optional: true,
                default: ORCAROUTER_DEFAULT_BASE_URL,
                description: 'Override the OrcaRouter API base URL (e.g. for a self-hosted OrcaRouter-O2 deployment).',
                additionalParams: true
            },
            {
                label: 'Base Options',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                description:
                    'Additional headers to send with every request. Useful for overriding the default <code>HTTP-Referer</code> / <code>X-Title</code> attribution headers.',
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            // Live-fetch the public OrcaRouter catalog (no auth) so new models appear automatically.
            // The Model Name field is freeSolo, so users can still type any model id; if the fetch
            // fails (offline / endpoint down) we fall back to the flagship presets.
            try {
                const resp = await axios.get(ORCAROUTER_PRICING_URL, { timeout: 10000 })
                const data = resp?.data?.data
                if (!Array.isArray(data)) return ORCAROUTER_FALLBACK_MODELS
                const seen = new Set<string>()
                const models: INodeOptionsValue[] = []
                for (const entry of data) {
                    const name = entry?.model_name
                    if (!name || name === ORCAROUTER_AUTO.name || seen.has(name) || !isChatModel(name, entry)) continue
                    seen.add(name)
                    models.push({ label: name, name })
                }
                if (!models.length) return ORCAROUTER_FALLBACK_MODELS
                models.sort((a, b) => a.name.localeCompare(b.name))
                // Surface the auto router at the top of the list.
                return [ORCAROUTER_AUTO, ...models]
            } catch (error) {
                return ORCAROUTER_FALLBACK_MODELS
            }
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
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = (nodeData.inputs?.basepath as string) || ORCAROUTER_DEFAULT_BASE_URL
        const baseOptions = nodeData.inputs?.baseOptions
        const cache = nodeData.inputs?.cache as BaseCache
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const orcaRouterApiKey = getCredentialParam('orcaRouterApiKey', credentialData, nodeData)

        const obj: ChatOpenAIFields = {
            modelName,
            openAIApiKey: orcaRouterApiKey,
            apiKey: orcaRouterApiKey,
            streaming: streaming ?? true
        }

        if (temperature != null && temperature !== '') obj.temperature = parseFloat(temperature)
        if (maxTokens != null && maxTokens !== '') obj.maxTokens = parseInt(maxTokens, 10)
        if (topP != null && topP !== '') obj.topP = parseFloat(topP)
        if (frequencyPenalty != null && frequencyPenalty !== '') obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty != null && presencePenalty !== '') obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout != null && timeout !== '') obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache

        let parsedBaseOptions: Record<string, any> | undefined = undefined
        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatOrcaRouter's BaseOptions: " + exception)
            }
        }

        const defaultHeaders: Record<string, string> = {
            'HTTP-Referer': ORCAROUTER_REFERER,
            'X-Title': ORCAROUTER_TITLE,
            ...(parsedBaseOptions ?? {})
        }

        obj.configuration = {
            baseURL: basePath,
            defaultHeaders
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatOrcaRouter(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatOrcaRouter_ChatModels }
