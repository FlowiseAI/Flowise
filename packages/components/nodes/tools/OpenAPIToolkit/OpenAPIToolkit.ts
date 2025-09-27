import { load } from 'js-yaml'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getFileFromStorage, getVars, IDatabaseEntity, IVariable } from '../../../src'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import { z, ZodSchema, ZodTypeAny } from 'zod'
import { defaultCode, DynamicStructuredTool, howToUseCode } from './core'
import { DataSource } from 'typeorm'
import fetch from 'node-fetch'

class OpenAPIToolkit_Tools implements INode {
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
        this.label = 'OpenAPI Toolkit'
        this.name = 'openAPIToolkit'
        this.version = 2.1
        this.type = 'OpenAPIToolkit'
        this.icon = 'openapi.svg'
        this.category = 'Tools'
        this.description = 'Load OpenAPI specification, and converts each API endpoint to a tool'
        this.inputs = [
            {
                label: 'Input Type',
                name: 'inputType',
                type: 'options',
                options: [
                    {
                        label: 'Upload File',
                        name: 'file'
                    },
                    {
                        label: 'Provide Link',
                        name: 'link'
                    }
                ],
                default: 'file',
                description: 'Choose how to provide the OpenAPI specification'
            },
            {
                label: 'OpenAPI File',
                name: 'openApiFile',
                type: 'file',
                fileType: '.yaml,.json',
                description: 'Upload your OpenAPI specification file (YAML or JSON)',
                show: {
                    inputType: 'file'
                }
            },
            {
                label: 'OpenAPI Link',
                name: 'openApiLink',
                type: 'string',
                placeholder: 'https://api.example.com/openapi.yaml or https://api.example.com/openapi.json',
                description: 'Provide a link to your OpenAPI specification (YAML or JSON)',
                show: {
                    inputType: 'link'
                }
            },
            {
                label: 'Server',
                name: 'selectedServer',
                type: 'asyncOptions',
                loadMethod: 'listServers',
                description: 'Select which server to use for API calls',
                refresh: true
            },
            {
                label: 'Available Endpoints',
                name: 'selectedEndpoints',
                type: 'asyncMultiOptions',
                loadMethod: 'listEndpoints',
                description: 'Select which endpoints to expose as tools',
                refresh: true
            },
            {
                label: 'Return Direct',
                name: 'returnDirect',
                description: 'Return the output of the tool directly to the user',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                description: 'Request headers to be sent with the API request. For example, {"Authorization": "Bearer token"}',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Remove null parameters',
                name: 'removeNulls',
                type: 'boolean',
                optional: true,
                description: 'Remove all keys with null values from the parsed arguments'
            },
            {
                label: 'Custom Code',
                name: 'customCode',
                type: 'code',
                hint: {
                    label: 'How to use',
                    value: howToUseCode
                },
                codeExample: defaultCode,
                description: `Custom code to return the output of the tool. The code should be a function that takes in the input and returns a string`,
                hideCodeExecute: true,
                default: defaultCode,
                additionalParams: true
            }
        ]
        this.baseClasses = [this.type, 'Tool']
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const toolReturnDirect = nodeData.inputs?.returnDirect as boolean
        const inputType = nodeData.inputs?.inputType as string
        const openApiFile = nodeData.inputs?.openApiFile as string
        const openApiLink = nodeData.inputs?.openApiLink as string
        const selectedServer = nodeData.inputs?.selectedServer as string
        const customCode = nodeData.inputs?.customCode as string
        const _headers = nodeData.inputs?.headers as string
        const removeNulls = nodeData.inputs?.removeNulls as boolean

        const headers = typeof _headers === 'object' ? _headers : _headers ? JSON.parse(_headers) : {}

        const specData = await this.loadOpenApiSpec(
            {
                inputType,
                openApiFile,
                openApiLink
            },
            options
        )
        if (!specData) throw new Error('Failed to load OpenAPI spec')

        const _data: any = await $RefParser.dereference(specData)

        // Use selected server or fallback to first server
        let baseUrl: string
        if (selectedServer && selectedServer !== 'error') {
            baseUrl = selectedServer
        } else {
            baseUrl = _data.servers?.[0]?.url
        }

        if (!baseUrl) throw new Error('OpenAPI spec does not contain a server URL')

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
        const flow = { chatflowId: options.chatflowid }

        let tools = getTools(_data.paths, baseUrl, headers, variables, flow, toolReturnDirect, customCode, removeNulls)

