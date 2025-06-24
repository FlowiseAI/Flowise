import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'
import axios from 'axios'

class BrightDataWebScraperTool extends Tool {
    name = 'brightdata_web_scraper'
    description =
        'Scrapes web pages using Bright Data Web Unlocker with bot detection bypass. Returns content in markdown or HTML format. Input should be a single URL string.'

    constructor(
        private apiToken: string,
        private outputFormat: string = 'markdown',
        private timeoutMs: number = 60000,
        private zone: string = 'mcp_unlocker',
        private configuredUrl?: string
    ) {
        super()
    }

    private getApiHeaders() {
        return {
            authorization: `Bearer ${this.apiToken}`,
            'user-agent': 'flowise-brightdata/1.0.0',
            'Content-Type': 'application/json'
        }
    }

    async _call(input: string): Promise<string> {
        try {
            const urlToScrape = this.configuredUrl || input.trim()

            if (!urlToScrape) {
                const errorMsg = 'No URL provided. Please specify a URL either in the tool configuration or as input.'
                return `Error: ${errorMsg}`
            }

            try {
                new URL(urlToScrape)
                if (!urlToScrape.startsWith('http')) {
                    throw new Error('Invalid protocol')
                }
            } catch (e) {
                const errorMsg = 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
                return `Error: ${errorMsg}`
            }

            const requestData: any = {
                url: urlToScrape,
                zone: this.zone,
                format: 'raw'
            }

            if (this.outputFormat === 'markdown') {
                requestData.data_format = 'markdown'
            }

            const response = await axios({
                url: 'https://api.brightdata.com/request',
                method: 'POST',
                data: requestData,
                headers: this.getApiHeaders(),
                responseType: 'text',
                timeout: this.timeoutMs
            })

            if (response.data && typeof response.data === 'string') {
                return response.data
            } else if (response.data) {
                return String(response.data)
            } else {
                const errorMsg = 'No content received from the webpage.'
                return `Error: ${errorMsg}`
            }
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                const errorMsg = `Request timeout after ${this.timeoutMs / 1000} seconds. The webpage took too long to load.`
                return `Error: ${errorMsg}`
            }

            if (error.response) {
                const statusCode = error.response.status
                const statusText = error.response.statusText
                const errorData = error.response.data

                const errorMsg = `HTTP Error ${statusCode}: ${statusText}. ${errorData || ''}`.trim()
                return `Error: ${errorMsg}`
            }

            const errorMsg = `Scraping failed: ${error.message || 'Unknown error occurred'}`
            return `Error: ${errorMsg}`
        }
    }
}

class BrightDataWebScraper_Tools implements INode {
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
        this.label = 'Bright Data Web Scraper'
        this.name = 'brightDataWebScraper'
        this.version = 1.0
        this.type = 'BrightDataWebScraper'
        this.icon = 'brightdata-scraper.svg'
        this.category = 'Tools'
        this.description = 'Scrape web pages using Bright Data Web Unlocker with advanced bot detection bypass capabilities'
        this.baseClasses = [this.type, ...getBaseClasses(BrightDataWebScraperTool)]

        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['brightDataApi']
        }

        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                description: 'The URL of the webpage to scrape. Must start with http:// or https://',
                placeholder: 'https://example.com',
                optional: true
            },
            {
                label: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { label: 'Markdown', name: 'markdown' },
                    { label: 'HTML', name: 'html' }
                ],
                default: 'markdown',
                description: 'Format of the scraped content. Markdown is cleaned and structured, HTML preserves original formatting.',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Timeout (seconds)',
                name: 'timeoutS',
                type: 'number',
                description: 'Maximum time in seconds to wait for page to load. Recommended: 60-180 seconds.',
                placeholder: '60',
                default: 60,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Zone Name',
                name: 'zone',
                type: 'string',
                description: 'Bright Data zone name to use. Leave empty to use default zone.',
                placeholder: 'mcp_unlocker',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Custom description of what the tool does. This helps the LLM understand when to use this tool.',
                rows: 3,
                additionalParams: true,
                optional: true,
                placeholder:
                    'Scrapes web pages using Bright Data Web Unlocker with bot detection bypass. Returns content in markdown or HTML format.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiToken = getCredentialParam('brightDataApiToken', credentialData, nodeData)

        if (!apiToken) {
            throw new Error('Bright Data API token is required but not found in credentials')
        }

        const configuredUrl = nodeData.inputs?.url as string
        const outputFormat = (nodeData.inputs?.outputFormat as string) || 'markdown'
        const timeoutS = (nodeData.inputs?.timeoutS as number) || 60
        const zone = (nodeData.inputs?.zone as string) || 'mcp_unlocker'
        const customDescription = nodeData.inputs?.description as string

        const tool = new BrightDataWebScraperTool(apiToken, outputFormat, timeoutS * 1000, zone, configuredUrl)

        if (customDescription) {
            tool.description = customDescription
        }

        return tool
    }
}

module.exports = { nodeClass: BrightDataWebScraper_Tools }
