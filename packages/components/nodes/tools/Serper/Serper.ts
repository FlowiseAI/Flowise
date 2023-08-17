import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Serper } from 'langchain/tools'

class Serper_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Serper'
        this.name = 'serper'
        this.version = 1.0
        this.type = 'Serper'
        this.icon = 'serper.png'
        this.category = 'Tools'
        this.description = 'Wrapper around Serper.dev - Google Search API'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['serperApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(Serper)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const serperApiKey = getCredentialParam('serperApiKey', credentialData, nodeData)
        return new Serper(serperApiKey)
    }
}

module.exports = { nodeClass: Serper_Tools }
