import { INode, INodeParams } from '../../../src/Interface'
import { InMemoryCache as LangchainInMemoryCache } from 'langchain/cache'
import { getBaseClasses } from '../../../src'

class InMemoryCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    inMemoryCache: any

    constructor() {
        this.label = 'Local (Builtin) Cache'
        this.name = 'localCache'
        this.version = 1.0
        this.type = 'Cache'
        this.icon = 'memorycache.png'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(InMemoryCache)]
        this.inputs = []
    }

    async init(): Promise<any> {
        if (!this.inMemoryCache) {
            this.inMemoryCache = LangchainInMemoryCache.global()
        }
        return this.inMemoryCache
    }
}

module.exports = { nodeClass: InMemoryCache }
