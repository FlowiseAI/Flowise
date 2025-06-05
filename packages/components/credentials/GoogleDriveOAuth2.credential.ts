import { INodeParams, INodeCredential } from '../src/Interface'
const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.photos.readonly'
]

class GoogleDriveOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Google Drive OAuth2'
        this.name = 'googleDriveOAuth2'
        this.version = 1.0
        this.description =
            'You can find the setup instructions <a target="_blank" href="https://docs.flowiseai.com/integrations/langchain/tools/google-drive">here</a>'
        this.inputs = [
            {
                label: 'Authorization URL',
                name: 'authorizationUrl',
                type: 'string',
                default: 'https://accounts.google.com/o/oauth2/v2/auth'
            },
            {
                label: 'Access Token URL',
                name: 'accessTokenUrl',
                type: 'string',
                default: 'https://oauth2.googleapis.com/token'
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
                default: 'access_type=offline&prompt=consent',
                hidden: true
            },
            {
                label: 'Scope',
                name: 'scope',
                type: 'string',
                hidden: true,
                default: scopes.join(' ')
            }
        ]
    }
}

module.exports = { credClass: GoogleDriveOAuth2 }
