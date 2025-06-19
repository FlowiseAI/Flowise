import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'
import axios from 'axios'

class BrightDataWebScraperTool extends Tool {
    name = 'brightdata_web_scraper'
    description = 'Scrapes web pages using Bright Data Web Unlocker with bot detection bypass. Returns content in markdown or HTML format. Input should be a single URL string.'

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
            'authorization': `Bearer ${this.apiToken}`,
            'user-agent': 'flowise-brightdata/1.0.0',
            'Content-Type': 'application/json'
        }
    }

    async _call(input: string): Promise<string> {
        try {
            console.log('[BrightData] Tool called with input:', input)
            
            // Determine URL: use configured URL if available, otherwise use input
            const urlToScrape = this.configuredUrl || input.trim()
            
            if (!urlToScrape) {
                const errorMsg = 'No URL provided. Please specify a URL either in the tool configuration or as input.'
                console.error('[BrightData] Error:', errorMsg)
                return `Error: ${errorMsg}` // Return plain string, NOT JSON
            }

            // Validate URL format
            try {
                new URL(urlToScrape)
                if (!urlToScrape.startsWith('http')) {
                    throw new Error('Invalid protocol')
                }
            } catch (e) {
                const errorMsg = 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
                console.error('[BrightData] Error:', errorMsg)
                return `Error: ${errorMsg}` // Return plain string, NOT JSON
            }

            console.log(`[BrightData] Scraping URL: ${urlToScrape} in ${this.outputFormat} format`)

            // Determine data format based on output format
            const requestData: any = {
                url: urlToScrape,
                zone: this.zone,
                format: 'raw'
            }

            // Add data_format for markdown
            if (this.outputFormat === 'markdown') {
                requestData.data_format = 'markdown'
            }

            console.log('[BrightData] Request data:', requestData)

            // Make request to Bright Data API (based on server.js scrape_as_markdown/scrape_as_html)
            const response = await axios({
                url: 'https://api.brightdata.com/request',
                method: 'POST',
                data: requestData,
                headers: this.getApiHeaders(),
                responseType: 'text',
                timeout: this.timeoutMs
            })

            console.log(`[BrightData] Response status: ${response.status}`)
            console.log(`[BrightData] Response length: ${response.data?.length || 0} characters`)

            // Return the scraped content as plain string
            if (response.data && typeof response.data === 'string') {
                // If the response is very long, truncate for logging but return full content
                const preview = response.data.length > 200 ? response.data.substring(0, 200) + '...' : response.data
                console.log(`[BrightData] Success! Content preview: ${preview}`)
                return response.data // Return the actual scraped content
            } else if (response.data) {
                // If response.data is not a string, convert it
                console.log('[BrightData] Non-string response, converting...')
                return String(response.data)
            } else {
                const errorMsg = 'No content received from the webpage.'
                console.error('[BrightData] Error:', errorMsg)
                return `Error: ${errorMsg}` // Return plain string, NOT JSON
            }

        } catch (error: any) {
            console.error('[BrightData] Exception occurred:', error)
            
            // Handle different types of errors - Return plain strings, NOT JSON
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                const errorMsg = `Request timeout after ${this.timeoutMs / 1000} seconds. The webpage took too long to load.`
                console.error('[BrightData] Timeout error:', errorMsg)
                return `Error: ${errorMsg}`
            }
            
            if (error.response) {
                const statusCode = error.response.status
                const statusText = error.response.statusText
                const errorData = error.response.data
                
                const errorMsg = `HTTP Error ${statusCode}: ${statusText}. ${errorData || ''}`.trim()
                console.error('[BrightData] HTTP error:', errorMsg)
                return `Error: ${errorMsg}`
            }

            const errorMsg = `Scraping failed: ${error.message || 'Unknown error occurred'}`
            console.error('[BrightData] General error:', errorMsg)
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
        
        // Credential configuration - Use our custom Bright Data credential
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['brightDataApi']
        }
        
        // Input parameters (following TavilyAPI and WebScraperTool patterns)
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
                placeholder: 'Scrapes web pages using Bright Data Web Unlocker with bot detection bypass. Returns content in markdown or HTML format.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        try {
            console.log('[BrightData] Initializing Web Scraper tool...')
            
            // Get credentials - Use our custom Bright Data credential
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiToken = getCredentialParam('brightDataApiToken', credentialData, nodeData)
            
            if (!apiToken) {
                throw new Error('Bright Data API token is required but not found in credentials')
            }

            console.log('[BrightData] API token found, length:', apiToken.length)
            
            // Get input parameters
            const configuredUrl = nodeData.inputs?.url as string
            const outputFormat = nodeData.inputs?.outputFormat as string || 'markdown'
            const timeoutS = nodeData.inputs?.timeoutS as number || 60
            const zone = nodeData.inputs?.zone as string || 'mcp_unlocker'
            const customDescription = nodeData.inputs?.description as string

            console.log('[BrightData] Configuration:', {
                configuredUrl,
                outputFormat,
                timeoutS,
                zone,
                hasCustomDescription: !!customDescription
            })

            // Create tool instance
            const tool = new BrightDataWebScraperTool(
                apiToken,
                outputFormat,
                timeoutS * 1000, // Convert to milliseconds
                zone,
                configuredUrl
            )

            // Override description if provided
            if (customDescription) {
                tool.description = customDescription
            }

            console.log('[BrightData] Tool initialized successfully')
            return tool
            
        } catch (error) {
            console.error('[BrightData] Initialization error:', error)
            throw error
        }
    }
}

module.exports = { nodeClass: BrightDataWebScraper_Tools }