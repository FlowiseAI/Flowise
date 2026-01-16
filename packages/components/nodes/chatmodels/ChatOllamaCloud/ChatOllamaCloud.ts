import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOpenAI, ClientOptions } from '@langchain/openai'

class ChatOllamaCloud_ChatModels implements INode {
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

    constructor() {
        this.label = 'ChatOllama Cloud'
        this.name = 'chatOllamaCloud'
        this.version = 1.2
        this.type = 'ChatOllamaCloud'
        this.icon = 'Ollama.svg'
        this.category = 'Chat Models'
        this.description = 'Chat with Ollama Cloud API with full tool calling support'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ollamaCloudApi']
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://ollama.com',
                description: 'Base URL for Ollama Cloud or compatible API server',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                description: 'Select the Ollama Cloud model to use',
                options: [
                    {
                        label: 'GPT-OSS 120B',
                        name: 'gpt-oss:120b',
                        description: 'Large general-purpose model with 120B parameters'
                    },
                    {
                        label: 'GPT-OSS 20B',
                        name: 'gpt-oss:20b',
                        description: 'Efficient general-purpose model with 20B parameters'
                    },
                    {
                        label: 'DeepSeek V3.1 671B',
                        name: 'deepseek-v3.1:671b',
                        description: 'Advanced reasoning model with 671B parameters'
                    },
                    {
                        label: 'Qwen3 Coder 480B',
                        name: 'qwen3-coder:480b',
                        description: 'Specialized coding model with 480B parameters'
                    },
                    {
                        label: 'Qwen3 VL 235B',
                        name: 'qwen3-vl:235b',
                        description: 'Vision-language model with 235B parameters'
                    },
                    {
                        label: 'Qwen3 Next 80B Cloud',
                        name: 'qwen3-next:80b-cloud',
                        description: 'Advanced Qwen3 model with 80B parameters, cloud version'
                    },
                    {
                        label: 'Mistral Large 3 675B Cloud',
                        name: 'mistral-large-3:675b-cloud',
                        description: 'Large Mistral model with 675B parameters, cloud version'
                    },
                    {
                        label: 'MiniStral 3 3B Cloud',
                        name: 'ministral-3:3b-cloud',
                        description: 'Efficient MiniStral model with 3B parameters, cloud version'
                    },
                    {
                        label: 'MiniStral 3 8B Cloud',
                        name: 'ministral-3:8b-cloud',
                        description: 'Balanced MiniStral model with 8B parameters, cloud version'
                    },
                    {
                        label: 'MiniStral 3 14B Cloud',
                        name: 'ministral-3:14b-cloud',
                        description: 'Advanced MiniStral model with 14B parameters, cloud version'
                    },
                    {
                        label: 'Cogito 2.1 671B Cloud',
                        name: 'cogito-2.1:671b-cloud',
                        description: 'Reasoning model with 671B parameters, cloud version'
                    },
                    {
                        label: 'Kimi K2 Thinking Cloud',
                        name: 'kimi-k2-thinking:cloud',
                        description: 'Advanced thinking model, cloud version'
                    },
                    {
                        label: 'MiniMax M2',
                        name: 'minimax-m2',
                        description: 'Efficient multi-modal model'
                    },
                    {
                        label: 'GLM 4.6',
                        name: 'glm-4.6',
                        description: 'General Language Model version 4.6'
                    }
                ],
                default: 'gpt-oss:120b'
            },
            {
                label: 'Custom Model Name',
                name: 'customModelName',
                type: 'string',
                placeholder: 'e.g. llama3:70b',
                description: 'Custom model name to use. If provided, it will override the model selected above.',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true,
                description: 'Controls randomness in the output. Higher values = more creative, lower values = more focused.'
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description: 'Maximum number of tokens to generate in the response'
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description: 'Nucleus sampling parameter. Controls diversity of output.'
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description: 'Penalizes repeated tokens based on frequency'
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true,
                description: 'Penalizes repeated tokens based on presence'
            },
            {
                label: 'Timeout',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description: 'Timeout in milliseconds for API requests'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const cache = nodeData.inputs?.cache as BaseCache
        const baseUrl = (nodeData.inputs?.baseUrl as string) || 'https://ollama.com'

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const ollamaCloudApiKey = getCredentialParam('ollamaCloudApiKey', credentialData, nodeData)

        const obj: any = {
            temperature: parseFloat(temperature),
            model: customModelName || modelName
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        
        // Set the API key in configuration to avoid early validation
        // Construct the full API URL by appending /api to the base URL
        const apiUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`
        
        obj.configuration = {
            apiKey: ollamaCloudApiKey,
            baseURL: apiUrl
        }

        // Helper function to transform Ollama response to OpenAI format
        const toOpenAIResponse = (ollamaResponse: any) => {
            const role = ollamaResponse?.message?.role ?? 'assistant'
            const content = ollamaResponse?.message?.content ?? ollamaResponse?.response ?? ''
            const finishReason = ollamaResponse?.done ? 'stop' : null
            const modelName = ollamaResponse?.model ?? 'unknown'
            const created = ollamaResponse?.created_at ? Math.floor(new Date(ollamaResponse.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000)

            const promptTokens = ollamaResponse?.prompt_eval_count ?? 0
            const completionTokens = ollamaResponse?.eval_count ?? 0
            const usage = promptTokens > 0 || completionTokens > 0
                ? {
                      prompt_tokens: promptTokens,
                      completion_tokens: completionTokens,
                      total_tokens: completionTokens + promptTokens
                  }
                : undefined

            const choice: any = {
                index: 0,
                message: {
                    role,
                    content: content || ''
                }
            }
            
            // Preserve tool_calls if Ollama returned them
            // CRITICAL: Convert arguments from object to JSON string for LangChain compatibility
            if (ollamaResponse?.message?.tool_calls) {
                choice.message.tool_calls = ollamaResponse.message.tool_calls.map((tc: any) => ({
                    ...tc,
                    function: {
                        ...tc.function,
                        arguments: typeof tc.function.arguments === 'string' 
                            ? tc.function.arguments 
                            : JSON.stringify(tc.function.arguments)
                    }
                }))
            }
            
            if (finishReason) {
                choice.finish_reason = finishReason
            }

            return {
                id: ollamaResponse?.id ?? `ollama-${Date.now()}`,
                object: 'chat.completion',
                created,
                model: modelName,
                choices: [choice],
                ...(usage && { usage })
            }
        }

        // Store tools in a closure so customFetch can access them
        let boundTools: any[] | null = null

        const customFetch = async (input: any, init?: any): Promise<any> => {
            const originalUrl =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input?.url
            
            const isChatCompletions = typeof originalUrl === 'string' && originalUrl.includes('/chat/completions')

            let finalInput = input
            let finalInit = init

            if (isChatCompletions) {
                // Rewrite URL from /chat/completions to /chat for Ollama API
                if (typeof originalUrl === 'string') {
                    try {
                        const targetUrl = new URL(originalUrl)
                        targetUrl.pathname = targetUrl.pathname.replace(/\/chat\/completions$/, '/chat')
                        finalInput = targetUrl.toString()
                    } catch (e) {
                        // Fallback: simple string replacement if URL parsing fails
                        finalInput = originalUrl.replace(/\/chat\/completions$/, '/chat')
                    }
                } else if (input instanceof URL) {
                    try {
                        input.pathname = input.pathname.replace(/\/chat\/completions$/, '/chat')
                        finalInput = input
                    } catch (e) {
                        // If pathname is read-only, create new URL
                        const urlStr = input.toString()
                        finalInput = urlStr.replace(/\/chat\/completions$/, '/chat')
                    }
                }
                
                // Modify request body for Ollama compatibility
                if (init?.body) {
                    try {
                        const bodyObj = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
                        
                        // Inject bound tools if they're not in the request
                        if (!bodyObj.tools && boundTools && boundTools.length > 0) {
                            // Convert LangChain tools to OpenAI format with proper JSON Schema
                            const convertedTools = boundTools.map((tool: any) => {
                                if (typeof tool.convertToOpenAITool === 'function') {
                                    return tool.convertToOpenAITool()
                                }
                                if (tool.type === 'function' && tool.function) {
                                    return tool
                                }
                                // Manual conversion for LangChain tools with Zod schema
                                if (tool.name && tool.schema) {
                                    try {
                                        const { zodToJsonSchema } = require('zod-to-json-schema')
                                        const jsonSchema = zodToJsonSchema(tool.schema)
                                        delete jsonSchema.$schema
                                        
                                        return {
                                            type: 'function',
                                            function: {
                                                name: tool.name,
                                                description: tool.description || '',
                                                parameters: jsonSchema
                                            }
                                        }
                                    } catch (e) {
                                        return {
                                            type: 'function',
                                            function: {
                                                name: tool.name,
                                                description: tool.description || '',
                                                parameters: {
                                                    type: 'object',
                                                    properties: {},
                                                    required: []
                                                }
                                            }
                                        }
                                    }
                                }
                                return {
                                    type: 'function',
                                    function: {
                                        name: tool.name || 'unknown',
                                        description: tool.description || '',
                                        parameters: {
                                            type: 'object',
                                            properties: {},
                                            required: []
                                        }
                                    }
                                }
                            })
                            
                            bodyObj.tools = convertedTools
                        }
                        
                        // Set tool_choice to auto if tools are present
                        if (bodyObj.tools && bodyObj.tools.length > 0 && !bodyObj.tool_choice) {
                            bodyObj.tool_choice = 'auto'
                        }
                        
                        // CRITICAL: Convert tool_calls arguments from STRING to OBJECT in messages
                        // LangChain sends arguments as JSON strings, but Ollama expects objects
                        if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
                            bodyObj.messages = bodyObj.messages.map((msg: any) => {
                                // Convert tool_calls in additional_kwargs
                                if (msg.additional_kwargs?.tool_calls && Array.isArray(msg.additional_kwargs.tool_calls)) {
                                    msg.additional_kwargs.tool_calls = msg.additional_kwargs.tool_calls.map((tc: any) => {
                                        if (tc.function && typeof tc.function.arguments === 'string') {
                                            try {
                                                return {
                                                    ...tc,
                                                    function: {
                                                        ...tc.function,
                                                        arguments: JSON.parse(tc.function.arguments)
                                                    }
                                                }
                                            } catch (e) {
                                                return tc
                                            }
                                        }
                                        return tc
                                    })
                                }
                                
                                // Also convert top-level tool_calls if present
                                if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
                                    msg.tool_calls = msg.tool_calls.map((tc: any) => {
                                        if (tc.function && typeof tc.function.arguments === 'string') {
                                            try {
                                                return {
                                                    ...tc,
                                                    function: {
                                                        ...tc.function,
                                                        arguments: JSON.parse(tc.function.arguments)
                                                    }
                                                }
                                            } catch (e) {
                                                return tc
                                            }
                                        }
                                        return tc
                                    })
                                }
                                
                                return msg
                            })
                        }
                        
                        // Force non-streaming for Ollama compatibility
                        bodyObj.stream = false
                        delete bodyObj.stream_options
                        
                        const modifiedBody = JSON.stringify(bodyObj)
                        const newBodyLength = Buffer.byteLength(modifiedBody, 'utf8')
                        
                        // Update Content-Length header to match the new body
                        const headers = init.headers ? { ...init.headers } : {}
                        headers['content-length'] = String(newBodyLength)
                        
                        finalInit = {
                            ...init,
                            body: modifiedBody,
                            headers
                        }
                    } catch (error) {
                        finalInit = init
                    }
                }
            }

            const response = await fetch(finalInput as any, finalInit)

            if (!isChatCompletions) return response

            // Transform Ollama response to OpenAI format
            const bodyText = await response.text()
            let finalBody = bodyText

            try {
                const parsed = JSON.parse(bodyText)
                
                // Check if already in OpenAI format
                if (parsed?.choices && Array.isArray(parsed.choices) && parsed.choices[0]?.message) {
                    finalBody = bodyText
                } else {
                    // Transform Ollama format to OpenAI format
                    const transformedResponse = toOpenAIResponse(parsed)
                    finalBody = JSON.stringify(transformedResponse)
                }
            } catch (error) {
                finalBody = bodyText
            }

            // Return proper Response object
            const ResponseCtor = (globalThis as any).Response
            if (!ResponseCtor) return response
            
            return new ResponseCtor(finalBody, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    'content-type': 'application/json',
                    'content-length': String(finalBody.length)
                }
            })
        }

        // Add custom fetch to existing configuration
        obj.configuration.fetch = customFetch

        const model = new ChatOpenAI(obj)
        
        // Force streaming to false for Ollama compatibility
        model.streaming = false
        
        // Override _streamResponseChunks to delegate to non-streaming generation
        const originalGenerate = model._generate.bind(model)
        model._streamResponseChunks = async function* (messages: any, options: any, runManager: any) {
            const result = await originalGenerate(messages, options, runManager)
            if (result && result.generations && result.generations.length > 0) {
                for (const generation of result.generations) {
                    yield generation
                }
            }
        } as any
        
        // Store bound tools for injection into requests
        const originalBindTools = model.bindTools?.bind(model)
        if (originalBindTools) {
            model.bindTools = function(tools: any) {
                if (Array.isArray(tools)) {
                    boundTools = tools
                }
                return originalBindTools(tools)
            } as any
        }
        
        return model
    }
}

module.exports = { nodeClass: ChatOllamaCloud_ChatModels }

