import { ZapierNLAWrapper, ZapiterNLAWrapperParams } from 'langchain/tools'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ZapierToolKit, createSqlAgent } from 'langchain/agents'

class ZapierNLA_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zapier NLA'
        this.name = 'zapierNLA'
        this.type = 'ZapierNLA'
        this.icon = 'zapier.png'
        this.category = 'Tools'
        this.description = 'Access to apps and actions on Zapier&#39;s platform through a natural language API interface'
        this.inputs = [
            {
                label: 'Zapier NLA Api Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(ZapierNLAWrapper)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.apiKey as string

        const obj: Partial<ZapiterNLAWrapperParams> = {
            apiKey
        }
        const zapier = new ZapierNLAWrapper(obj)
        const toolkit = await ZapierToolKit.fromZapierNLAWrapper(zapier)

        return toolkit.tools
    }
}

module.exports = { nodeClass: ZapierNLA_Tools }