        // Filter by selected endpoints if provided
        const _selected = nodeData.inputs?.selectedEndpoints
        let selected: string[] = []
        if (_selected) {
            try {
                selected = typeof _selected === 'string' ? JSON.parse(_selected) : _selected
            } catch (e) {
                selected = []
            }
        }
        if (selected.length) {
            tools = tools.filter((t: any) => selected.includes(t.name))
        }

        return tools
    }

    //@ts-ignore
    loadMethods = {
        listServers: async (nodeData: INodeData, options: ICommonObject) => {
            try {
                const inputType = nodeData.inputs?.inputType as string
                const openApiFile = nodeData.inputs?.openApiFile as string
                const openApiLink = nodeData.inputs?.openApiLink as string
                const specData: any = await this.loadOpenApiSpec(
                    {
                        inputType,
                        openApiFile,
                        openApiLink
                    },
                    options
                )
                if (!specData) return []
                const _data: any = await $RefParser.dereference(specData)
                const items: { label: string; name: string; description?: string }[] = []
                const servers = _data.servers || []

                if (servers.length === 0) {
                    return [
                        {
                            label: 'No Servers Found',
                            name: 'error',
                            description: 'No servers defined in the OpenAPI specification'
                        }
                    ]
                }

                for (let i = 0; i < servers.length; i++) {
                    const server = servers[i]
                    const serverUrl = server.url || `Server ${i + 1}`
                    const serverDesc = server.description || serverUrl
                    items.push({
                        label: serverUrl,
                        name: serverUrl,
                        description: serverDesc
                    })
                }

                return items
            } catch (e) {
                return [
                    {
                        label: 'No Servers Found',
                        name: 'error',
                        description: 'No available servers, check the link/file and refresh'
                    }
                ]
            }
        },
        listEndpoints: async (nodeData: INodeData, options: ICommonObject) => {
            try {
                const inputType = nodeData.inputs?.inputType as string
                const openApiFile = nodeData.inputs?.openApiFile as string
                const openApiLink = nodeData.inputs?.openApiLink as string
                const specData: any = await this.loadOpenApiSpec(
                    {
                        inputType,
                        openApiFile,
                        openApiLink
                    },
                    options
                )
                if (!specData) return []
                const _data: any = await $RefParser.dereference(specData)
                const items: { label: string; name: string; description?: string }[] = []
                const paths = _data.paths || {}
                for (const path in paths) {
                    const methods = paths[path]
                    for (const method in methods) {
                        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                            const spec = methods[method]
                            const opId = spec.operationId || `${method.toUpperCase()} ${path}`
                            const desc = spec.description || spec.summary || opId
                            items.push({ label: opId, name: opId, description: desc })
                        }
                    }
                }
                items.sort((a, b) => a.label.localeCompare(b.label))
                return items
            } catch (e) {
                return [
                    {
                        label: 'No Endpoints Found',
                        name: 'error',
                        description: 'No available endpoints, check the link/file and refresh'
                    }
                ]
            }
        }
    }

    private async loadOpenApiSpec(
        args: {
            inputType?: string
            openApiFile?: string
            openApiLink?: string
        },
        options: ICommonObject
    ): Promise<any | null> {
        const { inputType = 'file', openApiFile = '', openApiLink = '' } = args
        try {
            if (inputType === 'link' && openApiLink) {
                const res = await fetch(openApiLink)
                const text = await res.text()

                // Auto-detect format from URL extension or content
                const isJsonUrl = openApiLink.toLowerCase().includes('.json')
                const isYamlUrl = openApiLink.toLowerCase().includes('.yaml') || openApiLink.toLowerCase().includes('.yml')

                if (isJsonUrl) {
                    return JSON.parse(text)
                } else if (isYamlUrl) {
                    return load(text)
                } else {
                    // Auto-detect format from content
                    try {
                        return JSON.parse(text)
                    } catch (_) {
                        return load(text)
                    }
                }
            }

            if (inputType === 'file' && openApiFile) {
                let utf8String: string
                let fileName = ''

                if (openApiFile.startsWith('FILE-STORAGE::')) {
                    const file = openApiFile.replace('FILE-STORAGE::', '')
                    fileName = file
                    const orgId = options.orgId
                    const chatflowid = options.chatflowid
                    const fileData = await getFileFromStorage(file, orgId, chatflowid)
                    utf8String = fileData.toString('utf-8')
                } else {
                    // Extract filename from data URI if possible
                    const splitDataURI = openApiFile.split(',')
                    const mimeType = splitDataURI[0] || ''
                    if (mimeType.includes('filename=')) {
                        const filenameMatch = mimeType.match(/filename=([^;]+)/)
                        if (filenameMatch) {
                            fileName = filenameMatch[1]
                        }
                    }
                    splitDataURI.pop()
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    utf8String = bf.toString('utf-8')
                }

                // Auto-detect format from file extension or content
                const isJsonFile = fileName.toLowerCase().endsWith('.json')
                const isYamlFile = fileName.toLowerCase().endsWith('.yaml') || fileName.toLowerCase().endsWith('.yml')

                if (isJsonFile) {
                    return JSON.parse(utf8String)
                } else if (isYamlFile) {
                    return load(utf8String)
                } else {
                    // Auto-detect format from content
                    try {
                        return JSON.parse(utf8String)
                    } catch (_) {
                        return load(utf8String)
                    }
                }
            }
        } catch (e) {
            console.error('Error loading OpenAPI spec:', e)
            return null
        }
        return null
    }
}

