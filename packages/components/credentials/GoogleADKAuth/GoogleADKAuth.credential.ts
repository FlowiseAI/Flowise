import { INodeParams, INodeCredential } from '../../../src/Interface'

class GoogleADKAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google ADK API'
        this.name = 'googleADKApi'
        this.version = 1.0
        this.description = 'Authentication for the Google AI Development Kit API'
        this.inputs = [
            {
                label: 'Google ADK API Key',
                name: 'googleADKApiKey',
                type: 'password',
                description: 'Your Google ADK API Key from Google AI Studio',
                default: '',
                required: true
            },
            {
                label: 'Project ID',
                name: 'projectId',
                type: 'string',
                description: 'Your Google Cloud Project ID',
                default: '',
                required: false
            }
        ]
    }
}

module.exports = { credClass: GoogleADKAuth }