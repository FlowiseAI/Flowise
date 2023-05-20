import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RequestsGetTool } from 'langchain/tools'

class RequestsGet_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Requests Get'
        this.name = 'requestsGet'
        this.type = 'RequestsGet'
        this.icon = 'requestsget.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP GET requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsGetTool)]
        this.inputs = [
            {
                label: 'Max Output Length',
                name: 'maxOutputLength',
                type: 'number',
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
        const maxOutputLength = nodeData.inputs?.maxOutputLength as string

        const obj: any = {}
        if (maxOutputLength) {
            obj.maxOutputLength = parseInt(maxOutputLength, 10)
        }

        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            return Object.keys(obj).length ? new RequestsGetTool(parsedHeaders, obj) : new RequestsGetTool(parsedHeaders)
        }
        return Object.keys(obj).length ? new RequestsGetTool(undefined, obj) : new RequestsGetTool()
    }
}

module.exports = { nodeClass: RequestsGet_Tools }
