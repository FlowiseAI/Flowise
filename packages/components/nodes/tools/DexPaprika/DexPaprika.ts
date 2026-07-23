import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray } from '../../../src/utils'
import { createDexPaprikaTools, desc } from './core'

class DexPaprika_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'DexPaprika'
        this.name = 'dexPaprika'
        this.version = 1.0
        this.type = 'DexPaprika'
        this.icon = 'dexpaprika.svg'
        this.category = 'Tools'
        this.description = desc
        this.baseClasses = [this.type, 'Tool']
        this.inputs = [
            {
                label: 'Actions',
                name: 'dexPaprikaActions',
                type: 'multiOptions',
                description: 'Actions the agent can perform. Leave empty to enable all actions',
                options: [
                    {
                        label: 'Get Token Price',
                        name: 'getTokenPrice'
                    },
                    {
                        label: 'Search Pools',
                        name: 'searchPools'
                    },
                    {
                        label: 'Get Pool OHLCV',
                        name: 'getPoolOhlcv'
                    }
                ],
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const actions = convertMultiOptionsToStringArray(nodeData.inputs?.dexPaprikaActions)
        return createDexPaprikaTools({ actions })
    }
}

module.exports = { nodeClass: DexPaprika_Tools }
