import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioCompanyLookup } from '@pubrio/langchain-tools'

class PubrioCompanyLookup_Tools implements INode {
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
        this.label = 'Pubrio Lookup Company'
        this.name = 'pubrioCompanyLookup'
        this.version = 1.0
        this.type = 'PubrioCompanyLookup'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Look up detailed company information by domain, LinkedIn URL, or ID'
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
        return new PubrioCompanyLookup({ apiKey })
    }
}

module.exports = { nodeClass: PubrioCompanyLookup_Tools }