const jsonSchemaToZodSchema = (schema: any, requiredList: string[], keyName: string): ZodSchema<any> => {
    if (schema.properties) {
        // Handle object types by recursively processing properties
        const zodShape: Record<string, ZodTypeAny> = {}
        for (const key in schema.properties) {
            zodShape[key] = jsonSchemaToZodSchema(schema.properties[key], requiredList, key)
        }
        return z.object(zodShape)
    } else if (schema.oneOf || schema.anyOf) {
        // Handle oneOf/anyOf by mapping each option to a Zod schema
        const schemas = schema.oneOf || schema.anyOf
        const zodSchemas = schemas.map((subSchema: any) => jsonSchemaToZodSchema(subSchema, requiredList, keyName))
        return z.union(zodSchemas).describe(schema?.description ?? schema?.title ?? keyName)
    } else if (schema.enum) {
        // Handle enum types with their title and description
        return requiredList.includes(keyName)
            ? z.enum(schema.enum).describe(schema?.description ?? schema?.title ?? keyName)
            : z
                  .enum(schema.enum)
                  .describe(schema?.description ?? schema?.title ?? keyName)
                  .optional()
    } else if (schema.type === 'string') {
        return requiredList.includes(keyName)
            ? z.string({ required_error: `${keyName} required` }).describe(schema?.description ?? keyName)
            : z
                  .string()
                  .describe(schema?.description ?? keyName)
                  .optional()
    } else if (schema.type === 'array') {
        return z.array(jsonSchemaToZodSchema(schema.items, requiredList, keyName))
    } else if (schema.type === 'boolean') {
        return requiredList.includes(keyName)
            ? z.boolean({ required_error: `${keyName} required` }).describe(schema?.description ?? keyName)
            : z
                  .boolean()
                  .describe(schema?.description ?? keyName)
                  .optional()
    } else if (schema.type === 'number') {
        let numberSchema = z.number()
        if (typeof schema.minimum === 'number') {
            numberSchema = numberSchema.min(schema.minimum)
        }
        if (typeof schema.maximum === 'number') {
            numberSchema = numberSchema.max(schema.maximum)
        }
        return requiredList.includes(keyName)
            ? numberSchema.describe(schema?.description ?? keyName)
            : numberSchema.describe(schema?.description ?? keyName).optional()
    } else if (schema.type === 'integer') {
        let numberSchema = z.number().int()
        return requiredList.includes(keyName)
            ? numberSchema.describe(schema?.description ?? keyName)
            : numberSchema.describe(schema?.description ?? keyName).optional()
    } else if (schema.type === 'null') {
        return z.null()
    }
    console.error(`jsonSchemaToZodSchema returns UNKNOWN! ${keyName}`, schema)
    // Fallback to unknown type if unrecognized
    return z.unknown()
}

