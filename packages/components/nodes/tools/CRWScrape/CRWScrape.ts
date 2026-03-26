import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod/v3'

// ---------------------------------------------------------------------------
// Lightweight CRW HTTP Client (same as document loader, duplicated to keep
// each node self-contained as per Flowise conventions)
// ---------------------------------------------------------------------------

class CRWClient {
    private apiUrl: string
    private headers: Record<string, string>

    constructor(config: { apiUrl: string; apiKey?: string }) {
        this.apiUrl = config.apiUrl.replace(/\/+$/, '')
        this.headers = {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
        }
    }

    async scrape(
        url: string,
        params: { onlyMainContent?: boolean; renderJs?: string; formats?: string[]; stealth?: boolean }
    ): Promise<{ success: boolean; data?: { markdown?: string; html?: string; plainText?: string } }> {
        const body = { url, ...params, integration: 'flowise' }
        const resp = await fetch(`${this.apiUrl}/v1/scrape`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        })
        if (!resp.ok) {
            const text = await resp.text()
            throw new Error(`CRW scrape failed (${resp.status}): ${text}`)
        }
        return resp.json()
    }
}

// ---------------------------------------------------------------------------
// Node Definition
// ---------------------------------------------------------------------------

class CRWScrape_Tools implements INode {
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
        this.label = 'CRW Scrape'
        this.name = 'crwScrape'
        this.version = 1.0
        this.type = 'CRWScrape'
        this.icon = 'crw.svg'
        this.category = 'Tools'
        this.description = 'Scrape a URL and extract content using CRW'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'CRW API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['crwApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: 'crw_scrape',
                description: 'The name the agent will use to call this tool'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                default:
                    'Scrape a web page and extract its content as text. Input should be a valid URL. Returns the page content in the specified format.',
                description: 'Description shown to the agent so it knows when to use this tool'
            },
            {
                label: 'Only Main Content',
                name: 'onlyMainContent',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true,
                description: 'Strip navigation, footer, and sidebar elements'
            },
            {
                label: 'JS Rendering',
                name: 'renderJs',
                type: 'options',
                options: [
                    { label: 'Auto (detect SPAs)', name: 'auto' },
                    { label: 'Force (always render)', name: 'force' },
                    { label: 'Off (no rendering)', name: 'off' }
                ],
                default: 'auto',
                optional: true,
                additionalParams: true,
                description: 'Control JavaScript rendering behavior'
            },
            {
                label: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { label: 'Markdown', name: 'markdown' },
                    { label: 'HTML', name: 'html' },
                    { label: 'Plain Text', name: 'plainText' }
                ],
                default: 'markdown',
                optional: true,
                additionalParams: true,
                description: 'Content format for scraped pages'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('crwApiKey', credentialData, nodeData)
        const apiUrl = getCredentialParam('crwApiUrl', credentialData, nodeData) || 'http://localhost:3000'

        const toolName = (nodeData.inputs?.toolName as string) || 'crw_scrape'
        const toolDescription =
            (nodeData.inputs?.toolDescription as string) ||
            'Scrape a web page and extract its content as text. Input should be a valid URL.'
        const onlyMainContent = (nodeData.inputs?.onlyMainContent as boolean) ?? true
        const renderJs = (nodeData.inputs?.renderJs as string) || 'auto'
        const outputFormat = (nodeData.inputs?.outputFormat as string) || 'markdown'

        return new DynamicStructuredTool({
            name: toolName,
            description: toolDescription,
            schema: z.object({
                url: z.string().describe('The URL to scrape')
            }),
            func: async ({ url }: { url: string }) => {
                const client = new CRWClient({ apiUrl, apiKey })
                const params: { onlyMainContent: boolean; renderJs?: string; formats: string[] } = {
                    onlyMainContent,
                    formats: [outputFormat]
                }
                if (renderJs !== 'auto') {
                    params.renderJs = renderJs
                }
                const response = await client.scrape(url, params)
                if (!response.success || !response.data) {
                    return `Error: CRW scrape returned no data for ${url}`
                }
                return response.data.markdown || response.data.html || response.data.plainText || ''
            }
        })
    }
}

module.exports = { nodeClass: CRWScrape_Tools }
