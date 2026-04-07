import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioQueryBatchRedeem } from '@pubrio/langchain-tools'

class PubrioQueryBatchRedeem_Tools implements INode {
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
        this.label = 'Pubrio Query Batch Redeem'
        this.name = 'pubrioQueryBatchRedeem'
        this.version = 1.0
        this.type = 'PubrioQueryBatchRedeem'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Check the status and results of a batch contact reveal'
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
        return new PubrioQueryBatchRedeem({ apiKey })
    }
}

module.exports = { nodeClass: PubrioQueryBatchRedeem_Tools }
