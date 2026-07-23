import { INodeParams, INodeCredential } from '../src/Interface'

class ChannelWhatsAppCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Channel WhatsApp'
        this.name = 'channelWhatsApp'
        this.version = 1.0
        this.description = 'Credential for WhatsApp Business channel integration'
        this.inputs = [
            {
                label: 'App ID',
                name: 'appId',
                type: 'string',
                optional: true
            },
            {
                label: 'WABA ID',
                name: 'wabaId',
                type: 'string',
                optional: true
            },
            {
                label: 'Phone Number ID',
                name: 'phoneNumberId',
                type: 'string'
            },
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password'
            },
            {
                label: 'App Secret',
                name: 'appSecret',
                type: 'password'
            },
            {
                label: 'Verify Token',
                name: 'verifyToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ChannelWhatsAppCredential }
