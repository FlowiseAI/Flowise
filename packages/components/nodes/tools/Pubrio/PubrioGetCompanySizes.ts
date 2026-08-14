import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioGetCompanySizes } from '@pubrio/langchain-tools'

class PubrioGetCompanySizes_Tools implements INode {
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
        this.label = 'Pubrio Get Company Sizes'
        this.name = 'pubrioGetCompanySizes'
        this.version = 1.0
        this.type = 'PubrioGetCompanySizes'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Get all company size range codes for search filters'
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
        return new PubrioGetCompanySizes({ apiKey })
    }
}

module.exports = { nodeClass: PubrioGetCompanySizes_Tools }
