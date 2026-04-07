import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioPersonLinkedInLookup } from '@pubrio/langchain-tools'

class PubrioPersonLinkedInLookup_Tools implements INode {
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
        this.label = 'Pubrio LinkedIn Person Lookup'
        this.name = 'pubrioPersonLinkedInLookup'
        this.version = 1.0
        this.type = 'PubrioPersonLinkedInLookup'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Real-time LinkedIn person lookup by URL'
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
        return new PubrioPersonLinkedInLookup({ apiKey })
    }
}

module.exports = { nodeClass: PubrioPersonLinkedInLookup_Tools }
