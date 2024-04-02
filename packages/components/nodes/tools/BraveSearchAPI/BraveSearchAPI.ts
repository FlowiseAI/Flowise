import { BraveSearch } from '@langchain/community/tools/brave_search'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class BraveSearchAPI_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'BraveSearch API'
        this.name = 'braveSearchAPI'
        this.version = 1.0
        this.type = 'BraveSearchAPI'
        this.icon = 'brave.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around BraveSearch API - a real-time API to access Brave search results'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['braveSearchApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(BraveSearch)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const braveApiKey = getCredentialParam('braveApiKey', credentialData, nodeData)
        return new BraveSearch({ apiKey: braveApiKey })
    }
}

module.exports = { nodeClass: BraveSearchAPI_Tools }
