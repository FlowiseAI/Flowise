import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class RequestsGet implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'Requests Get'
        this.name = 'requestsGet'
        this.type = 'RequestsGet'
        this.icon = 'requestsget.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP GET requests'
    }

    async getBaseClasses(): Promise<string[]> {
        const { RequestsGetTool } = await import('langchain/tools')
        return getBaseClasses(RequestsGetTool)
    }

    async init(): Promise<any> {
        const { RequestsGetTool } = await import('langchain/tools')
        return new RequestsGetTool()
    }
}

module.exports = { nodeClass: RequestsGet }
