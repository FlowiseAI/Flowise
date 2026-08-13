import { INodeParams, INodeCredential } from '../src/Interface'

class EmpirioLabsApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'EmpirioLabs AI API'
        this.name = 'empirioLabsApi'
        this.version = 1.0
        this.description =
            'Create an API key from your <a target="_blank" href="https://platform.empiriolabs.ai/dashboard/api-keys">EmpirioLabs dashboard</a>.'
        this.inputs = [
            {
                label: 'EmpirioLabs AI API Key',
                name: 'empirioLabsApiKey',
                type: 'password',
                description: 'Get your API key from https://platform.empiriolabs.ai/dashboard/api-keys'
            }
        ]
    }
}

module.exports = { credClass: EmpirioLabsApi }
