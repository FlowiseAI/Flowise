import { INodeParams, INodeCredential } from '../src/Interface'

class DiscordBotToken implements INodeCredential {
    label: string
    name: string
    description: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Discord Bot Token'
        this.name = 'discordBotToken'
        this.version = 1.0
        this.description = 'Discord Bot token used to authenticate API calls'

        this.inputs = [
            {
                label: 'Bot Token',
                name: 'botToken',
                type: 'password',
                description: 'Your Discord Bot Token'
            },
            {
                label: 'API Version',
                name: 'apiVersion',
                type: 'options',
                options: [
                    { label: 'v9', name: 'v9' },
                    { label: 'v10', name: 'v10' }
                ],
                description: 'Discord API version (v9 or v10)'
            }
        ]
    }
}

module.exports = { credClass: DiscordBotToken }
