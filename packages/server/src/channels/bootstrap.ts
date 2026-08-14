import { TelegramAdapter } from './adapters/telegram.adapter'
import { WhatsAppAdapter } from './adapters/whatsapp.adapter'
import { InstagramAdapter } from './adapters/instagram.adapter'
import { channelAdapterRegistry } from './registry'

let isInitialized = false

export const initializeChannelAdapters = (): void => {
    if (isInitialized) return

    if (!channelAdapterRegistry.has('telegram')) {
        channelAdapterRegistry.register(new TelegramAdapter())
    }
    if (!channelAdapterRegistry.has('whatsapp')) {
        channelAdapterRegistry.register(new WhatsAppAdapter())
    }
    if (!channelAdapterRegistry.has('instagram')) {
        channelAdapterRegistry.register(new InstagramAdapter())
    }

    isInitialized = true
}
