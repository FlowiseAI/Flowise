import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import fetch from 'node-fetch'

interface DalleGenerationRequest {
    prompt: string
    model: string
    n: number
    size: string
    quality: string
    style?: string
    response_format?: string
    output_format?: string
    background?: string
    output_compression?: number
    organizationId: string
    userId: string
    userEmail: string
}

interface OpenAIImageData {
    b64_json?: string
    url?: string
}

interface OpenAIResponse {
    data: OpenAIImageData[]
}

const generateDalleImages = async (request: DalleGenerationRequest): Promise<OpenAIResponse> => {
    try {
        const apiKey = process.env.AAI_DEFAULT_OPENAI_API_KEY
        if (!apiKey) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'OpenAI API key not configured')
        }

        // Prepare request body based on model
        const requestBody: {
            prompt: string
            model: string
            n: number
            size: string
            quality: string
            style?: string
            response_format?: string
            output_format?: string
            background?: string
            output_compression?: number
        } = {
            prompt: request.prompt,
            model: request.model,
            n: request.n,
            size: request.size,
            quality: request.quality
        }

        // Add model-specific parameters
        if (request.model === 'dall-e-3') {
            requestBody.style = request.style || 'vivid'
            requestBody.response_format = request.response_format || 'b64_json'
        } else if (request.model === 'dall-e-2') {
            requestBody.response_format = request.response_format || 'b64_json'
        } else if (request.model === 'gpt-image-1') {
            // gpt-image-1 specific parameters
            if (request.output_format) requestBody.output_format = request.output_format
            if (request.background) requestBody.background = request.background
            if (request.output_compression) requestBody.output_compression = request.output_compression
            // Note: gpt-image-1 doesn't support response_format parameter
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `OpenAI API Error: ${errorText}`)
        }

        const openaiResponse = (await response.json()) as OpenAIResponse

        // Add request metadata to the response for storage
        const responseWithMetadata = openaiResponse as OpenAIResponse & { requestMetadata: any }
        responseWithMetadata.requestMetadata = {
            prompt: request.prompt,
            model: request.model,
            size: request.size,
            quality: request.quality,
            style: request.style,
            output_format: request.output_format,
            background: request.background,
            timestamp: new Date().toISOString(),
            userId: request.userId,
            userEmail: request.userEmail,
            organizationId: request.organizationId
        }

        return responseWithMetadata
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: dalleImageService.generateDalleImages - ${getErrorMessage(error)}`
        )
    }
}

export default {
    generateDalleImages
}
