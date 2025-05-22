import { INodeParams, INodeCredential } from '../src/Interface'

class Oauth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google OAuth'
        this.name = 'googleOAuth'
        this.version = 1.0
        // this.description = 'Google OAuth Credentials'
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
                hidden: true,
                disabled: true
            },
            {
                label: 'Provider ID',
                name: 'providerId',
                type: 'string',
                optional: false,
                hidden: true,
                disabled: true
            },
            {
                label: 'Google Access Token',
                name: 'googleAccessToken',
                type: 'string',
                optional: false,
                hidden: true,
                disabled: true
            }
        ]
    }
}

module.exports = { credClass: Oauth }
