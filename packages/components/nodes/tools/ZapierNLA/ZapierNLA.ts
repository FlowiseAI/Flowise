import { ZapierNLAWrapper, ZapierNLAWrapperParams } from 'langchain/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ZapierToolKit } from 'langchain/agents'
import { getCredentialData, getCredentialParam } from '../../../src'

class ZapierNLA_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Zapier NLA'
        this.name = 'zapierNLA'
        this.version = 1.0
        this.type = 'ZapierNLA'
        this.icon = 'zapier.svg'
        this.category = 'Tools'
        this.description = "Access to apps and actions on Zapier's platform through a natural language API interface"
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['zapierNLAApi']
        }
        this.baseClasses = [this.type, 'Tool']
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const zapierNLAApiKey = getCredentialParam('zapierNLAApiKey', credentialData, nodeData)

        const obj: Partial<ZapierNLAWrapperParams> = {
            apiKey: zapierNLAApiKey
        }
        const zapier = new ZapierNLAWrapper(obj)
        const toolkit = await ZapierToolKit.fromZapierNLAWrapper(zapier)

        return toolkit.tools
    }
}

module.exports = { nodeClass: ZapierNLA_Tools }
