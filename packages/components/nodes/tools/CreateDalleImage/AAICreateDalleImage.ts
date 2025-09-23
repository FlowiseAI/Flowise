import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { Tool } from '@langchain/core/tools'

const desc = 'Creates images using DALL-E • Zero configuration required'

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: unknown
}

export interface RequestParameters {
    prompt?: string
    model?: string
    n?: number
    size?: string
    quality?: string
    response_format?: string
    style?: string
    format?: string
    output_compression?: number
    background?: string
    baseURL?: string
    organizationId?: string
    userId?: string
    userEmail?: string
}

export class AAIDallePostTool extends Tool {
    name = 'aai_create_dalle_image'
    description = desc
    prompt = ''
    model = 'dall-e-3'
    n = 1
    size = '1024x1024'
    quality = 'standard'
    response_format = 'b64_json'
    style = 'vivid'
    format = 'png'
    output_compression = 0
    background = 'auto'
    baseURL = 'http://localhost:4000' // Default fallback to Flowise server

    // User context for uploading images
    organizationId = ''
    userId = ''
    userEmail = ''

    constructor(args?: RequestParameters) {
        super()
        this.prompt = args?.prompt ?? this.prompt
        this.model = args?.model ?? this.model
        this.n = args?.n ?? this.n
        this.size = args?.size ?? this.size
        this.quality = args?.quality ?? this.quality
        this.response_format = args?.response_format ?? this.response_format
        this.style = args?.style ?? this.style
        this.format = args?.format ?? this.format
        this.output_compression = args?.output_compression ?? this.output_compression
        this.background = args?.background ?? this.background
        this.baseURL = args?.baseURL ?? this.baseURL
        this.organizationId = args?.organizationId ?? this.organizationId
        this.userId = args?.userId ?? this.userId
        this.userEmail = args?.userEmail ?? this.userEmail
    }

    async uploadToStorage(base64Data: string, filename: string, fullResponse: Record<string, unknown>) {
        try {
            // Import and use the storage utility directly
            const { addSingleFileToStorage } = await import('../../../src/storageUtils')
            const crypto = await import('node:crypto')

            // Convert base64 to Buffer
            const buffer = Buffer.from(base64Data, 'base64')

            // Generate unique identifier for this image generation session
            const timestamp = Date.now()
            const randomSuffix = crypto.randomBytes(8).toString('hex')
            const sessionId = `${timestamp}_${randomSuffix}`

            // Create image filename with session ID
            const imageFilename = `${sessionId}_${filename}`

            // Use user context or fallback to system defaults
            const orgId = this.organizationId || 'system-org'
            const usrId = this.userId || 'tool-system'

            // Store the image using organization/user folder structure
            const imageStorageUrl = await addSingleFileToStorage('image/png', buffer, imageFilename, 'dalle-images', orgId, usrId)

            // Store the full OpenAI response as JSON if provided
            let jsonStorageUrl = null
            if (fullResponse) {
                const jsonFilename = `${sessionId}_response.json`
                const jsonBuffer = Buffer.from(JSON.stringify(fullResponse, null, 2), 'utf8')
                jsonStorageUrl = await addSingleFileToStorage('application/json', jsonBuffer, jsonFilename, 'dalle-images', orgId, usrId)
            }

            // Convert FILE-STORAGE:: reference to a full URL with domain
            const domain =
                process.env.API_HOST || process.env.DOMAIN || process.env.FLOWISE_DOMAIN || this.baseURL || 'http://localhost:4000'
            const imageFileName = imageStorageUrl.replace('FILE-STORAGE::', '')
            const fullImageUrl = `${domain}/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${orgId}%2F${usrId}&fileName=${imageFileName}`

            const response = {
                url: fullImageUrl,
                success: true,
                sessionId
            } as { url: string; success: boolean; sessionId: string; jsonUrl?: string }

            // Add JSON URL to response if JSON was stored
            if (jsonStorageUrl) {
                const jsonFileName = jsonStorageUrl.replace('FILE-STORAGE::', '')
                response.jsonUrl = `${domain}/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${orgId}%2F${usrId}&fileName=${jsonFileName}`
            }

            return response
        } catch (error) {
            console.warn('Upload error:', error)
            return { success: false, error: String(error) }
        }
    }

