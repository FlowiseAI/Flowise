import { INode } from '../../../src/Interface'
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

    constructor() {
        this.label = 'Requests Get'
        this.name = 'requestsGet'
        this.type = 'RequestsGet'
        this.icon = 'requestsget.svg'
        this.category = 'Tools'
        this.description = 'Execute HTTP GET requests'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsGetTool)]
    }

    async init(): Promise<any> {
        return new RequestsGetTool()
    }
}

module.exports = { nodeClass: RequestsGet_Tools }
