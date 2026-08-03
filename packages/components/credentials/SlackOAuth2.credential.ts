import { INodeParams, INodeCredential } from '../src/Interface'

const scopes = [
    'search:read.public',
    'search:read.private',
    'search:read.mpim',
    'search:read.im',
    'search:read.files',
    'search:read.users',
    'groups:history',
    'mpim:history',
    'im:history',
    'channels:history',
    'chat:write',
    'canvases:read',
    'canvases:write',
    'users:read',
    'users:read.email'
]

class SlackOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Slack User Token OAuth2'
        this.name = 'slackOAuth2'
        this.version = 1.0
        this.description =
            'You can find the setup instructions <a target="_blank" href="https://docs.flowiseai.com/integrations/langchain/tools/slack-mcp-user-guide">here</a>'
        this.inputs = [
            {
                label: 'Authorization URL',
                name: 'authorizationUrl',
                type: 'string',
                default: 'https://slack.com/oauth/v2_user/authorize'
            },
            {
                label: 'Access Token URL',
                name: 'accessTokenUrl',
                type: 'string',
                default: 'https://slack.com/api/oauth.v2.user.access'
            },
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
                label: 'Additional Parameters',
                name: 'additionalParameters',
                type: 'string',
                default: '',
                hidden: true
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'string',
                description:
                    'Space-separated list of scopes. Refer to <a target="_blank" href="https://docs.slack.dev/ai/slack-mcp-server/developing#add-scopes">official guide</a> for more details.',
                optional: true,
                default: scopes.join(' ')
            }
        ]
    }
}

module.exports = { credClass: SlackOAuth2 }
