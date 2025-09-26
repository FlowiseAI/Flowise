import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, stripHTMLFromToolInput, parseJsonBody } from '../../../src/utils'
import { desc, RequestParameters, RequestsGetTool } from './core'

const codeExample = `{
    "id": {
        "type": "string",
        "required": true,
        "in": "path",
        "description": "ID of the item to get. /:id"
    },
    "limit": {
        "type": "string",
        "in": "query",
        "description": "Limit the number of items to get. ?limit=10"
    }
}`

class RequestsGet_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Requests Get'
        this.name = 'requestsGet'
        this.version = 2.0
        this.type = 'RequestsGet'
        this.icon = 'get.png'
        this.category = 'Tools'
        this.description = 'Execute HTTP GET requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsGetTool), 'Tool']
        this.inputs = [
            {
                label: 'URL',
                name: 'requestsGetUrl',
                type: 'string',
                acceptVariable: true
            },
            {
                label: 'Name',
                name: 'requestsGetName',
                type: 'string',
                default: 'requests_get',
                description: 'Name of the tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'requestsGetDescription',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Describe to LLM when it should use this tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Headers',
                name: 'requestsGetHeaders',
                type: 'string',
                rows: 4,
                acceptVariable: true,
                additionalParams: true,
                optional: true,
                placeholder: `{
    "Authorization": "Bearer <token>"
}`
            },
            {
                label: 'Query Params Schema',
                name: 'requestsGetQueryParamsSchema',
                type: 'code',
                description: 'Description of the available query params to enable LLM to figure out which query params to use',
                placeholder: `{
    "id": {
        "type": "string",
        "required": true,
        "in": "path",
        "description": "ID of the item to get. /:id"
    },
    "limit": {
        "type": "string",
        "in": "query",
        "description": "Limit the number of items to get. ?limit=10"
    }
}`,
                optional: true,
                hideCodeExecute: true,
                additionalParams: true,
                codeExample: codeExample
            },
            {
                label: 'Max Output Length',
                name: 'requestsGetMaxOutputLength',
                type: 'number',
                description: 'Max length of the output. Remove this if you want to return the entire response',
                default: '2000',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const headers = (nodeData.inputs?.headers as string) || (nodeData.inputs?.requestsGetHeaders as string)
        const url = (nodeData.inputs?.url as string) || (nodeData.inputs?.requestsGetUrl as string)
        const description = (nodeData.inputs?.description as string) || (nodeData.inputs?.requestsGetDescription as string)
        const name = (nodeData.inputs?.name as string) || (nodeData.inputs?.requestsGetName as string)
        const queryParamsSchema =
            (nodeData.inputs?.queryParamsSchema as string) || (nodeData.inputs?.requestsGetQueryParamsSchema as string)
        const maxOutputLength = nodeData.inputs?.requestsGetMaxOutputLength as string

        const obj: RequestParameters = {}
        if (url) obj.url = stripHTMLFromToolInput(url)
        if (description) obj.description = description
        if (name)
            obj.name = name
                .toLowerCase()
                .replace(/ /g, '_')
                .replace(/[^a-z0-9_-]/g, '')
        if (queryParamsSchema) obj.queryParamsSchema = queryParamsSchema
        if (maxOutputLength) obj.maxOutputLength = parseInt(maxOutputLength, 10)
        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : parseJsonBody(stripHTMLFromToolInput(headers))
            obj.headers = parsedHeaders
        }

        return new RequestsGetTool(obj)
    }
}

module.exports = { nodeClass: RequestsGet_Tools }