    /** @ignore */
    async _call(input: string, _runManager?: CallbackManagerForToolRun | undefined) {
        try {
            // Use AAI default credentials instead of user-provided credentials
            const openaiApiKey = process.env.AAI_DEFAULT_OPENAI_API_KEY
            if (!openaiApiKey) {
                throw new Error('AAI_DEFAULT_OPENAI_API_KEY environment variable is not set')
            }

            // Prepare request body based on model
            const requestBody: Record<string, unknown> = {
                prompt: input || this.prompt,
                model: this.model,
                n: this.model === 'dall-e-3' ? 1 : this.n, // dall-e-3 only supports n=1
                size: this.size
            }

            // Set quality based on model
            if (this.model === 'dall-e-3') {
                // dall-e-3 supports: 'standard', 'hd'
                requestBody.quality = this.quality === 'hd' ? 'hd' : 'standard'
            } else if (this.model === 'dall-e-2') {
                // dall-e-2 only supports: 'standard'
                requestBody.quality = 'standard'
            } else if (this.model === 'gpt-image-1') {
                // gpt-image-1 supports: 'high', 'medium', 'low'
                if (this.quality === 'standard') {
                    requestBody.quality = 'high' // map standard to high for gpt-image-1
                } else if (['medium', 'low'].includes(this.quality)) {
                    requestBody.quality = this.quality
                } else {
                    requestBody.quality = 'high' // default for gpt-image-1
                }
            }

            // Add model-specific parameters
            if (this.model === 'dall-e-3') {
                requestBody.style = this.style
                requestBody.response_format = this.response_format
            } else if (this.model === 'dall-e-2') {
                requestBody.response_format = this.response_format
            } else if (this.model === 'gpt-image-1') {
                // gpt-image-1 specific parameters
                if (this.format) requestBody.output_format = this.format
                if (this.background) requestBody.background = this.background
                if (this.output_compression) requestBody.output_compression = this.output_compression
                // Note: gpt-image-1 doesn't support response_format parameter
            }

            // Call OpenAI API directly
            const fetch = (await import('node-fetch')).default
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`OpenAI API Error: ${errorText}`)
            }

            const openaiResponse = (await response.json()) as { data: Array<{ url?: string; b64_json?: string }> }

            // Add request metadata to the response for consistency with the service
            const responseWithMetadata = openaiResponse as {
                data: Array<{ url?: string; b64_json?: string }>
                requestMetadata?: {
                    prompt: string
                    model: string
                    size: string
                    quality: string
                    style?: string
                    response_format?: string
                    format?: string
                    output_compression?: number
                    background?: string
                    timestamp: string
                    userId: string
                    userEmail: string
                    organizationId: string
                }
            }
            responseWithMetadata.requestMetadata = {
                prompt: input || this.prompt,
                model: this.model,
                size: this.size,
                quality: this.quality,
                style: this.style,
                response_format: this.response_format,
                format: this.format,
                output_compression: this.output_compression,
                background: this.background,
                timestamp: new Date().toISOString(),
                userId: this.userId,
                userEmail: this.userEmail,
                organizationId: this.organizationId
            }

            // Process the results and upload to storage
            const results = []
            if (openaiResponse.data && Array.isArray(openaiResponse.data)) {
                for (let i = 0; i < openaiResponse.data.length; i++) {
                    const item = openaiResponse.data[i]
                    let base64Data = ''

                    if (item.url) {
                        // Download from URL and convert to base64
                        const imageResponse = await fetch(item.url)
                        const buffer = await imageResponse.arrayBuffer()
                        base64Data = Buffer.from(buffer).toString('base64')
                    } else if (item.b64_json) {
                        base64Data = item.b64_json
                    }

                    if (base64Data) {
                        try {
                            // Upload to storage using the dalle upload service
                            const uploadResponse = await this.uploadToStorage(
                                base64Data,
                                `dalle_image_${Date.now()}_${i + 1}.${this.format || 'png'}`,
                                responseWithMetadata
                            )

                            if (uploadResponse.success && 'url' in uploadResponse) {
                                results.push({
                                    type: 'url',
                                    data: uploadResponse.url,
                                    sessionId: uploadResponse.sessionId,
                                    jsonUrl: uploadResponse.jsonUrl
                                })
                            } else {
                                // Fallback to base64 if upload fails
                                results.push({
                                    type: 'base64',
                                    data: `data:image/${this.format || 'png'};base64,${base64Data}`
                                })
                            }
                        } catch (uploadError) {
                            console.warn('Failed to upload image to storage:', uploadError)
                            // Fallback to base64
                            results.push({
                                type: 'base64',
                                data: `data:image/${this.format || 'png'};base64,${base64Data}`
                            })
                        }
                    }
                }
            }

