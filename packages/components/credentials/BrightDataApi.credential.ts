import { INodeParams, INodeCredential } from '../src/Interface'

class BrightDataApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'BrightData API'
        this.name = 'brightDataApi'
        this.version = 1.0
        this.description = 'Go to https://brightdata.com/, navigate to settings, and create an API key or copy your existing one.'
        this.inputs = [
            {
                label: 'BrightData API Key',
                name: 'brightDataApiKey',
                type: 'password',
                placeholder: '<BRIGHTDATA_API_KEY>',
                description: 'Your BrightData API key (Bearer token)'
            },
            {
                label: 'Zone',
                name: 'brightDataZone',
                type: 'string',
                default: 'web_unlocker1',
                placeholder: 'web_unlocker1',
                description: 'Proxy Zone - Place your unlocker zone name here',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: BrightDataApi }
