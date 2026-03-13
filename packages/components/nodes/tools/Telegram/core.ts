import { Tool } from '@langchain/core/tools'
import TelegramBot from 'node-telegram-bot-api'

export class TelegramSender extends Tool {
    name = 'telegramSender'
    description = 'Send text message to a Telegram chat using a bot token and chat ID.'

    constructor(
        private token: string,
        private chatId: string
    ) {
        super()
    }

    async _call(message: string): Promise<string> {
        try {
            const bot = new TelegramBot(this.token);
            try{
                const MSG = JSON.parse(message)
                await bot.sendMessage(this.chatId, MSG.message)
            }catch{
                await bot.sendMessage(this.chatId, message)
            }
            return '✅ Message sent to Telegram.'
        } catch (error: any) {
            return `❌ Failed to send message: ${error.message}`
        }
    }
}
