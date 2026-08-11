import { INodeParams, INodeCredential } from '../src/Interface'

class ScavioApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Scavio API'
        this.name = 'scavioApi'
        this.version = 1.0
        this.description =
            'Scavio is a real-time search API for AI agents covering search, retail, real estate, travel, jobs, app stores, company filings, software reviews, ad libraries and social. Sign up for a free API key with 50 credits at https://dashboard.scavio.dev/sign-up'
        this.inputs = [
            {
                label: 'Scavio API Key',
                name: 'scavioApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ScavioApi }
