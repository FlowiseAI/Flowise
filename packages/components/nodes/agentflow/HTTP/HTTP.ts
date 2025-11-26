import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { AxiosRequestConfig, Method, ResponseType } from 'axios'
import FormData from 'form-data'
import * as querystring from 'querystring'
import { getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { secureAxiosRequest } from '../../../src/httpSecurity'

class HTTP_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'HTTP'
        this.name = 'httpAgentflow'
        this.version = 1.1
        this.type = 'HTTP'
        this.category = 'Agent Flows'
        this.description = 'Send a HTTP request'
        this.baseClasses = [this.type]
        this.color = '#FF7F7F'
        this.credential = {
            label: 'HTTP Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['httpBasicAuth', 'httpBearerToken', 'httpApiKey'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Method',
                name: 'method',
                type: 'options',
                options: [
                    {
                        label: 'GET',
                        name: 'GET'
                    },
                    {
                        label: 'POST',
                        name: 'POST'
                    },
                    {
                        label: 'PUT',
                        name: 'PUT'
                    },
                    {
                        label: 'DELETE',
                        name: 'DELETE'
                    },
                    {
                        label: 'PATCH',
                        name: 'PATCH'
                    }
                ],
                default: 'GET'
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                acceptVariable: true
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'array',
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Query Params',
                name: 'queryParams',
                type: 'array',
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Body Type',
                name: 'bodyType',
                type: 'options',
                options: [
                    {
                        label: 'JSON',
                        name: 'json'
                    },
                    {
                        label: 'Raw',
                        name: 'raw'
                    },
                    {
                        label: 'Form Data',
                        name: 'formData'
                    },
                    {
                        label: 'x-www-form-urlencoded',
                        name: 'xWwwFormUrlencoded'
                    }
                ],
                optional: true
            },
            {
                label: 'Body',
                name: 'body',
                type: 'string',
                acceptVariable: true,
                rows: 4,
                show: {
                    bodyType: ['raw', 'json']
                },
                optional: true
            },
            {
                label: 'Body',
                name: 'body',
                type: 'array',
                acceptVariable: true,
                show: {
                    bodyType: ['xWwwFormUrlencoded', 'formData']
                },
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Response Type',
                name: 'responseType',
                type: 'options',
                options: [
                    {
                        label: 'JSON',
                        name: 'json'
                    },
                    {
                        label: 'Text',
                        name: 'text'
                    },
                    {
                        label: 'Array Buffer',
                        name: 'arraybuffer'
                    },
                    {
                        label: 'Raw (Base64)',
                        name: 'base64'
                    }
                ],
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const method = nodeData.inputs?.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
        const url = nodeData.inputs?.url as string
        const headers = nodeData.inputs?.headers as ICommonObject
        const queryParams = nodeData.inputs?.queryParams as ICommonObject
        const bodyType = nodeData.inputs?.bodyType as 'json' | 'raw' | 'formData' | 'xWwwFormUrlencoded'
        const body = nodeData.inputs?.body as ICommonObject | string | ICommonObject[]
        const responseType = nodeData.inputs?.responseType as 'json' | 'text' | 'arraybuffer' | 'base64'

        const state = options.agentflowRuntime?.state as ICommonObject

        try {
            // Prepare headers
            const requestHeaders: Record<string, string> = {}

            // Add headers from inputs
            if (headers && Array.isArray(headers)) {
                for (const header of headers) {
                    if (header.key && header.value) {
                        requestHeaders[header.key] = header.value
                    }
                }
            }

            // Add credentials if provided
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            if (credentialData && Object.keys(credentialData).length !== 0) {
                const basicAuthUsername = getCredentialParam('basicAuthUsername', credentialData, nodeData)
                const basicAuthPassword = getCredentialParam('basicAuthPassword', credentialData, nodeData)
                const bearerToken = getCredentialParam('token', credentialData, nodeData)
                const apiKeyName = getCredentialParam('key', credentialData, nodeData)
                const apiKeyValue = getCredentialParam('value', credentialData, nodeData)

                // Determine which type of auth to use based on available credentials
                if (basicAuthUsername || basicAuthPassword) {
                    // Basic Auth
                    const auth = Buffer.from(`${basicAuthUsername}:${basicAuthPassword}`).toString('base64')
                    requestHeaders['Authorization'] = `Basic ${auth}`
                } else if (bearerToken) {
                    // Bearer Token
                    requestHeaders['Authorization'] = `Bearer ${bearerToken}`
                } else if (apiKeyName && apiKeyValue) {
                    // API Key in header
                    requestHeaders[apiKeyName] = apiKeyValue
                }
            }

            // Prepare query parameters
            let queryString = ''
            if (queryParams && Array.isArray(queryParams)) {
                const params = new URLSearchParams()
                for (const param of queryParams) {
                    if (param.key && param.value) {
                        params.append(param.key, param.value)
                    }
                }
                queryString = params.toString()
            }

            // Build final URL with query parameters
            const finalUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url

            // Prepare request config
            const requestConfig: AxiosRequestConfig = {
                method: method as Method,
                url: finalUrl,
                headers: requestHeaders,
                responseType: (responseType || 'json') as ResponseType
            }

            // Handle request body based on body type
            if (method !== 'GET' && body) {
                switch (bodyType) {
                    case 'json': {
                        requestConfig.data = typeof body === 'string' ? parseJsonBody(body) : body
                        requestHeaders['Content-Type'] = 'application/json'
                        break
                    }
                    case 'raw':
                        requestConfig.data = body
                        break
                    case 'formData': {
                        const formData = new FormData()
                        if (Array.isArray(body) && body.length > 0) {
                            for (const item of body) {
                                formData.append(item.key, item.value)
                            }
                        }
                        requestConfig.data = formData
                        break
                    }
                    case 'xWwwFormUrlencoded':
                        requestConfig.data = querystring.stringify(typeof body === 'string' ? parseJsonBody(body) : body)
                        requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
                        break
                }
            }

            // Make the secure HTTP request that validates all URLs in redirect chains
            const response = await secureAxiosRequest(requestConfig)

            // Process response based on response type
            let responseData
            if (responseType === 'base64' && response.data) {
                responseData = Buffer.from(response.data, 'binary').toString('base64')
            } else {
                responseData = response.data
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    http: {
                        method,
                        url,
                        headers,
                        queryParams,
                        bodyType,
                        body,
                        responseType
                    }
                },
                output: {
                    http: {
                        data: responseData,
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    }
                },
                state
            }

            return returnOutput
        } catch (error) {
            console.error('HTTP Request Error:', error)

            const errorMessage =
                error.response?.data?.message || error.response?.data?.error || error.message || 'An error occurred during the HTTP request'

            // Format error response
            const errorResponse: any = {
                id: nodeData.id,
                name: this.name,
                input: {
                    http: {
                        method,
                        url,
                        headers,
                        queryParams,
                        bodyType,
                        body,
                        responseType
                    }
                },
                error: {
                    name: error.name || 'Error',
                    message: errorMessage
                },
                state
            }

            // Add more error details if available
            if (error.response) {
                errorResponse.error.status = error.response.status
                errorResponse.error.statusText = error.response.statusText
                errorResponse.error.data = error.response.data
                errorResponse.error.headers = error.response.headers
            }

            throw new Error(errorMessage)
        }
    }
}

module.exports = { nodeClass: HTTP_Agentflow }
