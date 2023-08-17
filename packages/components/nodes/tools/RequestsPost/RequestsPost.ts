import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RequestParameters, desc, RequestsPostTool } from './core'

class RequestsPost_Tools implements INode {
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
        this.label = 'Requests Post'
        this.name = 'requestsPost'
        this.version = 1.0
        this.type = 'RequestsPost'
        this.icon = 'requestspost.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP POST requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsPostTool)]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                description:
                    'Agent will make call to this exact URL. If not specified, agent will try to figure out itself from AIPlugin if provided',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body',
                name: 'body',
                type: 'json',
                description:
                    'JSON body for the POST request. If not specified, agent will try to figure out itself from AIPlugin if provided',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'description',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Acts like a prompt to tell agent when it should use this tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const headers = nodeData.inputs?.headers as string
        const url = nodeData.inputs?.url as string
        const description = nodeData.inputs?.description as string
        const body = nodeData.inputs?.body as string

        const obj: RequestParameters = {}
        if (url) obj.url = url
        if (description) obj.description = description
        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            obj.headers = parsedHeaders
        }
        if (body) {
            const parsedBody = typeof body === 'object' ? body : JSON.parse(body)
            obj.body = parsedBody
        }

        return new RequestsPostTool(obj)
    }
}

module.exports = { nodeClass: RequestsPost_Tools }
