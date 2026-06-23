import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioPersonLookup } from '@pubrio/langchain-tools'

class PubrioPersonLookup_Tools implements INode {
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
        this.label = 'Pubrio Lookup Person'
        this.name = 'pubrioPersonLookup'
        this.version = 1.0
        this.type = 'PubrioPersonLookup'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Look up a person by LinkedIn URL or people search ID'
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
        return new PubrioPersonLookup({ apiKey })
    }
}

module.exports = { nodeClass: PubrioPersonLookup_Tools }
