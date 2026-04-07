import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioDuplicateMonitor } from '@pubrio/langchain-tools'

class PubrioDuplicateMonitor_Tools implements INode {
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
        this.label = 'Pubrio Duplicate Monitor'
        this.name = 'pubrioDuplicateMonitor'
        this.version = 1.0
        this.type = 'PubrioDuplicateMonitor'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Duplicate an existing monitor'
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
        return new PubrioDuplicateMonitor({ apiKey })
    }
}

module.exports = { nodeClass: PubrioDuplicateMonitor_Tools }
