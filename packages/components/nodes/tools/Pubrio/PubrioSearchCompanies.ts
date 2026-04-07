import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioCompanySearch } from '@pubrio/langchain-tools'

class PubrioSearchCompanies_Tools implements INode {
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
        this.label = 'Pubrio Search Companies'
        this.name = 'pubrioSearchCompanies'
        this.version = 1.0
        this.type = 'PubrioSearchCompanies'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Search B2B companies by name, domain, location, industry, technology, headcount, revenue, and more'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pubrioApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _input: string, options?: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
        const apiKey = getCredentialParam('pubrioApiKey', credentialData, nodeData)
        return new PubrioCompanySearch({ apiKey })
    }
}

module.exports = { nodeClass: PubrioSearchCompanies_Tools }
