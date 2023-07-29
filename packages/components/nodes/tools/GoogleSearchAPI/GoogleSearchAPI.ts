import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { GoogleCustomSearch } from 'langchain/tools'


class GoogleSearchAPI_Tools implements INode {
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
        this.label = 'Google Custom Search'
        this.name = 'googleSearchAPI'
        this.version = 1.0
        this.type = 'GoogleSearchAPI'
        this.icon = 'google.png'
        this.category = 'Tools'
        this.description = 'Wrapper around Google Custom Search API - a real-time API to access Google search results'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleSearchApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(GoogleCustomSearch)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApiKey = getCredentialParam('googleApiKey', credentialData, nodeData)
        return new GoogleCustomSearch({ apiKey: googleApiKey })
    }
}

module.exports = { nodeClass: GoogleSearchAPI_Tools }
