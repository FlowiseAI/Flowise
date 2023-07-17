import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { BraveSearch } from 'langchain/tools'

class BraveSearchAPI_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'BraveSearch API'
        this.name = 'braveSearchAPI'
        this.type = 'BraveSearchAPI'
        this.icon = 'brave.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around BraveSearch API - a real-time API to access Brave search results'
        this.inputs = [
            {
                label: 'BraveSearch API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(BraveSearch)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string
        return new BraveSearch({ apiKey })
    }
}

module.exports = { nodeClass: BraveSearchAPI_Tools }
