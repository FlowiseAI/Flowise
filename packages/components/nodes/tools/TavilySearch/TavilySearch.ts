import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class TavilySearch_Tools implements INode {
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
        this.label = 'Tavily Search API'
        this.name = 'tavilySearchAPI'
        this.version = 1.0
        this.type = 'TavilySearchAPI'
        this.icon = 'tavily.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around Tavily Search API - AI-optimized search engine for comprehensive, accurate, and trusted results'
        this.inputs = [
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                default: '5',
                description: 'The maximum number of results to return (1-20)',
                optional: true,
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['tavilyApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(TavilySearchResults)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const tavilyApiKey = getCredentialParam('tavilyApiKey', credentialData, nodeData)
        const maxResults = nodeData.inputs?.maxResults as string
        const maxResultsParsed = maxResults ? parseInt(maxResults, 10) : 5

        return new TavilySearchResults({
            apiKey: tavilyApiKey,
            maxResults: maxResultsParsed
        })
    }
}

module.exports = { nodeClass: TavilySearch_Tools }
