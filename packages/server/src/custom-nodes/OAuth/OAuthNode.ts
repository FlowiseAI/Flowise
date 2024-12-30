import { INode, INodeParams } from 'flowise-components'
import { INodeData } from '../../Interface'

class OAuthNode implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: { credentialNames: string[] }
    inputs: INodeParams[]

    constructor() {
        this.label = 'OAuth Handler'
        this.name = 'oauthHandler'
        this.version = 1.0
        this.type = 'OAuth'
        this.icon = 'oauth.svg'
        this.category = 'Authentication'
        this.description = 'Handle OAuth2 authentication flow'
        this.baseClasses = ['OAuth']
        this.credential = {
            credentialNames: ['oauthCredential']
        }
        this.inputs = [
            {
                label: 'Provider',
                name: 'provider',
                type: 'options',
                options: [
                    { label: 'Google', name: 'google' },
                    { label: 'GitHub', name: 'github' }
                ]
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'string',
                description: 'Space-separated list of scopes',
                placeholder: 'https://www.googleapis.com/auth/drive.file'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        // OAuth implementation
        const provider = nodeData.inputs?.provider as string
        const scope = nodeData.inputs?.scope as string

        // Your OAuth logic here
        return {
            provider,
            scope,
            authUrl: this.generateAuthUrl(provider, scope)
        }
    }

    private generateAuthUrl(provider: string, scope: string): string {
        // Implement OAuth URL generation based on provider
        switch (provider) {
            case 'google':
                return `https://accounts.google.com/o/oauth2/v2/auth?scope=${scope}&response_type=code...`
            case 'github':
                return `https://github.com/login/oauth/authorize?scope=${scope}...`
            default:
                throw new Error(`Unsupported provider: ${provider}`)
        }
    }
}

module.exports = { nodeClass: OAuthNode }
