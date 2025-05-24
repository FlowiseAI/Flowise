import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import auth0 from '@utils/auth/auth0'

export async function POST(req: Request) {
    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const apiKey = process.env.AAI_DEFAULT_OPENAI_API_KEY
    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI key not configured' }, { status: 500 })
    }

    // Get user's access token for Flowise authentication
    const { accessToken } = await auth0.getAccessToken({
        authorizationParams: { organization: session.user.organizationId }
    })
    if (!accessToken) {
        return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
    }

    // Validate required fields
    if (!body.prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Set default model if not provided
    if (!body.model) {
        body.model = 'dall-e-3'
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
        prompt: body.prompt,
        model: body.model,
        n: body.n || 1,
        size: body.size || '1024x1024',
        quality: body.quality || 'standard'
    }

    // Add model-specific parameters
    if (body.model === 'dall-e-3') {
        requestBody.style = body.style || 'vivid'
        requestBody.response_format = body.response_format || 'b64_json'
    } else if (body.model === 'dall-e-2') {
        requestBody.response_format = body.response_format || 'b64_json'
    } else if (body.model === 'gpt-image-1') {
        // gpt-image-1 specific parameters
        if (body.output_format) requestBody.output_format = body.output_format
        if (body.background) requestBody.background = body.background
        if (body.output_compression) requestBody.output_compression = body.output_compression
        // Note: gpt-image-1 doesn't support response_format parameter
    }

    try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('OpenAI API Error:', text)
            return NextResponse.json(
                {
                    error: `OpenAI API Error: ${text}`
                },
                { status: res.status }
            )
        }

        // Get the full OpenAI response
        const openaiResponse = await res.json()
        const images = []

        if (openaiResponse.data && Array.isArray(openaiResponse.data)) {
            for (let i = 0; i < openaiResponse.data.length; i++) {
                const item = openaiResponse.data[i]
                const base64 = item.b64_json
                if (base64) {
                    try {
                        // Generate a descriptive filename
                        const timestamp = Date.now()
                        const imageIndex = i + 1
                        const fileExtension = body.output_format || 'png'
                        const filename = `dalle_${body.model}_${timestamp}_${imageIndex}.${fileExtension}`

                        // Call Flowise server API to upload the image with organization structure
                        const flowiseDomain = process.env.DOMAIN || 'http://localhost:4000'
                        const uploadResponse = await fetch(`${flowiseDomain}/api/v1/upload-dalle-image`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${accessToken}`
                            },
                            body: JSON.stringify({
                                base64Data: base64,
                                filename: filename,
                                organizationId: session.user.organizationId,
                                userId: session.user.id,
                                fullResponse: {
                                    ...openaiResponse,
                                    // Add request metadata for context
                                    requestMetadata: {
                                        prompt: body.prompt,
                                        model: body.model,
                                        size: body.size,
                                        quality: body.quality,
                                        style: body.style,
                                        output_format: body.output_format,
                                        background: body.background,
                                        timestamp: new Date().toISOString(),
                                        userId: session.user.id,
                                        userEmail: session.user.email,
                                        organizationId: session.user.organizationId
                                    }
                                }
                            })
                        })

                        if (uploadResponse.ok) {
                            const uploadResult = await uploadResponse.json()
                            images.push({
                                url: uploadResult.url,
                                sessionId: uploadResult.sessionId,
                                jsonUrl: uploadResult.jsonUrl
                            })
                        } else {
                            console.error('Failed to upload image to storage')
                            // Fallback to base64 if storage fails
                            images.push({ b64_json: base64 })
                        }
                    } catch (uploadError) {
                        console.error('Error uploading image:', uploadError)
                        // Fallback to base64 if storage fails
                        images.push({ b64_json: base64 })
                    }
                }
            }
        }

        return NextResponse.json({
            data: images
        })
    } catch (error) {
        console.error('Image generation error:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate image'
            },
            { status: 500 }
        )
    }
}
