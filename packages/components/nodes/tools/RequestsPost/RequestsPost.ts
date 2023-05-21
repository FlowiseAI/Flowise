import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RequestsPostTool } from 'langchain/tools'

class RequestsPost_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Requests Post'
        this.name = 'requestsPost'
        this.type = 'RequestsPost'
        this.icon = 'requestspost.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP POST requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsPostTool)]
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
            return Object.keys(obj).length ? new RequestsPostTool(parsedHeaders, obj) : new RequestsPostTool(parsedHeaders)
        }
        return Object.keys(obj).length ? new RequestsPostTool(undefined, obj) : new RequestsPostTool()
    }
}

module.exports = { nodeClass: RequestsPost_Tools }
