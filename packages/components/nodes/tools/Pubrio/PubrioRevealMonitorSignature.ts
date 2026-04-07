import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioRevealMonitorSignature } from '@pubrio/langchain-tools'

class PubrioRevealMonitorSignature_Tools implements INode {
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
        this.label = 'Pubrio Reveal Monitor Signature'
        this.name = 'pubrioRevealMonitorSignature'
        this.version = 1.0
        this.type = 'PubrioRevealMonitorSignature'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Reveal webhook signature secret for a monitor'
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
        return new PubrioRevealMonitorSignature({ apiKey })
    }
}

module.exports = { nodeClass: PubrioRevealMonitorSignature_Tools }
