import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { SearchCompaniesTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BSearchCompanies_Tools implements INode {
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
        this.label = 'DataForB2B Search Companies'
        this.name = 'dataForB2BSearchCompanies'
        this.version = 1.0
        this.type = 'DataForB2BSearchCompanies'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Search companies and accounts by structured filters: industry, headcount/size, location, funding, keywords, LinkedIn URL'
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
        return new SearchCompaniesTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BSearchCompanies_Tools }
