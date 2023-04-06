import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class SerpAPI implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serp API'
        this.name = 'serpAPI'
        this.type = 'SerpAPI'
        this.icon = 'serp.png'
        this.category = 'Tools'
        this.description = 'Wrapper around SerpAPI - a real-time API to access Google search results'
        this.inputs = [
            {
                label: 'Serp Api Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { SerpAPI } = await import('langchain/tools')
        return getBaseClasses(SerpAPI)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { SerpAPI } = await import('langchain/tools')
        const apiKey = nodeData.inputs?.apiKey as string
        return new SerpAPI(apiKey)
    }
}

module.exports = { nodeClass: SerpAPI }
