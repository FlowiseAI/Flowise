import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { SerpAPI } from 'langchain/tools'

class SerpAPI_Tools implements INode {
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
        this.baseClasses = [this.type, ...getBaseClasses(SerpAPI)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string
        return new SerpAPI(apiKey)
    }

    jsCodeImport(): string {
        return `import { SerpAPI } from 'langchain/tools'`
    }

    jsCode(): string {
        const code = `new SerpAPI()`
        return code
    }
}

module.exports = { nodeClass: SerpAPI_Tools }
