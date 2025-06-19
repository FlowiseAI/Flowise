import { INodeParams, INodeCredential } from '../src/Interface'

class BrightDataApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Bright Data API'
        this.name = 'brightDataApi'
        this.version = 1.0
        this.description = 'Bright Data API credentials for web scraping and data extraction'
        this.inputs = [
            {
                label: 'Bright Data API Token',
                name: 'brightDataApiToken',
                type: 'password',
                description: 'Your Bright Data API token from the user settings page'
            }
        ]
    }
}

module.exports = { credClass: BrightDataApiCredential }