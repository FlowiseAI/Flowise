import SlackMessage from './message';

class SlackChannel {
  constructor(slackApiClient, channel) {
    this.slackApiClient = slackApiClient;
    this.channelId = channel.id;
    this.cache = {
      info: channel,
      messages: []
    };
  }

  async getInfo() {
    if (this.cache.info) {
      return this.cache.info;
    }

    const result = await this.slackApiClient.conversations.info({
      channel: this.channelId
    });
    this.cache.info = result.channel;

    return this.cache.info;
  }

  async getMessages() {
    if (this.cache?.messages?.length) {
      return this.cache.messages;
    }

    const messages = [];

    let cursor;
    do {
      const result = await this.slackApiClient.conversations.history({
        channel: this.channelId,
        cursor
      });

      for (const message of result.messages) {
        const slackMessage = new SlackMessage(this.slackApiClient, this.channelId, message);
        messages.push(slackMessage);

        if (slackMessage?.mentionedUserIds?.length) {
          // Replace user IDs with user objects in cache
          for (const userId of slackMessage.mentionedUserIds) {
            const user = await this.slackApiClient.getUser(userId);
            slackMessage.text = slackMessage.text.replace(`<@${userId}>`, `@${user.realName}`);
          }
        }
      }
      cursor = result.response_metadata.next_cursor;
    } while (cursor);

    this.cache.messages = messages;
    return messages;
  }
}

export default SlackChannel;
