import { INode, INodeParams } from '../../src/Interface'

class GoogleOauth implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google OAuth'
        this.name = 'googleOauth'
        this.version = 1.0
        this.type = 'GoogleOauth'
        this.icon = 'google.svg'
        this.category = 'Oauth'
        // this.description = 'Authenticate with Google OAuth'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Google OAuth Settings',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleOAuth']
        }
        this.inputs = [
            {
                label: 'Full Name',
                name: 'fullName',
                type: 'string',
                optional: false,
                disabled: true
            },
            {
                label: 'Email',
                name: 'email',
                type: 'string',
                optional: false,
                disabled: true
            },
            {
                label: 'Provider',
                name: 'provider',
                type: 'string',
                optional: false,
                disabled: true
            },
            {
                label: 'Provider ID',
                name: 'providerId',
                type: 'string',
                optional: false,
                disabled: true
            },
            {
                label: 'Google Access Token',
                name: 'googleAccessToken',
                type: 'string',
                optional: false,
                disabled: true
            }
        ]
    }
}

module.exports = { nodeClass: GoogleOauth }
