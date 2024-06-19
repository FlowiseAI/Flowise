import { INodeParams, INodeCredential } from '../src/Interface'

class FireCrawlApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'FireCrawl API'
        this.name = 'fireCrawlApi'
        this.version = 1.0
        this.description =
            'You can find the FireCrawl API token on your <a target="_blank" href="https://www.firecrawl.dev/">FireCrawl account</a> page.'
        this.inputs = [
            {
                label: 'FireCrawl API',
                name: 'firecrawlApiToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: FireCrawlApiCredential }
