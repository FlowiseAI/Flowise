import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, stripHTMLFromToolInput, parseJsonBody } from '../../../src/utils'
import { desc, RequestParameters, RequestsDeleteTool } from './core'

const codeExample = `{
    "id": {
        "type": "string",
        "required": true,
        "in": "path",
        "description": "ID of the item to delete. /:id"
    },
    "force": {
        "type": "string",
        "in": "query",
        "description": "Force delete the item. ?force=true"
    }
}`

class RequestsDelete_Tools implements INode {
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
        this.label = 'Requests Delete'
        this.name = 'requestsDelete'
        this.version = 1.0
        this.type = 'RequestsDelete'
        this.icon = 'del.png'
        this.category = 'Tools'
        this.description = 'Execute HTTP DELETE requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsDeleteTool), 'Tool']
        this.inputs = [
            {
                label: 'URL',
                name: 'requestsDeleteUrl',
                type: 'string',
                acceptVariable: true
            },
            {
                label: 'Name',
                name: 'requestsDeleteName',
                type: 'string',
                default: 'requests_delete',
                description: 'Name of the tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'requestsDeleteDescription',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Describe to LLM when it should use this tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Headers',
                name: 'requestsDeleteHeaders',
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
                name: 'requestsDeleteQueryParamsSchema',
                type: 'code',
                description: 'Description of the available query params to enable LLM to figure out which query params to use',
                placeholder: `{
    "id": {
        "type": "string",
        "required": true,
        "in": "path",
        "description": "ID of the item to delete. /:id"
    },
    "force": {
        "type": "string",
        "in": "query",
        "description": "Force delete the item. ?force=true"
    }
}`,
                optional: true,
                hideCodeExecute: true,
                additionalParams: true,
                codeExample: codeExample
            },
            {
                label: 'Max Output Length',
                name: 'requestsDeleteMaxOutputLength',
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
        const headers = (nodeData.inputs?.headers as string) || (nodeData.inputs?.requestsDeleteHeaders as string)
        const url = (nodeData.inputs?.url as string) || (nodeData.inputs?.requestsDeleteUrl as string)
        const description = (nodeData.inputs?.description as string) || (nodeData.inputs?.requestsDeleteDescription as string)
        const name = (nodeData.inputs?.name as string) || (nodeData.inputs?.requestsDeleteName as string)
        const queryParamsSchema =
            (nodeData.inputs?.queryParamsSchema as string) || (nodeData.inputs?.requestsDeleteQueryParamsSchema as string)
        const maxOutputLength = nodeData.inputs?.requestsDeleteMaxOutputLength as string

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

        return new RequestsDeleteTool(obj)
    }
}

module.exports = { nodeClass: RequestsDelete_Tools }
