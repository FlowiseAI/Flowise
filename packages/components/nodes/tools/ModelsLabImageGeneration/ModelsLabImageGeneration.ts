import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const MODEL_OPTIONS = [
    { label: 'Flux', name: 'flux' },
    { label: 'Flux Pro', name: 'fluxpro' },
    { label: 'SDXL', name: 'sdxl' },
    { label: 'SD 3.5', name: 'sd3.5' },
    { label: 'Realistic Vision v6', name: 'realistic-vision-v6' },
    { label: 'JuggernautXL v10', name: 'juggernautxl-v10' }
]

const SIZE_OPTIONS = [
    { label: '1024 × 1024', name: '1024x1024' },
    { label: '512 × 512', name: '512x512' },
    { label: '1344 × 768 (Landscape)', name: '1344x768' },
    { label: '768 × 1344 (Portrait)', name: '768x1344' }
]

class ModelsLabImageGeneration_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'ModelsLab Image Generation'
        this.name = 'modelsLabImageGeneration'
        this.version = 1.0
        this.type = 'ModelsLabImageGeneration'
        this.icon = 'modelslab.png'
        this.category = 'Tools'
        this.description = 'Generate images using ModelsLab AI. Supports Flux, SDXL, Stable Diffusion 3.5, and 100+ community models.'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['modelsLabApi']
        }
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: MODEL_OPTIONS,
                default: 'flux',
                description: 'ModelsLab model to use for generation.'
            },
            {
                label: 'Image Size',
                name: 'size',
                type: 'options',
                options: SIZE_OPTIONS,
                default: '1024x1024',
                description: 'Output image dimensions.'
            },
            {
                label: 'Negative Prompt',
                name: 'negativePrompt',
                type: 'string',
                default: 'blurry, low quality, watermark, distorted',
                optional: true,
                description: 'What to exclude from the generated image.'
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(ModelsLabImageTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('modelsLabApiKey', credentialData, nodeData)
        const model = nodeData.inputs?.model as string ?? 'flux'
        const size = nodeData.inputs?.size as string ?? '1024x1024'
        const negativePrompt = nodeData.inputs?.negativePrompt as string ?? 'blurry, low quality, watermark, distorted'

        return new ModelsLabImageTool({ apiKey, model, size, negativePrompt })
    }
}

interface ModelsLabImageToolParams {
    apiKey: string
    model: string
    size: string
    negativePrompt: string
}

class ModelsLabImageTool extends StructuredTool {
    static lc_name() { return 'ModelsLabImageTool' }
    name = 'modelslab_image_generation'
    description = 'Generate images using ModelsLab AI (Flux, SDXL, SD 3.5, and 100+ models). Input should be a detailed text description of the image.'
    schema = z.object({
        prompt: z.string().describe('A detailed text description of the image to generate.')
    })

    private apiKey: string
    private model: string
    private size: string
    private negativePrompt: string

    constructor({ apiKey, model, size, negativePrompt }: ModelsLabImageToolParams) {
        super()
        this.apiKey = apiKey
        this.model = model
        this.size = size
        this.negativePrompt = negativePrompt
    }

    async _call({ prompt }: { prompt: string }): Promise<string> {
        const [width, height] = this.size.split('x').map(Number)

        const payload = {
            key: this.apiKey,
            model_id: this.model,
            prompt,
            negative_prompt: this.negativePrompt,
            width,
            height,
            samples: 1,
            num_inference_steps: 30,
            safety_checker: 'no',
            enhance_prompt: 'yes'
        }

        const response = await fetch('https://modelslab.com/api/v6/images/text2img', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`ModelsLab API error: ${response.status} ${response.statusText}`)
        }

        let data = await response.json() as any

        if (data.status === 'error') {
            throw new Error(`ModelsLab generation failed: ${data.message ?? 'Unknown error'}`)
        }

        // Handle async processing: poll fetch endpoint until ready
        if (data.status === 'processing') {
            const requestId = data.id
            if (!requestId) throw new Error('ModelsLab returned processing status without request ID')

            const deadline = Date.now() + 300_000 // 5 min timeout
            while (Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 5000))
                const fetchResp = await fetch(`https://modelslab.com/api/v6/images/fetch/${requestId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: this.apiKey })
                })
                data = await fetchResp.json() as any
                if (data.status === 'success' || data.status === 'error') break
            }
        }

        if (data.status === 'error') {
            throw new Error(`ModelsLab generation failed: ${data.message ?? 'Unknown error'}`)
        }

        const imageUrl = data.output?.[0]
        if (!imageUrl) throw new Error('ModelsLab returned no image output')

        return `Generated image URL: ${imageUrl}`
    }
}

module.exports = { nodeClass: ModelsLabImageGeneration_Tools }
