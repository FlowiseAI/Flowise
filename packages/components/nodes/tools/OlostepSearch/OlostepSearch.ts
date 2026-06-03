import { Tool } from '@langchain/core/tools'
import axios from 'axios'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

type OlostepLink = {
    url: string
    title: string
    description: string
}

class OlostepSearch extends Tool {
    static lc_name() {
        return 'OlostepSearch'
    }

    name = 'olostep_search'

    description = 'Search the web for current information, news, and facts.'

    private readonly apiKey: string
    private readonly numResults: number

    constructor(apiKey: string, numResults = 5, description?: string) {
        super()
        this.apiKey = apiKey
        this.numResults = numResults
        if (description) this.description = description
    }

    protected async _call(query: string): Promise<string> {
        if (!query) return 'No query provided'

        try {
            const response = await axios.post(
                'https://api.olostep.com/v1/searches',
                { query },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            const links = response?.data?.result?.links as OlostepLink[] | undefined
            if (!Array.isArray(links) || links.length === 0) return 'No results found'

            const results = links.slice(0, this.numResults)
            return results.map((r, i) => `${i + 1}. ${r.title}\n${r.description}\nURL: ${r.url}`).join('\n\n')
        } catch (error: any) {
            return `Olostep search error: ${error?.message ?? String(error)}`
        }
    }
}

class OlostepSearch_Tools implements INode {
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
        this.label = 'Olostep Search'
        this.name = 'olostepSearch'
        this.version = 1.0
        this.type = 'OlostepSearch'
        this.icon = 'olostep.svg'
        this.category = 'Tools'
        this.description = 'Search the web using Olostep and return relevant results with titles, URLs, and descriptions'
        this.inputs = [
            {
                name: 'numResults',
                label: 'Number of Results',
                type: 'number',
                default: 5,
                optional: true,
                additionalParams: true
            },
            {
                name: 'description',
                label: 'Tool Description',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true,
                default: 'Search the web for current information, news, and facts.'
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['olostepApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(OlostepSearch)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        if (!apiKey) {
            throw new Error('API Key is required for Olostep Search')
        }

        const numResultsRaw = nodeData.inputs?.numResults as number | string | undefined
        let numResults = 5
        if (numResultsRaw !== undefined && numResultsRaw !== '') {
            const parsed = parseInt(String(numResultsRaw), 10)
            if (!isNaN(parsed) && parsed > 0) numResults = parsed
        }
        const description = nodeData.inputs?.description as string

        return new OlostepSearch(String(apiKey), numResults, description)
    }
}

module.exports = { nodeClass: OlostepSearch_Tools }
