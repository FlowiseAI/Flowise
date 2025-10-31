import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, stripHTMLFromToolInput } from '../../../src/utils'
import fetch from 'node-fetch'

interface BrightDataConfig {
    apiKey: string
    zone: string
}

class BrightDataUnlockerTool extends Tool {
    name = 'bright_data_unlocker'
    description =
        'Scrapes the web using BrightData Unlocker API. Input a URL or a Query and recieve the contents of the page / result page in markdown format.'

    private apiKey: string
    private zone: string

    constructor(config: BrightDataConfig) {
        super()
        this.apiKey = config.apiKey
        this.zone = config.zone
    }

    private isUrl(input: string): boolean {
        try {
            new URL(input)
            return true
        } catch {
            return input.includes('.') && (input.startsWith('www.') || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input))
        }
    }

    private constructGoogleSearchUrl(query: string): string {
        const formattedQuery = query.trim().replace(/\s+/g, '+')
        const encodedQuery = encodeURIComponent(formattedQuery).replace(/%2B/g, '+')
        return `https://www.google.com/search?q=${encodedQuery}`
    }

    async _call(input: string): Promise<string> {
        try {
            const cleanInput = stripHTMLFromToolInput(input.trim())

            let targetUrl: string
            if (this.isUrl(cleanInput)) {
                targetUrl = cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`
            } else {
                targetUrl = this.constructGoogleSearchUrl(cleanInput)
            }

            const payload = {
                zone: this.zone,
                url: targetUrl,
                format: 'json',
                method: 'GET',
                country: 'us',
                data_format: 'markdown'
            }

            const response = await fetch('https://api.brightdata.com/request', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                let errorText = ''
                try {
                    errorText = await response.text()
                } catch (e) {
                    errorText = 'Unable to read error response'
                }
                throw new Error(`BrightData API Error: ${response.status} ${response.statusText}. Response: ${errorText}`)
            }

            const data = await response.json()

            if (typeof data === 'string') {
                return data
            } else if (data.content) {
                return data.content
            } else if (data.data) {
                return typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2)
            } else {
                return JSON.stringify(data, null, 2)
            }
        } catch (error) {
            throw new Error(`Failed to scrape URL with BrightData: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

class BrightDataAPI_Tools implements INode {
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
        this.label = 'BrightData Unlocker'
        this.name = 'brightDataUnlocker'
        this.version = 1.0
        this.type = 'BrightDataUnlocker'
        this.icon = 'bright.svg'
        this.category = 'Tools'
        this.description = 'Search the web and unlock any website.'
        this.inputs = [
            {
                label: 'URL or Search Query',
                name: 'brightDataUrl',
                type: 'string',
                acceptVariable: true,
                description: 'Enter a webpage URL to scrape directly, or a search query to search Google and scrape results'
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['brightDataApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(BrightDataUnlockerTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<BrightDataUnlockerTool> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('brightDataApiKey', credentialData, nodeData)
        const zone = getCredentialParam('brightDataZone', credentialData, nodeData) || 'web_unlocker1'

        if (!apiKey) {
            throw new Error('BrightData API Key is required')
        }

        if (typeof apiKey !== 'string' || apiKey.length < 20) {
            throw new Error('BrightData API Key appears to be invalid - should be a long hexadecimal string')
        }

        return new BrightDataUnlockerTool({
            apiKey,
            zone
        })
    }
}

module.exports = { nodeClass: BrightDataAPI_Tools }
