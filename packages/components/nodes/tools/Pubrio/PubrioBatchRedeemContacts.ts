import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioBatchRedeemContacts } from '@pubrio/langchain-tools'

class PubrioBatchRedeemContacts_Tools implements INode {
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
        this.label = 'Pubrio Batch Redeem Contacts'
        this.name = 'pubrioBatchRedeemContacts'
        this.version = 1.0
        this.type = 'PubrioBatchRedeemContacts'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Batch reveal contacts for multiple people at once (uses credits)'
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
        return new PubrioBatchRedeemContacts({ apiKey })
    }
}

module.exports = { nodeClass: PubrioBatchRedeemContacts_Tools }
