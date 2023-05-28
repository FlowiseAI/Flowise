import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Serper } from 'langchain/tools'

class Serper_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serper'
        this.name = 'serper'
        this.type = 'Serper'
        this.icon = 'serper.png'
        this.category = 'Tools'
        this.description = 'Wrapper around Serper.dev - Google Search API'
        this.inputs = [
            {
                label: 'Serper Api Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(Serper)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string
        return new Serper(apiKey)
    }
}

module.exports = { nodeClass: Serper_Tools }
