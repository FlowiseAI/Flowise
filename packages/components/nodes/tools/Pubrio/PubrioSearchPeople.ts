import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioPersonSearch } from '@pubrio/langchain-tools'

class PubrioSearchPeople_Tools implements INode {
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
        this.label = 'Pubrio Search People'
        this.name = 'pubrioSearchPeople'
        this.version = 1.0
        this.type = 'PubrioSearchPeople'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Search business professionals by name, title, department, seniority, location, and company'
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
        return new PubrioPersonSearch({ apiKey })
    }
}

module.exports = { nodeClass: PubrioSearchPeople_Tools }
