import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import fetch from 'node-fetch'

export const desc = `Use this when you want to create an image with OpenAI. The prompt should be a string. Choose between 'dall-e-3' for a direct URL response or 'gpt-image-1' to upload the generated image to storage.`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    prompt?: string
    model?: string
    n?: number
    size?: string
    quality?: string
    response_format?: string
    style?: string
    apiKey?: string
    format?: string
    output_compression?: number
    background?: string
    baseURL?: string
}

export class DallePostTool extends Tool {
    name = 'create_dalle_image'
    description = desc
    prompt = ''
    model = 'dall-e-3'
    apiKey = ''
    n = 1
    size = '1024x1024'
    quality = 'auto'
    response_format = 'b64_json'
    style = 'vivid'
    format = 'png'
    output_compression = 0
    background = 'auto'
    baseURL = process.env.ANSWERAI_DOMAIN || 'http://localhost:3000'

    constructor(args?: RequestParameters) {
        super()
        this.prompt = args?.prompt ?? this.prompt
        this.model = args?.model ?? this.model
        this.apiKey = args?.apiKey ?? ''
        this.n = args?.n ?? this.n
        this.size = args?.size ?? this.size
        this.quality = args?.quality ?? this.quality
        this.response_format = args?.response_format ?? this.response_format
        this.style = args?.style ?? this.style
        this.format = args?.format ?? this.format
        this.output_compression = args?.output_compression ?? this.output_compression
        this.background = args?.background ?? this.background
        this.baseURL = args?.baseURL ?? this.baseURL
    }

    /** @ignore */
    async _call(input: string) {
        try {
            const inputBody: any = {
                prompt: input || this.prompt,
                model: this.model,
                n: this.n,
                size: this.size,
                quality: this.quality,
                response_format: this.response_format,
                style: this.style,
                output_format: this.format,
                output_compression: this.output_compression,
                background: this.background
            }

            const res = await fetch(`${this.baseURL}/api/images/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inputBody)
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text)
            }

            const text = await res.text()
            return text
        } catch (error) {
            return `${error}`
        }
    }
}

class DallePost_Tool implements INode {
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
        this.label = 'Dall-E Post'
        this.name = 'dallePost'
        this.version = 1.0
        this.type = 'DallePost'
        this.icon = 'openai.svg'
        this.category = 'Tools'
        this.description = 'Creates an image using Dall-E'
        this.baseClasses = [this.type, ...getBaseClasses(DallePostTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                description: 'The prompt that will be used to generate the image. The prompt should be a string.'
            },
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'dall-e-3',
                        name: 'dall-e-3'
                    },
                    {
                        label: 'gpt-image-1',
                        name: 'gpt-image-1'
                    }
                ],
                default: 'dall-e-3',
                description: 'The model to use for generating the image.'
            },
            {
                label: 'Number of Images',
                name: 'n',
                type: 'options',
                options: [
                    { label: '1', name: '1' },
                    { label: '2', name: '2' },
                    { label: '3', name: '3' },
                    { label: '4', name: '4' }
                ],
                default: '1',
                description: 'Number of images to generate.'
            },
            {
                label: 'Size',
                name: 'size',
                type: 'options',
                options: [
                    { label: '1024x1024', name: '1024x1024' },
                    { label: '1536x1024', name: '1536x1024' },
                    { label: '1024x1536', name: '1024x1536' },
                    { label: 'auto', name: 'auto' }
                ],
                default: '1024x1024'
            },
            {
                label: 'Quality',
                name: 'quality',
                type: 'options',
                options: [
                    { label: 'auto', name: 'auto' },
                    { label: 'low', name: 'low' },
                    { label: 'medium', name: 'medium' },
                    { label: 'high', name: 'high' }
                ],
                default: 'auto'
            },
            {
                label: 'Response Format',
                name: 'response_format',
                type: 'options',
                options: [
                    { label: 'b64_json', name: 'b64_json' },
                    { label: 'url', name: 'url' }
                ],
                default: 'b64_json'
            },
            {
                label: 'Style',
                name: 'style',
                type: 'options',
                options: [
                    { label: 'vivid', name: 'vivid' },
                    { label: 'natural', name: 'natural' }
                ],
                default: 'vivid'
            },
            {
                label: 'Format',
                name: 'format',
                type: 'options',
                options: [
                    { label: 'png', name: 'png' },
                    { label: 'jpeg', name: 'jpeg' },
                    { label: 'webp', name: 'webp' }
                ],
                default: 'png'
            },
            {
                label: 'Output Compression',
                name: 'output_compression',
                type: 'string',
                description: 'Compression level for JPEG or WebP formats (0-100)'
            },
            {
                label: 'Background',
                name: 'background',
                type: 'options',
                options: [
                    { label: 'auto', name: 'auto' },
                    { label: 'transparent', name: 'transparent' },
                    { label: 'white', name: 'white' }
                ],
                default: 'auto'
            },
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                description: 'Base URL of the web application. Defaults to ANSWERAI_DOMAIN or http://localhost:3000',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const prompt = nodeData.inputs?.prompt as string
        const model = nodeData.inputs?.model as string
        const n = nodeData.inputs?.n as string
        const size = nodeData.inputs?.size as string
        const quality = nodeData.inputs?.quality as string
        const response_format = nodeData.inputs?.response_format as string
        const style = nodeData.inputs?.style as string
        const format = nodeData.inputs?.format as string
        const output_compression = nodeData.inputs?.output_compression as string
        const background = nodeData.inputs?.background as string
        const baseURL = (nodeData.inputs?.baseURL as string) || (options.baseURL as string)

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const obj: RequestParameters = {}
        if (prompt) obj.prompt = prompt
        if (model) obj.model = model
        if (n) obj.n = parseInt(n, 10)
        if (size) obj.size = size
        if (quality) obj.quality = quality
        if (response_format) obj.response_format = response_format
        if (style) obj.style = style
        if (format) obj.format = format
        if (output_compression) obj.output_compression = parseInt(output_compression, 10)
        if (background) obj.background = background
        if (openAIApiKey) obj.apiKey = openAIApiKey
        if (baseURL) obj.baseURL = baseURL

        return new DallePostTool(obj)
    }
}

module.exports = { nodeClass: DallePost_Tool }
