import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { SearchPeopleTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BSearchPeople_Tools implements INode {
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
        this.label = 'DataForB2B Search People'
        this.name = 'dataForB2BSearchPeople'
        this.version = 1.0
        this.type = 'DataForB2BSearchPeople'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Search people and B2B leads by structured filters: title, company, location, industry, skills, funding, LinkedIn URL'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['dataForB2BApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('dataForB2BApiKey', credentialData, nodeData)
        return new SearchPeopleTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BSearchPeople_Tools }
