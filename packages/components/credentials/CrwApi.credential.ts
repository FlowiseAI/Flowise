import { INodeParams, INodeCredential } from '../src/Interface'

class CrwApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'fastCRW API'
        this.name = 'crwApi'
        this.version = 1.0
        this.description =
            'You can find the fastCRW API token on your <a target="_blank" href="https://fastcrw.com/">fastCRW account</a> page. Leave the token empty when self-hosting without auth.'
        this.inputs = [
            {
                label: 'fastCRW API',
                name: 'crwApiToken',
                type: 'password',
                optional: true
            },
            {
                label: 'fastCRW API URL',
                name: 'crwApiUrl',
                type: 'string',
                default: 'https://fastcrw.com/api'
            }
        ]
    }
}

module.exports = { credClass: CrwApiCredential }
