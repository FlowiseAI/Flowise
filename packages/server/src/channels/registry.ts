import { ChannelAdapter } from './types'
import { ChannelConfigurationError } from './errors'

export class ChannelAdapterRegistry {
    private readonly adapters = new Map<ChannelAdapter['provider'], ChannelAdapter>()

    register(adapter: ChannelAdapter): void {
        if (this.adapters.has(adapter.provider)) {
            throw new ChannelConfigurationError(`Channel adapter already registered for provider: ${adapter.provider}`)
        }
        this.adapters.set(adapter.provider, adapter)
    }

    get(provider: ChannelAdapter['provider']): ChannelAdapter | undefined {
        return this.adapters.get(provider)
    }

    has(provider: ChannelAdapter['provider']): boolean {
        return this.adapters.has(provider)
    }

    listProviders(): ChannelAdapter['provider'][] {
        return Array.from(this.adapters.keys())
    }
}

export const channelAdapterRegistry = new ChannelAdapterRegistry()
