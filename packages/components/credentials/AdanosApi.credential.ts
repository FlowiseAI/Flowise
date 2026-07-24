import { INodeCredential, INodeParams } from '../src/Interface'

class AdanosApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Adanos API'
        this.name = 'adanosApi'
        this.version = 1.0
        this.description =
            'Create an API key on the <a target="_blank" href="https://adanos.org/register">Adanos registration page</a>. Requests use your Adanos account and plan limits.'
        this.inputs = [
            {
                label: 'Adanos API Key',
                name: 'adanosApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AdanosApi }
