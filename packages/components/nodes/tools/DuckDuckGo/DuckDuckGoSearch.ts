import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { DuckDuckGoSearch } from './core'

class DuckDuckGoSearch_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'DuckDuckGo Search'
        this.name = 'duckDuckGoSearch'
        this.version = 1.0
        this.type = 'DuckDuckGoSearch'
        this.icon = 'duckduckgo.svg'
        this.category = 'Tools'
        this.author = 'rawstack'
        this.description = 'Free web search tool using DuckDuckGo. No API key required.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DuckDuckGoSearch)]
        this.inputs = [
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Maximum number of search results to return',
                default: 4
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const maxResults = nodeData.inputs?.maxResults as number
        return new DuckDuckGoSearch({ maxResults: maxResults || 4 })
    }
}

module.exports = { nodeClass: DuckDuckGoSearch_Tools }
