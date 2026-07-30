import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const REGION_OPTIONS = [
    { label: 'Global', name: 'global', baseUrl: 'https://api.minimax.io' },
    { label: 'Mainland China', name: 'china', baseUrl: 'https://api.minimaxi.com' }
]

const MODEL_OPTIONS = [
    { label: 'image-01', name: 'image-01' },
    { label: 'image-01-live', name: 'image-01-live' }
]

const ASPECT_RATIO_OPTIONS = [
    { label: '1:1 (Square)', name: '1:1' },
    { label: '16:9 (Landscape)', name: '16:9' },
    { label: '4:3 (Landscape)', name: '4:3' },
    { label: '3:2 (Landscape)', name: '3:2' },
    { label: '2:3 (Portrait)', name: '2:3' },
    { label: '3:4 (Portrait)', name: '3:4' },
    { label: '9:16 (Portrait)', name: '9:16' },
    { label: '21:9 (Widescreen)', name: '21:9' }
]

const RESPONSE_FORMAT_OPTIONS = [
    { label: 'URL', name: 'url' },
    { label: 'Base64', name: 'base64' }
]

const resolveBaseUrl = (region: string): string => {
    const match = REGION_OPTIONS.find((option) => option.name === region)
    return (match ?? REGION_OPTIONS[0]).baseUrl
}

class MinimaxImageGeneration_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'MiniMax Image Generation'
        this.name = 'minimaxImageGeneration'
        this.version = 1.0
        this.type = 'MinimaxImageGeneration'
        this.icon = 'minimax.svg'
        this.category = 'Tools'
        this.description = 'Generate images from a text prompt using the MiniMax image generation API.'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['minimaxApi']
        }
        this.inputs = [
            {
                label: 'Region',
                name: 'region',
                type: 'options',
                options: REGION_OPTIONS.map(({ label, name }) => ({ label, name })),
                default: 'global',
                description: 'API region to send the request to.'
            },
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: MODEL_OPTIONS,
                default: 'image-01',
                description: 'MiniMax image model to use for generation.'
            },
            {
                label: 'Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: ASPECT_RATIO_OPTIONS,
                default: '1:1',
                optional: true,
                description: 'Aspect ratio of the generated image.'
            },
            {
                label: 'Number of Images',
                name: 'n',
                type: 'number',
                default: 1,
                optional: true,
                additionalParams: true,
                description: 'Number of images to generate (1-9).'
            },
            {
                label: 'Response Format',
                name: 'responseFormat',
                type: 'options',
                options: RESPONSE_FORMAT_OPTIONS,
                default: 'url',
                optional: true,
                additionalParams: true,
                description: 'Return generated images as URLs or Base64-encoded strings. URLs are valid for 24 hours.'
            },
            {
                label: 'Prompt Optimizer',
                name: 'promptOptimizer',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true,
                description: 'Let MiniMax automatically optimize the prompt for better results.'
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(MinimaxImageTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('minimaxApiKey', credentialData, nodeData)
        if (!apiKey) throw new Error('MiniMax API Key is required')

        const region = (nodeData.inputs?.region as string) || 'global'
        const model = (nodeData.inputs?.model as string) || 'image-01'
        const aspectRatio = (nodeData.inputs?.aspectRatio as string) || '1:1'
        const responseFormat = (nodeData.inputs?.responseFormat as string) || 'url'
        const promptOptimizer = nodeData.inputs?.promptOptimizer as boolean
        const nInput = nodeData.inputs?.n
        const n = nInput === undefined || nInput === null || nInput === '' ? 1 : Number(nInput)

        return new MinimaxImageTool({
            apiKey,
            baseUrl: resolveBaseUrl(region),
            model,
            aspectRatio,
            responseFormat,
            promptOptimizer: promptOptimizer === undefined ? true : promptOptimizer,
            n: Number.isFinite(n) && n > 0 ? n : 1
        })
    }
}

interface MinimaxImageToolParams {
    apiKey: string
    baseUrl: string
    model: string
    aspectRatio: string
    responseFormat: string
    promptOptimizer: boolean
    n: number
}

class MinimaxImageTool extends StructuredTool {
    static lc_name() {
        return 'MinimaxImageTool'
    }

    name = 'minimax_image_generation'
    description =
        'Generate images from a text description using MiniMax image generation. Input should be a detailed text prompt describing the desired image.'
    schema = z.object({
        prompt: z.string().describe('A detailed text description of the image to generate.')
    })

    private apiKey: string
    private baseUrl: string
    private model: string
    private aspectRatio: string
    private responseFormat: string
    private promptOptimizer: boolean
    private n: number

    constructor(params: MinimaxImageToolParams) {
        super()
        this.apiKey = params.apiKey
        this.baseUrl = params.baseUrl
        this.model = params.model
        this.aspectRatio = params.aspectRatio
        this.responseFormat = params.responseFormat
        this.promptOptimizer = params.promptOptimizer
        this.n = params.n
    }

    async _call({ prompt }: { prompt: string }): Promise<string> {
        const payload: Record<string, any> = {
            model: this.model,
            prompt,
            aspect_ratio: this.aspectRatio,
            response_format: this.responseFormat,
            prompt_optimizer: this.promptOptimizer,
            n: this.n
        }

        const response = await fetch(`${this.baseUrl}/v1/image_generation`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`MiniMax API error: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as any
        const statusCode = data?.base_resp?.status_code
        if (statusCode !== undefined && statusCode !== 0) {
            const statusMsg = data?.base_resp?.status_msg ?? 'Unknown error'
            throw new Error(`MiniMax image generation failed: ${statusMsg}`)
        }

        if (this.responseFormat === 'base64') {
            const images = data?.data?.image_base64
            if (!Array.isArray(images) || images.length === 0) {
                throw new Error('MiniMax returned no image data')
            }
            return images.map((image: string) => `data:image/png;base64,${image}`).join('\n')
        }

        const urls = data?.data?.image_urls
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('MiniMax returned no image URLs')
        }
        return urls.join('\n')
    }
}

module.exports = { nodeClass: MinimaxImageGeneration_Tools }
