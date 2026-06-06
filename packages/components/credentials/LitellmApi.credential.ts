import { INodeParams, INodeCredential } from '../src/Interface'

class LitellmApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Litellm API'
        this.name = 'litellmApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'API Key',
                name: 'litellmApiKey',
                type: 'password'
            },
            {
                label: 'Team Name',
                name: 'litellmTeamName',
                type: 'string',
                optional: true,
                placeholder: 'e.g. Activation'
            },
            {
                label: 'User Name',
                name: 'litellmUserName',
                type: 'string',
                optional: true,
                placeholder: 'e.g. user@company.com'
            }
        ]
    }
}

module.exports = { credClass: LitellmApi }
