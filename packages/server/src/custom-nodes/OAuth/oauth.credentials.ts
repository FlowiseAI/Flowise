// Rename to: OAuthHandler.credential.ts to match the pattern
import { INodeParams, INodeCredential } from 'flowise-components'

class OAuthCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OAuth Credentials'
        this.name = 'oauthCredential'
        this.version = 1.0
        this.description = 'OAuth credentials configuration'
        this.inputs = [
            {
                label: 'Client ID',
                name: 'clientId',
                type: 'string'
            },
            {
                label: 'Client Secret',
                name: 'clientSecret',
                type: 'password'
            },
            {
                label: 'Redirect URI',
                name: 'redirectUri',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: OAuthCredential }
