import { INodeParams, INodeCredential } from '../src/Interface'

class ChannelTelegramCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Channel Telegram'
        this.name = 'channelTelegram'
        this.version = 1.0
        this.description = 'Credential for Telegram channel account integration'
        this.inputs = [
            {
                label: 'Bot Token',
                name: 'botToken',
                type: 'password'
            },
            {
                label: 'Webhook Secret',
                name: 'webhookSecret',
                type: 'password',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: ChannelTelegramCredential }
