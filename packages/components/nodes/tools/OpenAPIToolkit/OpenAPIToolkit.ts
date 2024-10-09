import { load } from 'js-yaml'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getFileFromStorage, getVars, IDatabaseEntity, IVariable } from '../../../src'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import { z, ZodSchema, ZodTypeAny } from 'zod'
import { defaultCode, DynamicStructuredTool, howToUseCode } from './core'
import { DataSource } from 'typeorm'

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
        this.version = 2.0
        this.type = 'OpenAPIToolkit'
        this.icon = 'openapi.svg'
        this.category = 'Tools'
        this.description = 'Load OpenAPI specification, and converts each API endpoint to a tool'
        this.inputs = [
            {
                label: 'YAML File',
                name: 'yamlFile',
                type: 'file',
                fileType: '.yaml'
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
        const yamlFileBase64 = nodeData.inputs?.yamlFile as string
        const customCode = nodeData.inputs?.customCode as string
        const _headers = nodeData.inputs?.headers as string

        const headers = typeof _headers === 'object' ? _headers : _headers ? JSON.parse(_headers) : {}

        let data
        if (yamlFileBase64.startsWith('FILE-STORAGE::')) {
            const file = yamlFileBase64.replace('FILE-STORAGE::', '')
            const chatflowid = options.chatflowid
            const fileData = await getFileFromStorage(file, chatflowid)
            const utf8String = fileData.toString('utf-8')

            data = load(utf8String)
        } else {
            const splitDataURI = yamlFileBase64.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const utf8String = bf.toString('utf-8')
            data = load(utf8String)
        }
        if (!data) {
            throw new Error('Failed to load OpenAPI spec')
        }

        const _data: any = await $RefParser.dereference(data)

        const baseUrl = _data.servers[0]?.url
        if (!baseUrl) {
            throw new Error('OpenAPI spec does not contain a server URL')
        }

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const variables = await getVars(appDataSource, databaseEntities, nodeData)

        const flow = { chatflowId: options.chatflowid }

        const tools = getTools(_data.paths, baseUrl, headers, variables, flow, toolReturnDirect, customCode)
        return tools
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
    } else if (schema.oneOf) {
        // Handle oneOf by mapping each option to a Zod schema
        const zodSchemas = schema.oneOf.map((subSchema: any) => jsonSchemaToZodSchema(subSchema, requiredList, keyName))
        return z.union(zodSchemas)
    } else if (schema.enum) {
        // Handle enum types
        return requiredList.includes(keyName)
            ? z.enum(schema.enum).describe(schema?.description ?? keyName)
            : z
                  .enum(schema.enum)
                  .describe(schema?.description ?? keyName)
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
            ? z.number({ required_error: `${keyName} required` }).describe(schema?.description ?? keyName)
            : z
                  .number()
                  .describe(schema?.description ?? keyName)
                  .optional()
    } else if (schema.type === 'number') {
        return requiredList.includes(keyName)
            ? z.boolean({ required_error: `${keyName} required` }).describe(schema?.description ?? keyName)
            : z
                  .boolean()
                  .describe(schema?.description ?? keyName)
                  .optional()
    }

    // Fallback to unknown type if unrecognized
    return z.unknown()
}

const extractParameters = (param: ICommonObject, paramZodObj: ICommonObject) => {
    const paramSchema = param.schema
    const paramName = param.name
    const paramDesc = param.description || param.name

    if (paramSchema.type === 'string') {
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
    customCode?: string
) => {
    const tools = []
    for (const path in paths) {
        // example of path: "/engines"
        const methods = paths[path]
        for (const method in methods) {
            // example of method: "get"
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
                customCode
            }

            const dynamicStructuredTool = new DynamicStructuredTool(toolObj)
            dynamicStructuredTool.setVariables(variables)
            dynamicStructuredTool.setFlowObject(flow)
            dynamicStructuredTool.returnDirect = returnDirect
            tools.push(dynamicStructuredTool)
        }
    }
    return tools
}

module.exports = { nodeClass: OpenAPIToolkit_Tools }
