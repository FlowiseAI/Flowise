import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class RequestsPost implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'Requests Post'
        this.name = 'requestsPost'
        this.type = 'RequestsPost'
        this.icon = 'requestspost.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP POST requests'
    }

    async getBaseClasses(): Promise<string[]> {
        const { RequestsPostTool } = await import('langchain/tools')
        return getBaseClasses(RequestsPostTool)
    }

    async init(): Promise<any> {
        const { RequestsPostTool } = await import('langchain/tools')
        return new RequestsPostTool()
    }
}

module.exports = { nodeClass: RequestsPost }
