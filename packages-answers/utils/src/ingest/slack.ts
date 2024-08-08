import PineconeClient from '../pinecone/client'

// import { slackIssueLoader } from '../syncSlack';

import chunkArray from '../utilities/chunkArray'
import { inngest } from './client'

import { EventVersionHandler } from './EventVersionHandler'
import { AppSettings, SlackChannel, SlackMessage } from 'types'

const SLACK_CHANNEL_BATCH_SIZE = 1
const SLACK_MESSAGE_EMBEDDING_BATCH = 1

const DISABLE_EMBEDDING = true

import SlackMessageModel from '../slack/models/message'
import { prepareAllForEmbedding } from '../prepareAllForEmbedding'
// import SlackClient from '../slack/client';
import { getUserClients } from '../auth/getUserClients'

// slackClient.initDataLookups();

export const processSlackUpdated: EventVersionHandler<{ appSettings: AppSettings }> = {
    event: 'slack/app.sync',
    v: '1',
    handler: async ({ event }) => {
        const { user } = event
        if (!user) throw new Error('No user')
        const { slackClient } = await getUserClients(user)
        const { appSettings } = event.data
        const selectedChannels = appSettings?.slack?.channels?.filter((p) => p.enabled)?.map((p) => p.id)
        const channels: SlackChannel[] = Object.values(slackClient.cache.channels)

        await Promise.all(
            chunkArray(
                channels?.filter((channel) => selectedChannels?.includes(channel.id)),
                SLACK_CHANNEL_BATCH_SIZE
            ).map((batchChannels: SlackChannel[], i) => {
                const eventData = {
                    _batchSize: SLACK_CHANNEL_BATCH_SIZE,
                    _total: channels.length,
                    _page: i,
                    channels: batchChannels?.map(({ id, name }) => ({ id, name }))
                }

                inngest.send({
                    v: '1',
                    ts: new Date().valueOf(),
                    name: 'slack/channel.sync',
                    data: eventData,
                    user: event.user
                })
            })
        )
    }
}

export const procesChannelUpdated: EventVersionHandler<{
    channels: { id: string; name: string }[]
}> = {
    event: 'slack/channel.sync',
    v: '1',
    handler: async ({ event }) => {
        const { channels } = event.data
        const { user } = event
        if (!user) throw new Error('No user')
        const { slackClient } = await getUserClients(user)
        const channelMessages = await Promise.all(
            channels?.map(async ({ id }) => {
                const channel = await slackClient.getChannel(id)
                if (!channel?.getMessages) {
                    return Promise.resolve([])
                }
                let messages: SlackMessage[] = await channel.getMessages()
                const allPromises = await Promise.all(messages.map((m) => new SlackMessageModel(m)))
                return allPromises
            })
        ).then((messages) => messages.flat())

        await Promise.all(
            chunkArray(channelMessages, SLACK_MESSAGE_EMBEDDING_BATCH).map((messages: SlackMessageModel[], i) => {
                const eventData = {
                    _page: i,
                    _total: channelMessages.length,
                    _batchSize: SLACK_MESSAGE_EMBEDDING_BATCH,
                    messages
                }

                return inngest.send({
                    v: '1',
                    ts: new Date().valueOf(),
                    name: 'slack/message.embeddings.upserted',
                    data: eventData,
                    user: event.user
                })
            })
        )
    }
}

export const processMessageEmbeddingsUpserted: EventVersionHandler<{
    messages: SlackMessageModel[]
}> = {
    event: 'slack/message.embeddings.upserted',
    v: '1',
    handler: async ({ event }) => {
        const { messages } = event.data
        const { user } = event

        const vectorData = await prepareAllForEmbedding(messages.map((m) => new SlackMessageModel(m.cache.info)))
        if (!DISABLE_EMBEDDING) await pinecone.writeVectorsToIndex(vectorData, user?.organizationId!)
    }
}

const pinecone = new PineconeClient({
    namespace: process.env.PINECONE_INDEX_NAMESPACE,
    indexName: process.env.PINECONE_INDEX
})
