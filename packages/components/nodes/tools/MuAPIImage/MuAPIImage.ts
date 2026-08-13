import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const BASE_URL = 'https://api.muapi.ai/api/v1'

const IMAGE_MODELS = [
    'flux-schnell',
    'flux-dev',
    'flux-kontext-dev',
    'flux-kontext-pro',
    'flux-kontext-max',
    'hidream-fast',
    'hidream-dev',
    'hidream-full',
    'midjourney',
    'gpt4o',
    'gpt-image-2',
    'imagen4',
    'imagen4-fast',
    'seedream',
    'reve',
    'ideogram',
    'hunyuan',
    'wan2.1',
    'qwen'
] as const

async function submitAndPoll(apiKey: string, endpoint: string, payload: object): Promise<string> {
    if (!apiKey) {
        throw new Error('MuAPI API key is not configured. Please set it in the credential.')
    }

    const submitResp = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    if (!submitResp.ok) {
        const err = await submitResp.text()
        throw new Error(`MuAPI submit error (${submitResp.status}): ${err}`)
    }
    const submitData = await submitResp.json()
    const request_id: string | undefined = submitData?.request_id
    if (!request_id) {
        throw new Error(`MuAPI did not return a request_id. Response: ${JSON.stringify(submitData)}`)
    }

    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000))
        const pollResp = await fetch(`${BASE_URL}/predictions/${request_id}/result`, {
            headers: { 'x-api-key': apiKey }
        })
        if (!pollResp.ok) throw new Error(`MuAPI poll error (${pollResp.status})`)
        const data = await pollResp.json()
        if (!data) throw new Error('MuAPI poll returned an empty response')
        if (data.status === 'completed') {
            const outputs: string[] = data.outputs ?? []
            if (!outputs.length) throw new Error('Generation completed but returned no outputs')
            return outputs[0]
        }
        if (data.status === 'failed' || data.status === 'cancelled') {
            throw new Error(`Generation ${data.status}: ${data.error ?? ''}`)
        }
    }
    throw new Error('MuAPI generation timed out after 5 minutes')
}

class MuAPIImage_Tools implements INode {
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
        this.label = 'MuAPI Image Generation'
        this.name = 'muAPIImage'
        this.version = 1.0
        this.type = 'MuAPIImage'
        this.icon = 'muapi.svg'
        this.category = 'Tools'
        this.description =
            'Generate images from text prompts using muapi.ai — a unified API for 400+ models including Flux, Midjourney, GPT-4o Image, Imagen 4, Seedream, HiDream, and more.'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['muApiApi']
        }
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: IMAGE_MODELS.map((m) => ({ label: m, name: m })),
                default: 'flux-schnell',
                description: 'The image generation model to use'
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: 'generate_image',
                description: 'Name of the tool as exposed to the LLM agent'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 3,
                default:
                    'Generate an image from a text description using muapi.ai. Returns the URL of the generated image.',
                description: 'Description shown to the LLM to guide tool use'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(DynamicStructuredTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('muApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('MuAPI API key is missing. Please configure it in the credential settings.')
        }

        const model = (nodeData.inputs?.model as string) ?? 'flux-schnell'
        const toolName = (nodeData.inputs?.toolName as string) ?? 'generate_image'
        const toolDescription =
            (nodeData.inputs?.toolDescription as string) ??
            'Generate an image from a text description using muapi.ai. Returns the URL of the generated image.'

        return new DynamicStructuredTool({
            name: toolName,
            description: toolDescription,
            schema: z.object({
                prompt: z.string().describe('Text description of the image to generate'),
                width: z.number().optional().describe('Image width in pixels'),
                height: z.number().optional().describe('Image height in pixels')
            }),
            func: async ({ prompt, width, height }) => {
                const payload: Record<string, unknown> = { prompt }
                if (width) payload.width = width
                if (height) payload.height = height
                try {
                    const url = await submitAndPoll(apiKey, model, payload)
                    return JSON.stringify({ image_url: url, model, prompt })
                } catch (e: any) {
                    return `Error: ${e.message}`
                }
            }
        })
    }
}

module.exports = { nodeClass: MuAPIImage_Tools }
