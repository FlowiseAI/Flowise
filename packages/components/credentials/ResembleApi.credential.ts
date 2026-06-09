import { INodeParams, INodeCredential } from '../src/Interface'

class ResembleApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Resemble API'
        this.name = 'resembleApi'
        this.version = 1.0
        this.description = 'Resemble AI Detect + Intelligence API key (dashboard → Account → API).'
        this.inputs = [
            {
                label: 'Resemble API Key',
                name: 'resembleApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ResembleApi }
