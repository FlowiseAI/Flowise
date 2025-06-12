import { INode, INodeParams, INodeData, ICommonObject } from '../../../src/Interface'
import DiscordMessageSend from './messages/Send'
import DiscordMessageRetrieve from './messages/Retrieve'

/**
 * Discord Agent Flow Node
 * This node allows sending messages to a Discord channel using a bot token.
 * It supports both retrieving messages and sending messages.
 */
export class Discord_Agentflow implements INode {
    label = 'Discord'
    name = 'discord'
    version = 1.0
    icon = 'discord.svg'
    type = 'utility'
    category = 'Agent Flows'
    description = 'Send and retrieve messages to a Discord channel using your bot token'
    color = '#7289DA'
    baseClasses = [this.type]

    // Credential parameter
    credential: INodeParams = {
        label: 'Discord Bot Credential',
        name: 'credential',
        type: 'credential',
        credentialNames: ['discordBotToken'],
        optional: false
    }

    // Combine inputs from both receive and send nodes
    inputs: INodeParams[] = [
        {
            label: 'Channel ID',
            name: 'channelId',
            type: 'string',
            description: 'Discord channel'
        },

        {
            label: 'Mode',
            name: 'mode',
            type: 'options',
            options: [
                { label: 'Retrieve Messages', name: DiscordMessageRetrieve.mode },
                { label: 'Send Message', name: DiscordMessageSend.mode }
            ],
            default: 'retrieve',
            description: 'Select the operation to perform'
        },
        ...DiscordMessageRetrieve.inputs,
        ...DiscordMessageSend.inputs
    ]

    async run(nodeData: INodeData, runId: string, options: ICommonObject) {
        const mode = nodeData.inputs?.mode as string
        if (mode === DiscordMessageRetrieve.mode) {
            const retrieveMessages = new DiscordMessageRetrieve(this.name)
            return await retrieveMessages.run(nodeData, runId, options)
        } else if (mode === DiscordMessageSend.mode) {
            const sendMessage = new DiscordMessageSend(this.name)
            return await sendMessage.run(nodeData, runId, options)
        }
        throw new Error(`Unsupported mode: ${mode}.`)
    }
}

module.exports = { nodeClass: Discord_Agentflow }
