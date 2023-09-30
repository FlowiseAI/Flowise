import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { InMemoryCache } from 'langchain/cache'
import { getBaseClasses } from '../../../src'

class LLMInMemoryCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    inMemoryCache: any

    constructor() {
        this.label = 'Local (Builtin) Cache'
        this.name = 'localCache'
        this.version = 1.0
        this.type = 'LLMCache'
        this.icon = 'memorycache.png'
        this.category = 'LLM Cache'
        this.baseClasses = [this.type, 'LLMCacheBase']
        this.inputs = []
        this.outputs = [
            {
                label: 'LLM Cache',
                name: 'cache',
                baseClasses: [this.type, ...getBaseClasses(InMemoryCache)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        if (!this.inMemoryCache) {
            this.inMemoryCache = InMemoryCache.global()
        }
        return this.inMemoryCache
    }
}

module.exports = { nodeClass: LLMInMemoryCache }
