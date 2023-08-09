import { INodeParams, INodeCredential } from '../src/Interface'

class ApifyApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Apify API'
        this.name = 'apifyApi'
        this.version = 1.0
        this.description =
            'You can find the Apify API token on your <a target="_blank" href="https://console.apify.com/account#/integrations">Apify account</a> page.'
        this.inputs = [
            {
                label: 'Apify API',
                name: 'apifyApiToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ApifyApiCredential }
