import fetch from 'node-fetch'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const MODELSLAB_TEXT2IMG_URL = 'https://modelslab.com/api/v6/images/text2img'
const MODELSLAB_FETCH_URL = 'https://modelslab.com/api/v6/fetch'

const MODELSLAB_IMAGE_MODELS = [
    { label: 'FLUX.1 Dev (best quality)', name: 'flux' },
    { label: 'FLUX.1 Schnell (fast)', name: 'flux-schnell' },
    { label: 'Stable Diffusion XL 1.0', name: 'stable-diffusion-xl-base-1.0' },
    { label: 'Playground v2.5', name: 'playground-v2.5-1024px-aesthetic' },
    { label: 'DreamShaper 8', name: 'dreamshaper-8' },
    { label: 'Realistic Vision v5', name: 'realistic-vision-v5' },
    { label: 'JuggernautXL v9', name: 'juggernautXL-v9' },
    { label: 'Deliberate v3', name: 'deliberate-v3' },
    { label: 'RevAnimated v2', name: 'revAnimated-v2' },
    { label: 'Dreamlike Photoreal 2.0', name: 'dreamlike-photoreal-2.0' }
]

/**
 * ModelsLab Image Generator node for Flowise.
 *
 * Generates images using ModelsLab's text-to-image API.
 * Handles both synchronous and asynchronous (polling) API responses.
 *
 * Docs: https://docs.modelslab.com/image-generation/text-to-image
 */
class ModelsLabImageGenerator_Utilities implements INode {
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
    outputs: INodeParams[]

    constructor() {
        this.label = 'ModelsLab Image Generator'
        this.name = 'modelsLabImageGenerator'
        this.version = 1.0
        this.type = 'ModelsLabImageGenerator'
        this.icon = 'modelslab.png'
        this.category = 'Utilities'
        this.description =
            'Generate images using ModelsLab API (Flux, SDXL, Playground v2.5, and 1000+ community models). ' +
            'Returns image URL(s) as a string output for use in Flowise flows.'
        this.baseClasses = [this.type, 'string']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['modelsLabApi']
        }
        this.inputs = [
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                placeholder: 'a majestic mountain landscape at golden hour',
                description: 'Text description of the image to generate'
            },
            {
                label: 'Model',
                name: 'modelId',
                type: 'options',
                options: MODELSLAB_IMAGE_MODELS,
                default: 'flux',
                description: 'Image generation model'
            },
            {
                label: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                rows: 2,
                default: 'low quality, blurry, deformed, ugly, watermark',
                optional: true,
                additionalParams: true,
                description: 'What to exclude from the generated image'
            },
            {
                label: 'Width',
                name: 'width',
                type: 'number',
                default: 1024,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Height',
                name: 'height',
                type: 'number',
                default: 1024,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Inference Steps',
                name: 'numInferenceSteps',
                type: 'number',
                default: 20,
                step: 1,
                optional: true,
                additionalParams: true,
                description: 'More steps = better quality but slower'
            },
            {
                label: 'Guidance Scale (CFG)',
                name: 'guidanceScale',
                type: 'number',
                default: 7.5,
                step: 0.5,
                optional: true,
                additionalParams: true,
                description: 'How closely to follow the prompt'
            },
            {
                label: 'Seed',
                name: 'seed',
                type: 'number',
                default: -1,
                optional: true,
                additionalParams: true,
                description: 'Random seed for reproducibility. -1 for random.'
            },
            {
                label: 'Number of Images',
                name: 'samples',
                type: 'number',
                default: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Poll Timeout (seconds)',
                name: 'pollTimeout',
                type: 'number',
                default: 180,
                optional: true,
                additionalParams: true,
                description: 'Maximum seconds to wait for async generation jobs'
            }
        ]
        this.outputs = [
            {
                label: 'Image URL',
                name: 'imageUrl',
                baseClasses: ['string']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const prompt = nodeData.inputs?.prompt as string
        const modelId = (nodeData.inputs?.modelId as string) || 'flux'
        const negativePrompt = (nodeData.inputs?.negativePrompt as string) || ''
        const width = parseInt(nodeData.inputs?.width as string) || 1024
        const height = parseInt(nodeData.inputs?.height as string) || 1024
        const numInferenceSteps = parseInt(nodeData.inputs?.numInferenceSteps as string) || 20
        const guidanceScale = parseFloat(nodeData.inputs?.guidanceScale as string) || 7.5
        const seed = parseInt(nodeData.inputs?.seed as string) || -1
        const samples = parseInt(nodeData.inputs?.samples as string) || 1
        const pollTimeout = (parseInt(nodeData.inputs?.pollTimeout as string) || 180) * 1000

        if (!prompt) throw new Error('Prompt is required for image generation')

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('modelsLabApiKey', credentialData, nodeData)

        if (!apiKey) throw new Error('ModelsLab API key is required. Get yours at https://modelslab.com')

        const payload: Record<string, any> = {
            key: apiKey,
            model_id: modelId,
            prompt,
            negative_prompt: negativePrompt,
            width: String(width),
            height: String(height),
            samples: String(samples),
            num_inference_steps: numInferenceSteps,
            guidance_scale: guidanceScale,
            safety_checker: 'no',
            enhance_prompt: 'yes'
        }
        if (seed && seed !== -1) payload.seed = seed

        const response = await fetch(MODELSLAB_TEXT2IMG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const text = await response.text().catch(() => '')
            throw new Error(`ModelsLab API error ${response.status}: ${text}`)
        }

        let result: any = await response.json()

        if (result.status === 'failed') {
            throw new Error(`ModelsLab generation failed: ${result.message ?? 'unknown error'}`)
        }

        // Async path — poll until done
        if (result.status === 'processing') {
            result = await this.pollUntilDone(apiKey, result.id, pollTimeout)
        }

        const imageUrls: string[] = Array.isArray(result.output)
            ? result.output
            : result.output
            ? [result.output]
            : result.url
            ? [result.url]
            : []

        if (imageUrls.length === 0) throw new Error('ModelsLab returned no image URLs')

        // Return first URL as string; all URLs joined for multi-image requests
        return imageUrls.join('\n')
    }

    private async pollUntilDone(apiKey: string, taskId: string, timeoutMs: number): Promise<any> {
        const deadline = Date.now() + timeoutMs
        let interval = 3000

        while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, interval))

            const res = await fetch(`${MODELSLAB_FETCH_URL}/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: apiKey })
            })

            if (!res.ok) {
                interval = Math.min(interval * 1.2, 10000)
                continue
            }

            const data: any = await res.json()

            if (data.status === 'success') return data
            if (data.status === 'failed') {
                throw new Error(`ModelsLab task failed: ${data.message ?? 'unknown'}`)
            }

            interval = Math.min(interval * 1.2, 10000)
        }

        throw new Error(`ModelsLab image generation timed out after ${timeoutMs / 1000}s (task: ${taskId})`)
    }
}

module.exports = { nodeClass: ModelsLabImageGenerator_Utilities }
