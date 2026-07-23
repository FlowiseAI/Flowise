import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { secureFetch } from '../../../src/httpSecurity'

const SERPDIVE_API_URL = 'https://api.serpdive.com/v1/search'

interface SerpdiveSearchParams {
    model?: string
    answer?: boolean
    maxResults?: number
}

class SerpdiveAPI_Tools implements INode {
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
        this.label = 'SERPdive API'
        this.name = 'serpdiveAPI'
        this.version = 1.0
        this.type = 'SerpdiveAPI'
        this.icon = 'serpdive.svg'
        this.category = 'Tools'
        this.description =
            'Wrapper around SERPdive API - web search that returns extracted, answer-ready page content for LLMs and AI agents'
        this.inputs = [
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                options: [
                    { label: 'Mako (fast, lean)', name: 'mako' },
                    { label: 'Moby (full pages)', name: 'moby' }
                ],
                default: 'mako',
                description:
                    'Retrieval depth. Mako returns the fact-carrying sentences of each source (1 credit), Moby the full readable content of every page (1.5 credits)',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Include Answer',
                name: 'includeAnswer',
                type: 'boolean',
                default: false,
                description: 'Also return a written answer built from the sources. Included in the price, no extra credits',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                description: 'Hard cap on delivered results, best-ranked kept (1-10). Leave empty to get everything relevant',
                additionalParams: true,
                optional: true
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['serpdiveApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(SerpdiveSearch)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const serpdiveApiKey = getCredentialParam('serpdiveApiKey', credentialData, nodeData)

        const model = nodeData.inputs?.model as string
        const includeAnswer = nodeData.inputs?.includeAnswer as boolean
        const maxResults = nodeData.inputs?.maxResults as number

        const params: SerpdiveSearchParams = {}
        if (model) params.model = model
        if (includeAnswer) params.answer = true
        if (maxResults) params.maxResults = maxResults

        return new SerpdiveSearch({ apiKey: serpdiveApiKey, params })
    }
}

class SerpdiveSearch extends Tool {
    static lc_name() {
        return 'SerpdiveSearch'
    }

    name = 'serpdive_search'

    description =
        'A web search engine for AI agents. Useful for when you need to answer questions about current events or anything outside your training data. Input should be a search query in plain natural language. Output is a JSON payload of extracted, answer-ready content from live pages, best sources first.'

    protected apiKey: string

    protected params: SerpdiveSearchParams

    constructor({ apiKey, params }: { apiKey: string; params?: SerpdiveSearchParams }) {
        super()
        if (!apiKey) {
            throw new Error('SERPdive API key is required. Get one at https://serpdive.com/dashboard/keys')
        }
        this.apiKey = apiKey
        this.params = params ?? {}
    }

    async _call(input: string): Promise<string> {
        const body: ICommonObject = { query: input }
        if (this.params.model) body.model = this.params.model
        if (this.params.answer) body.answer = true
        if (this.params.maxResults) body.max_results = Math.max(1, Math.min(10, Math.trunc(this.params.maxResults)))

        const resp = await secureFetch(SERPDIVE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body),
            // Moby reads whole pages; the API docs recommend at least an 80 s client timeout
            signal: AbortSignal.timeout(90 * 1000) as any // node-fetch AbortSignal type predates native AbortSignal
        })

        let data: any
        try {
            data = await resp.json()
        } catch {
            data = undefined
        }
        if (!resp.ok) {
            throw new Error(data?.message ?? `SERPdive request failed with status ${resp.status}`)
        }
        if (!data?.results?.length && !data?.answer && !data?.extra_info) {
            return 'No good results found.'
        }
        return JSON.stringify(data)
    }
}

module.exports = { nodeClass: SerpdiveAPI_Tools }