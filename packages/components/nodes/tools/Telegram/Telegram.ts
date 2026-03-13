import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { TelegramSender } from './core'

class TelegramBot_Tools implements INode {
    label = 'Telegram Bot'
    name = 'telegramSender'
    version = 1.0
    type = 'Tool'
    icon = 'telegram.svg'
    category = 'Tools'
    author = 'AliAkrami13751@gmail.com'
    description = 'Send incoming text to Telegram'

    baseClasses = [this.type, ...getBaseClasses(TelegramSender)]

    inputs: INodeParams[] = [
        {
            label: 'Bot Token',
            name: 'botToken',
            type: 'string',
            placeholder: 'e.g. 123456789:ABC-DEF...'
        },
        {
            label: 'Chat ID',
            name: 'chatId',
            type: 'string',
            placeholder: 'e.g. 123456789'
        }
    ]

    async init(nodeData: INodeData): Promise<any> {
        const token = nodeData.inputs?.botToken as string
        const chatId = nodeData.inputs?.chatId as string

        return new TelegramSender(token, chatId)
    }
}

module.exports = { nodeClass: TelegramBot_Tools }
