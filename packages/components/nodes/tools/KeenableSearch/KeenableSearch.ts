import { Tool } from '@langchain/core/tools'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { secureFetch } from '../../../src/httpSecurity'

const defaultName = 'keenable-search'
const defaultDesc =
    'A web search engine built for AI agents, powered by Keenable. Useful for answering questions about current events or looking up information on the web. Input should be a search query. Output is a JSON array of results.'
const DEFAULT_BASE_URL = 'https://api.keenable.ai'

interface KeenableResult {
    title?: string
    url: string
    description?: string
    published_at?: string | null
}

interface KeenableResponse {
    query?: string
    results: KeenableResult[]
}

class KeenableSearch_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Keenable Search'
        this.name = 'keenableSearch'
        this.version = 1.0
        this.type = 'KeenableSearch'
        this.icon = 'keenable.svg'
        this.category = 'Tools'
        this.description =
            'Wrapper around the Keenable Search API - a web search API built for AI agents. Works without an API key by default (keyless free tier).'
        this.inputs = [
            {
                label: 'API Key',
                name: 'keenableApiKey',
                type: 'password',
                description: 'Optional. Without a key the keyless free tier is used; a key lifts rate limits and enables realtime mode.',
                optional: true
            },
            {
                label: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    { label: 'Pro', name: 'pro' },
                    { label: 'Realtime', name: 'realtime' }
                ],
                default: 'pro',
                description: 'Search mode. "pro" (default, deeper) or "realtime" (low latency; requires an API key).',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Base URL',
                name: 'apiBase',
                type: 'string',
                default: DEFAULT_BASE_URL,
                description: 'Keenable API base URL (HTTPS). Override e.g. for staging.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                default: 10,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: defaultName,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 4,
                default: defaultDesc,
                additionalParams: true,
                optional: true
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(KeenableSearchTool)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const apiKey = nodeData.inputs?.keenableApiKey as string
        const apiBase = nodeData.inputs?.apiBase as string
        const mode = nodeData.inputs?.mode as string
        const maxResults = nodeData.inputs?.maxResults as string
        const toolName = nodeData.inputs?.toolName as string
        const toolDescription = nodeData.inputs?.toolDescription as string

        return new KeenableSearchTool({
            apiKey,
            apiBase,
            mode,
            maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
            toolName,
            toolDescription
        })
    }
}

class KeenableSearchTool extends Tool {
    static lc_name() {
        return 'KeenableSearchTool'
    }

    name = defaultName

    description = defaultDesc

    protected apiKey?: string

    protected apiBase: string = DEFAULT_BASE_URL

    protected mode: string = 'pro'

    protected maxResults: number = 10

    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            apiKey: 'KEENABLE_API_KEY'
        }
    }

    constructor({
        apiKey,
        apiBase,
        mode,
        maxResults,
        toolName,
        toolDescription
    }: {
        apiKey?: string
        apiBase?: string
        mode?: string
        maxResults?: number
        toolName?: string
        toolDescription?: string
    }) {
        super(...arguments)

        this.apiKey = (apiKey || '').trim() || undefined
        if (apiBase) this.apiBase = apiBase.replace(/\/$/, '')
        if (mode) this.mode = mode
        if (typeof maxResults === 'number' && !Number.isNaN(maxResults)) this.maxResults = maxResults

        // 'realtime' is not available on the keyless public endpoint.
        if (this.mode === 'realtime' && !this.apiKey) {
            throw new Error("Keenable 'realtime' mode requires an API key.")
        }

        if (toolName) this.name = toolName
        if (toolDescription) this.description = toolDescription
    }

    async _call(input: string): Promise<string> {
        // Keyless public endpoint by default; keyed endpoint + X-API-Key with a key.
        const path = this.apiKey ? '/v1/search' : '/v1/search/public'
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'keenable-flowise',
            // Attribution header the Keenable backend segments traffic by.
            'X-Keenable-Title': 'Flowise'
        }
        if (this.apiKey) headers['X-API-Key'] = this.apiKey

        const resp = await secureFetch(`${this.apiBase}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: input, mode: this.mode }),
            signal: AbortSignal.timeout(30 * 1000) as any
        })

        if (!resp.ok) {
            throw new Error(`Keenable request failed: ${resp.status} ${resp.statusText}`)
        }

        const res: KeenableResponse = await resp.json()
        const results = Array.isArray(res?.results) ? res.results : []

        if (!results.length) {
            return 'No good results found.'
        }

        // Return a valid JSON array (not a comma-joined list of JSON strings).
        return JSON.stringify(
            results
                .slice(0, this.maxResults)
                .filter((r) => r && r.url)
                .map((r) => ({ title: r.title || '', link: r.url, snippet: r.description || '' }))
        )
    }
}

module.exports = { nodeClass: KeenableSearch_Tools }
