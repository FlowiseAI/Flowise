import { INodeParams, INodeCredential } from '../src/Interface'

class BrowserlessApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Browserless API'
        this.name = 'browserlessApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.browserless.io/mcp/browserless-mcp-server">official guide</a> on how to get your API token from the Browserless dashboard'
        this.inputs = [
            {
                label: 'API Token',
                name: 'browserlessApiToken',
                type: 'password',
                placeholder: '<BROWSERLESS_API_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: BrowserlessApi }
