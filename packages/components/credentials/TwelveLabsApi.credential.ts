import { INodeParams, INodeCredential } from '../src/Interface'

class TwelveLabsApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'TwelveLabs API'
        this.name = 'twelveLabsApi'
        this.version = 1.0
        this.description =
            'Get your API key from the <a target="_blank" href="https://playground.twelvelabs.io/dashboard/api-key">TwelveLabs Dashboard</a>. There is a generous free tier.'
        this.inputs = [
            {
                label: 'TwelveLabs Api Key',
                name: 'twelveLabsApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TwelveLabsApi }
