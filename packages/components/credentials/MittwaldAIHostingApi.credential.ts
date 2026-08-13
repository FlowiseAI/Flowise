import { INodeParams, INodeCredential } from '../src/Interface'

class MittwaldAIHostingApiAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'mittwald AI Hosting API Key'
        this.name = 'mittwaldAIHostingApi'
        this.version = 1.0
        this.description = 'Create an API key for AI Hosting in mStudio'
        this.inputs = [
            {
                label: 'mittwald API Key',
                name: 'mittwaldApiKey',
                type: 'password',
                description: 'Create your API key in mStudio under AI Hosting (starts with sk-)'
            }
        ]
    }
}

module.exports = { credClass: MittwaldAIHostingApiAuth }
