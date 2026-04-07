import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { PubrioTestRunMonitor } from '@pubrio/langchain-tools'

class PubrioTestRunMonitor_Tools implements INode {
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
        this.label = 'Pubrio Test Run Monitor'
        this.name = 'pubrioTestRunMonitor'
        this.version = 1.0
        this.type = 'PubrioTestRunMonitor'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Execute a test run of a monitor'
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
        return new PubrioTestRunMonitor({ apiKey })
    }
}

module.exports = { nodeClass: PubrioTestRunMonitor_Tools }
