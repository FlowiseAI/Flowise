import { INodeParams, INodeCredential } from '../src/Interface'

class PipedreamOAuthApiCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pipedream Connect'
        this.name = 'pipedreamOAuthApi'
        this.version = 1.0
        this.description =
            'Authenticate with Pipedream Connect <a target="_blank" href="https://pipedream.com/docs/connect/api-reference/authentication">Documentation here</a>'
        this.inputs = [
            {
                label: 'Client ID',
                name: 'clientId',
                type: 'string',
                placeholder: 'oa_xxxxxxx'
            },
            {
                label: 'Client Secret',
                name: 'clientSecret',
                type: 'password'
            },
            {
                label: 'Project ID',
                name: 'projectId',
                type: 'string',
                placeholder: 'proj_xxxxxxx'
            },
            {
                label: 'OAuth Scopes',
                name: 'oauthScopes',
                type: 'string',
                optional: true,
                placeholder: 'connect:*',
                description:
                    'Space-separated list of scopes (e.g., connect:* connect:actions:*). Omitting defaults to * (full access). <a target="_blank" href="https://pipedream.com/docs/connect/api-reference/authentication">Available scopes</a>'
            }
        ]
    }
}

module.exports = { credClass: PipedreamOAuthApiCredential }
