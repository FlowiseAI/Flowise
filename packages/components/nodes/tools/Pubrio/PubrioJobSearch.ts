import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioJobSearch } from '@pubrio/langchain-tools'

class PubrioJobSearch_Tools implements INode {
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
        this.label = 'Pubrio Search Jobs'
        this.name = 'pubrioJobSearch'
        this.version = 1.0
        this.type = 'PubrioJobSearch'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Search job postings by title, location, keyword, company, and date'
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
        return new PubrioJobSearch({ apiKey })
    }
}

module.exports = { nodeClass: PubrioJobSearch_Tools }
