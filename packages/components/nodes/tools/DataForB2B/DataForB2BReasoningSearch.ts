import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { ReasoningSearchTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BReasoningSearch_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'DataForB2B Reasoning Search'
        this.name = 'dataForB2BReasoningSearch'
        this.version = 1.0
        this.type = 'DataForB2BReasoningSearch'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Natural language (ICP) search for people, leads or companies. Describe your ideal lead in plain English'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['dataForB2BApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('dataForB2BApiKey', credentialData, nodeData)
        return new ReasoningSearchTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BReasoningSearch_Tools }
