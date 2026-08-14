import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioCreateMonitor } from '@pubrio/langchain-tools'

class PubrioCreateMonitor_Tools implements INode {
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
        this.label = 'Pubrio Create Monitor'
        this.name = 'pubrioCreateMonitor'
        this.version = 1.0
        this.type = 'PubrioCreateMonitor'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Create a new signal monitor for jobs, news, or advertisements'
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
        return new PubrioCreateMonitor({ apiKey })
    }
}

module.exports = { nodeClass: PubrioCreateMonitor_Tools }