const extractParameters = (param: ICommonObject, paramZodObj: ICommonObject) => {
    const paramSchema = param.schema
    const paramName = param.name
    const paramDesc = paramSchema.description || paramSchema.title || param.description || param.name

    if (paramSchema.enum) {
        const enumValues = paramSchema.enum as string[]
        // Combine title and description from schema
        const enumDesc = [paramSchema.title, paramSchema.description, `Valid values: ${enumValues.join(', ')}`].filter(Boolean).join('. ')

        if (param.required) {
            paramZodObj[paramName] = z.enum(enumValues as [string, ...string[]]).describe(enumDesc)
        } else {
            paramZodObj[paramName] = z
                .enum(enumValues as [string, ...string[]])
                .describe(enumDesc)
                .optional()
        }
        return paramZodObj
    } else if (paramSchema.type === 'string') {
        if (param.required) {
            paramZodObj[paramName] = z.string({ required_error: `${paramName} required` }).describe(paramDesc)
        } else {
            paramZodObj[paramName] = z.string().describe(paramDesc).optional()
        }
    } else if (paramSchema.type === 'number') {
        if (param.required) {
            paramZodObj[paramName] = z.number({ required_error: `${paramName} required` }).describe(paramDesc)
        } else {
            paramZodObj[paramName] = z.number().describe(paramDesc).optional()
        }
    } else if (paramSchema.type === 'boolean') {
        if (param.required) {
            paramZodObj[paramName] = z.boolean({ required_error: `${paramName} required` }).describe(paramDesc)
        } else {
            paramZodObj[paramName] = z.boolean().describe(paramDesc).optional()
        }
    } else if (paramSchema.anyOf || paramSchema.type === 'anyOf') {
        // Handle anyOf by using jsonSchemaToZodSchema
        const requiredList = param.required ? [paramName] : []
        paramZodObj[paramName] = jsonSchemaToZodSchema(paramSchema, requiredList, paramName)
    }

    return paramZodObj
}

const getTools = (
    paths: any[],
    baseUrl: string,
    headers: ICommonObject,
    variables: IVariable[],
    flow: ICommonObject,
    returnDirect: boolean,
    customCode?: string,
    removeNulls?: boolean
) => {
    const tools = []
    for (const path in paths) {
        // example of path: "/engines"
        const methods = paths[path]
        for (const method in methods) {
            // example of method: "get"
            if (method !== 'get' && method !== 'post' && method !== 'put' && method !== 'delete' && method !== 'patch') {
                continue
            }
            const spec = methods[method]
            const toolName = spec.operationId
            const toolDesc = spec.description || spec.summary || toolName

            let zodObj: ICommonObject = {}
            if (spec.parameters) {
                // Get parameters with in = path
                let paramZodObjPath: ICommonObject = {}
                for (const param of spec.parameters.filter((param: any) => param.in === 'path')) {
                    paramZodObjPath = extractParameters(param, paramZodObjPath)
                }

                // Get parameters with in = query
                let paramZodObjQuery: ICommonObject = {}
                for (const param of spec.parameters.filter((param: any) => param.in === 'query')) {
                    paramZodObjQuery = extractParameters(param, paramZodObjQuery)
                }

                // Combine path and query parameters
                zodObj = {
                    ...zodObj,
                    PathParameters: z.object(paramZodObjPath),
                    QueryParameters: z.object(paramZodObjQuery)
                }
            }

            if (spec.requestBody) {
                let content: any = {}
                if (spec.requestBody.content['application/json']) {
                    content = spec.requestBody.content['application/json']
                } else if (spec.requestBody.content['application/x-www-form-urlencoded']) {
                    content = spec.requestBody.content['application/x-www-form-urlencoded']
                } else if (spec.requestBody.content['multipart/form-data']) {
                    content = spec.requestBody.content['multipart/form-data']
                } else if (spec.requestBody.content['text/plain']) {
                    content = spec.requestBody.content['text/plain']
                }
                const requestBodySchema = content.schema
                if (requestBodySchema) {
                    const requiredList = requestBodySchema.required || []
                    const requestBodyZodObj = jsonSchemaToZodSchema(requestBodySchema, requiredList, 'properties')
                    zodObj = {
                        ...zodObj,
                        RequestBody: requestBodyZodObj
                    }
                } else {
                    zodObj = {
                        ...zodObj,
                        input: z.string().describe('Query input').optional()
                    }
                }
            }

            if (!spec.parameters && !spec.requestBody) {
                zodObj = {
                    input: z.string().describe('Query input').optional()
                }
            }

            const toolObj = {
                name: toolName,
                description: toolDesc,
                schema: z.object(zodObj),
                baseUrl: `${baseUrl}${path}`,
                method: method,
                headers,
                customCode,
                strict: spec['x-strict'] === true,
                removeNulls
            }

            const dynamicStructuredTool = new DynamicStructuredTool(toolObj)
            dynamicStructuredTool.setVariables(variables)
            dynamicStructuredTool.setFlowObject(flow)
            dynamicStructuredTool.returnDirect = returnDirect
            if (toolName && toolDesc) tools.push(dynamicStructuredTool)
        }
    }
    return tools
}

module.exports = { nodeClass: OpenAPIToolkit_Tools }
