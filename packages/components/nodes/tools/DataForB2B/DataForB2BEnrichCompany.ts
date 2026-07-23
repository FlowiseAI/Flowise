import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { EnrichCompanyTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BEnrichCompany_Tools implements INode {
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
        this.label = 'DataForB2B Enrich Company'
        this.name = 'dataForB2BEnrichCompany'
        this.version = 1.0
        this.type = 'DataForB2BEnrichCompany'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Enrich a company from its domain, name or LinkedIn URL. Firmographics, headcount/size, industry, social profiles (B2B account enrichment)'
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
        return new EnrichCompanyTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BEnrichCompany_Tools }
