import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { TypeaheadTool } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class DataForB2BTypeahead_Tools implements INode {
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
        this.label = 'DataForB2B Typeahead'
        this.name = 'dataForB2BTypeahead'
        this.version = 1.0
        this.type = 'DataForB2BTypeahead'
        this.icon = 'dataforb2b.png'
        this.category = 'Tools'
        this.description =
            'Resolve the exact filter value (company, industry, job title, skill, school, location) before a people or company search'
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
        return new TypeaheadTool({ apiKey })
    }
}

module.exports = { nodeClass: DataForB2BTypeahead_Tools }
