import { ChannelService } from './channel.service'
import { initializeChannelAdapters } from './bootstrap'
import { FlowiseChannelRuntime } from './runtime'

initializeChannelAdapters()

export const channelService = new ChannelService(new FlowiseChannelRuntime())
