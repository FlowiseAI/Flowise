import { INodeParams, INodeCredential } from '../src/Interface'

class JungleGridApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Jungle Grid API'
        this.name = 'jungleGridApi'
        this.version = 1.0
        this.description =
            'Use a Jungle Grid API key to estimate, submit, monitor, cancel, and retrieve artifacts for long-running workloads.'
        this.inputs = [
            {
                label: 'Jungle Grid API Key',
                name: 'apiKey',
                type: 'password'
            },
            {
                label: 'Jungle Grid API Base URL',
                name: 'baseUrl',
                type: 'url',
                default: 'https://api.junglegrid.dev',
                description: 'Override only for development or self-hosted Jungle Grid orchestrators.'
            }
        ]
    }
}

module.exports = { credClass: JungleGridApiCredential }
