import { INodeParams, INodeCredential } from '../src/Interface'

class AtlassianOauth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]
    oauthStrategy: string

    constructor() {
        this.label = 'Atlassian OAuth'
        this.name = 'atlassianOAuth'
        this.version = 1.0
        this.description = 'Atlassian OAuth Credentials for JIRA and Confluence'
        this.oauthStrategy = 'atlassian'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'access_token',
                type: 'password',
                optional: false,
                disabled: true,
                placeholder: 'Will be populated after OAuth authentication'
            },
            {
                label: 'Refresh Token',
                name: 'refresh_token',
                type: 'password',
                optional: false,
                disabled: true,
                placeholder: 'Will be populated after OAuth authentication'
            },
            {
                label: 'Token Expiration Time',
                name: 'expiration_time',
                type: 'password',
                optional: false,
                disabled: true,
                placeholder: 'Will be populated after OAuth authentication'
            },
            {
                label: 'MCP Client ID',
                name: 'mcp_client_id',
                type: 'password',
                optional: true,
                disabled: true,
                placeholder: 'MCP client ID (for MCP OAuth)'
            },
            {
                label: 'MCP Client Secret',
                name: 'mcp_client_secret',
                type: 'password',
                optional: true,
                disabled: true,
                placeholder: 'MCP client secret (for MCP OAuth)'
            }
        ]
    }
}

module.exports = { credClass: AtlassianOauth }
