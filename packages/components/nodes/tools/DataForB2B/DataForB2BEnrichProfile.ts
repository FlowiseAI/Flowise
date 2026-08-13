import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { EnrichProfileTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BEnrichProfile_Tools implements INode {
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
        this.label = 'DataForB2B Enrich LinkedIn Profile'
        this.name = 'dataForB2BEnrichProfile'
        this.version = 1.0
        this.type = 'DataForB2BEnrichProfile'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Enrich a professional profile from a LinkedIn URL. Full profile plus work email, personal email, phone and GitHub (email finder)'
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
        return new EnrichProfileTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BEnrichProfile_Tools }
