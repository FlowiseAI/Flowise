import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { PubrioGetMonitorLogDetail } from '@pubrio/langchain-tools'

class PubrioGetMonitorLogDetail_Tools implements INode {
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
        this.label = 'Pubrio Get Monitor Log Detail'
        this.name = 'pubrioGetMonitorLogDetail'
        this.version = 1.0
        this.type = 'PubrioGetMonitorLogDetail'
        this.icon = 'pubrio.svg'
        this.category = 'Tools'
        this.description = 'Get details of a specific log entry'
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
        return new PubrioGetMonitorLogDetail({ apiKey })
    }
}

module.exports = { nodeClass: PubrioGetMonitorLogDetail_Tools }
