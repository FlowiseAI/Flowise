import AnswerSession from '../utilities/answerSession'
import SlackClient from './client'
import SlackMessage from './models/message'
import SlackChannel from './models/channel'

const answerSession = new AnswerSession({ namespace: 'slack' })

answerSession.initPinecone({
    namespace: process.env.PINECONE_INDEX_NAMESPACE,
    indexName: 'adam-test-jira-2023-02-08-01'
})

export const indexSingleSlackChannel = async (channelId) => {
    const slackClient = new SlackClient({ accessToken: process.env.SLACK_TOKEN })
    console.time('indexSingleSlackChannel')
    // console.log(slackClient.cache.channels);
    const channel = await slackClient.getChannel(channelId)

    //   const channelInfo = await channel.getInfo();
    let messages = await channel.getMessages()

    //   let promises = [];
    //   for (const message of messages) {
    //     promises.push(new SlackMessage(message));
    //   }

    //   const data = await Promise.all(promises);

    messages.map(async (m) => {
        const tidiedInfo = await m.getTidiedInfo()
        return tidiedInfo
    })

    //   const vectorData = await answerSession.prepareAllForEmbedding(data);
    // answerSession.addVectors(vectorData);
    //   await answerSession.pinecone.writeVectorsToIndex(vectorData);
    console.timeEnd('indexSingleSlackChannel')
}

export const syncSlack = async () => {
    try {
        // Example Slack channel data structure:
        // { id: 'C1234567890', name: 'general' }
        // { id: 'C1234567891', name: 'random' }
        // { id: 'C1234567892', name: 'announcements' }
        // { id: 'C1234567893', name: 'help' }
        // { id: 'C1234567894', name: 'project-updates' }
        // { id: 'C1234567895', name: 'team-meetings' }
        // { id: 'C1234567896', name: 'development' }
        // { id: 'C1234567897', name: 'design' }
        // { id: 'C1234567898', name: 'marketing' }
        // { id: 'C1234567899', name: 'support' }
        await slackClient.initDataLookups()

        for (const channel of Object.values(slackClient.cache.channels)) {
            try {
                if (!channel.cache.info.is_member) {
                    // console.error(
                    //   `Error indexing Slack messages for channel ${channel.cache.info.name}: Not a member of channel`
                    // );
                } else {
                    console.time(channel.cache.info.name)
                    await indexSingleSlackChannel(channel.id)
                    console.timeEnd(channel.cache.info.name)
                }
            } catch (error) {
                console.error(`Error indexing Slack messages for channel ${channel.cache.info.name}: ${error}`)

                break // Stop the loop if there is an error
            }
        }
    } catch (error) {
        console.error(`Error: ${error?.response?.data?.message} (${error})`)
    }
}
