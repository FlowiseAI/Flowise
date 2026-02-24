import { INodeParams, INodeCredential } from '../src/Interface'

class ChannelInstagramCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Channel Instagram'
        this.name = 'channelInstagram'
        this.version = 1.0
        this.description = 'Credential for Instagram channel integration'
        this.inputs = [
            {
                label: 'App ID',
                name: 'appId',
                type: 'string',
                optional: true
            },
            {
                label: 'Instagram User ID',
                name: 'instagramUserId',
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

module.exports = { credClass: ChannelInstagramCredential }
