import { INodeParams, INodeCredential } from '../src/Interface'

class ScrapeUnblockerApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'ScrapeUnblocker API'
        this.name = 'scrapeUnblockerApi'
        this.version = 1.0
        this.description =
            'Get your API key from the <a target="_blank" href="https://www.scrapeunblocker.com">ScrapeUnblocker</a> dashboard.'
        this.inputs = [
            {
                label: 'ScrapeUnblocker API Key',
                name: 'scrapeUnblockerApiKey',
                type: 'password'
            },
            {
                label: 'ScrapeUnblocker API URL',
                name: 'scrapeUnblockerApiUrl',
                type: 'string',
                default: 'https://api.scrapeunblocker.com'
            }
        ]
    }
}

module.exports = { credClass: ScrapeUnblockerApiCredential }
