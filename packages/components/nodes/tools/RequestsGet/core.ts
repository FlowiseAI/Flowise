import { z } from 'zod'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { secureFetch } from '../../../src/httpSecurity'
import { parseJsonBody } from '../../../src/utils'

export const desc = `Use this when you need to execute a GET request to get data from a website.`

export interface Headers {
    [key: string]: string
}

export interface RequestParameters {
    headers?: Headers
    url?: string
    name?: string
    queryParamsSchema?: string
    description?: string
    maxOutputLength?: number
}

// Base schema for GET request
const createRequestsGetSchema = (queryParamsSchema?: string) => {
    // If queryParamsSchema is provided, parse it and add dynamic query params
    if (queryParamsSchema) {
        try {
            const parsedSchema = parseJsonBody(queryParamsSchema)
            const queryParamsObject: Record<string, z.ZodTypeAny> = {}

            Object.entries(parsedSchema).forEach(([key, config]: [string, any]) => {
                let zodType: z.ZodTypeAny = z.string()

                // Handle different types
                if (config.type === 'number') {
                    zodType = z.string().transform((val) => Number(val))
                } else if (config.type === 'boolean') {
                    zodType = z.string().transform((val) => val === 'true')
                }

                // Add description
                if (config.description) {
                    zodType = zodType.describe(config.description)
                }

                // Make optional if not required
                if (!config.required) {
                    zodType = zodType.optional()
                }

                queryParamsObject[key] = zodType
            })

            if (Object.keys(queryParamsObject).length > 0) {
                return z.object({
                    queryParams: z.object(queryParamsObject).optional().describe('Query parameters for the request')
                })
            }
        } catch (error) {
            console.warn('Failed to parse queryParamsSchema:', error)
        }
    }

    // Fallback to generic query params
    return z.object({
        queryParams: z.record(z.string()).optional().describe('Optional query parameters to include in the request')
    })
}

export class RequestsGetTool extends DynamicStructuredTool {
    url = ''
    maxOutputLength = Infinity
    headers = {}
    queryParamsSchema?: string

    constructor(args?: RequestParameters) {
        const schema = createRequestsGetSchema(args?.queryParamsSchema)

        const toolInput = {
            name: args?.name || 'requests_get',
            description: args?.description || desc,
            schema: schema,
            baseUrl: '',
            method: 'GET',
            headers: args?.headers || {}
        }
        super(toolInput)
        this.url = args?.url ?? this.url
        this.headers = args?.headers ?? this.headers
        this.maxOutputLength = args?.maxOutputLength ?? this.maxOutputLength
        this.queryParamsSchema = args?.queryParamsSchema
    }

    /** @ignore */
    async _call(arg: any): Promise<string> {
        const params = { ...arg }

        const inputUrl = this.url
        if (!inputUrl) {
            throw new Error('URL is required for GET request')
        }

        const requestHeaders = {
            ...(params.headers || {}),
            ...this.headers
        }

        // Process URL and query parameters based on schema
        let finalUrl = inputUrl
        const queryParams: Record<string, string> = {}

        if (this.queryParamsSchema && params.queryParams && Object.keys(params.queryParams).length > 0) {
            try {
                const parsedSchema = parseJsonBody(this.queryParamsSchema)
                const pathParams: Array<{ key: string; value: string }> = []

                Object.entries(params.queryParams).forEach(([key, value]) => {
                    const paramConfig = parsedSchema[key]
                    if (paramConfig && value !== undefined && value !== null) {
                        if (paramConfig.in === 'path') {
                            // Check if URL contains path parameter placeholder
                            const pathPattern = new RegExp(`:${key}\\b`, 'g')
                            if (finalUrl.includes(`:${key}`)) {
                                // Replace path parameters in URL (e.g., /:id -> /123)
                                finalUrl = finalUrl.replace(pathPattern, encodeURIComponent(String(value)))
                            } else {
                                // Collect path parameters to append to URL
                                pathParams.push({ key, value: String(value) })
                            }
                        } else if (paramConfig.in === 'query') {
                            // Add to query parameters
                            queryParams[key] = String(value)
                        }
                    }
                })

                // Append path parameters to URL if any exist
                if (pathParams.length > 0) {
                    let urlPath = finalUrl
                    // Remove trailing slash if present
                    if (urlPath.endsWith('/')) {
                        urlPath = urlPath.slice(0, -1)
                    }
                    // Append each path parameter
                    pathParams.forEach(({ value }) => {
                        urlPath += `/${encodeURIComponent(value)}`
                    })
                    finalUrl = urlPath
                }

                // Add query parameters to URL if any exist
                if (Object.keys(queryParams).length > 0) {
                    const url = new URL(finalUrl)
                    Object.entries(queryParams).forEach(([key, value]) => {
                        url.searchParams.append(key, value)
                    })
                    finalUrl = url.toString()
                }
            } catch (error) {
                console.warn('Failed to process queryParamsSchema:', error)
            }
        } else if (params.queryParams && Object.keys(params.queryParams).length > 0) {
            // Fallback: treat all parameters as query parameters if no schema is defined
            const url = new URL(finalUrl)
            Object.entries(params.queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, String(value))
            })
            finalUrl = url.toString()
        }

        try {
            const res = await secureFetch(finalUrl, {
                headers: requestHeaders
            })

            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}: ${res.statusText}`)
            }

            const text = await res.text()
            return text.slice(0, this.maxOutputLength)
        } catch (error) {
            throw new Error(`Failed to make GET request: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
