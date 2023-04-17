import { INode } from '../../../src/Interface'
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

    constructor() {
        this.label = 'Requests Post'
        this.name = 'requestsPost'
        this.type = 'RequestsPost'
        this.icon = 'requestspost.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP POST requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsPostTool)]
    }

    async init(): Promise<any> {
        return new RequestsPostTool()
    }
}

module.exports = { nodeClass: RequestsPost_Tools }
