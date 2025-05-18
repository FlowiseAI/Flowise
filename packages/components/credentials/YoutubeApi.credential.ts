import { INodeParams, INodeCredential } from '../src/Interface'

class YoutubeApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Youtube API'
        this.name = 'youtubeApi'
        this.version = 1.0
        this.description = 'Provide your Youtube API key'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                placeholder: '<YOUTUBE_API_KEY>'
            }
        ]
    }
}

module.exports = { credClass: YoutubeApi }
