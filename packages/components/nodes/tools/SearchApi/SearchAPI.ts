import { SearchApi } from '@langchain/community/tools/searchapi'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class SearchAPI_Tools implements INode {
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
        this.label = 'SearchApi'
        this.name = 'searchAPI'
        this.version = 1.0
        this.type = 'SearchAPI'
        this.icon = 'searchapi.svg'
        this.category = 'Tools'
        this.description = 'Real-time API for accessing Google Search data'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['searchApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(SearchApi)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const searchApiKey = getCredentialParam('searchApiKey', credentialData, nodeData)
        return new SearchApi(searchApiKey)
    }
}

module.exports = { nodeClass: SearchAPI_Tools }