            return JSON.stringify({
                success: true,
                images: results,
                prompt: input || this.prompt,
                model: this.model,
                message: `Generated ${results.length} image(s) using ${this.model}`
            })
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: `${error}`
            })
        }
    }
}

class AAIDallePost_Tool implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    tags: string[]

    constructor() {
        this.label = 'Answer DALL-E Post'
        this.name = 'aaiDallePost'
        this.version = 1.1
        this.type = 'AAIDallePost'
        this.icon = 'openai.svg'
        this.category = 'Tools'
        this.description = 'Creates images using DALL-E • Zero configuration required'
        this.baseClasses = [this.type, ...getBaseClasses(AAIDallePostTool)]
        this.tags = ['AAI']
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
                        label: 'dall-e-2',
                        name: 'dall-e-2'
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
                description: 'Number of images to generate. Note: dall-e-3 only supports n=1.'
            },
            {
                label: 'Size',
                name: 'size',
                type: 'options',
                options: [
                    { label: '1024x1024 (all models)', name: '1024x1024' },
                    { label: '1792x1024 (dall-e-3 only)', name: '1792x1024' },
                    { label: '1024x1792 (dall-e-3 only)', name: '1024x1792' },
                    { label: '1536x1024 (gpt-image-1 only)', name: '1536x1024' },
                    { label: '1024x1536 (gpt-image-1 only)', name: '1024x1536' },
                    { label: '512x512 (dall-e-2 only)', name: '512x512' },
                    { label: '256x256 (dall-e-2 only)', name: '256x256' },
                    { label: 'auto (gpt-image-1 only)', name: 'auto' }
                ],
                default: '1024x1024',
                description: 'Image size varies by model. Use 1024x1024 for compatibility across all models.'
            },
            {
                label: 'Quality',
                name: 'quality',
                type: 'options',
                options: [
                    { label: 'Standard (dall-e-2/3) / High (gpt-image-1)', name: 'standard' },
                    { label: 'HD (dall-e-3 only)', name: 'hd' },
                    { label: 'Medium (gpt-image-1 only)', name: 'medium' },
                    { label: 'Low (gpt-image-1 only)', name: 'low' }
                ],
                default: 'standard',
                description:
                    'Quality setting varies by model: dall-e-3 (standard/hd), dall-e-2 (standard only), gpt-image-1 (high/medium/low)'
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
                description: 'Compression level for JPEG or WebP formats (0-100)',
                optional: true,
                additionalParams: true
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
                default: 'auto',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<AAIDallePostTool> {
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

        // Determine the correct API base URL for the Flowise server
        let baseURL: string
        if (process.env.NODE_ENV === 'development') {
            baseURL = 'http://localhost:4000'
        } else {
            // In production, prefer external API host, then fall back to Flowise domain
            baseURL = process.env.API_HOST || process.env.DOMAIN || process.env.FLOWISE_DOMAIN || 'http://localhost:4000'
        }

        const obj: RequestParameters = {}
        if (prompt) obj.prompt = prompt
        if (model) obj.model = model
        if (n) obj.n = Number.parseInt(n, 10)
        if (size) obj.size = size
        if (quality) obj.quality = quality
        if (response_format) obj.response_format = response_format
        if (style) obj.style = style
        if (format) obj.format = format
        if (output_compression) obj.output_compression = Number.parseInt(output_compression, 10)
        if (background) obj.background = background
        obj.baseURL = baseURL

        // Add user context from options
        if (options.user) {
            obj.organizationId = options.user.organizationId
            obj.userId = options.user.id
            obj.userEmail = options.user.email
        } else if (options.organizationId && options.userId) {
            // Fallback to direct organization/user IDs if user object not available
            obj.organizationId = options.organizationId
            obj.userId = options.userId
            obj.userEmail = options.userEmail || 'unknown@system.local'
        }

        return new AAIDallePostTool(obj)
    }
}

module.exports = { nodeClass: AAIDallePost_Tool }
