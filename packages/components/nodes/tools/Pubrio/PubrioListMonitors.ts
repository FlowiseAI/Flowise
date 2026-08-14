import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioListMonitors } from '@pubrio/langchain-tools'

class PubrioListMonitors_Tools implements INode {
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
        this.label = 'Pubrio List Monitors'
        this.name = 'pubrioListMonitors'
        this.version = 1.0
        this.type = 'PubrioListMonitors'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'List all monitors with pagination'
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
        return new PubrioListMonitors({ apiKey })
    }
}

module.exports = { nodeClass: PubrioListMonitors_Tools }
