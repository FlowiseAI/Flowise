import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleVisionApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Cloud Vision API'
        this.name = 'googleVisionApi'
        this.version = 1.0
        this.description =
            'Refer to the <a target="_blank" href="https://cloud.google.com/vision/docs/setup">official guide</a> on how to get your Google Cloud Vision API key. You can create credentials in the <a target="_blank" href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a>.'
        this.inputs = [
            {
                label: 'API Key',
                name: 'googleApiKey',
                type: 'password',
                description: 'Your Google Cloud Vision API key. Get it from <a target="_blank" href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a>'
            }
        ]
    }
}

module.exports = { credClass: GoogleVisionApi }

