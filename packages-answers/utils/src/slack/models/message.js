import SlackObject from './slackObject';

class SlackMessage {
  constructor(slackApiClient, channel, message, parentMessage) {
    this.slackApiClient = slackApiClient;
    this.channel = channel;
    this.parentMessage = parentMessage;
    this.cache = {
      info: message
    };
  }

  async getInfo() {
    if (this.cache.info) {
      return this.cache.info;
    }

    const result = await this.slackApiClient.client.conversations.history({
      channel: this.channel,
      ts: this.ts
    });
    const message = result.messages.find((m) => m.ts === this.ts);

    if (!message) {
      throw new Error(`Message not found in channel ${this.channel}: ${this.ts}`);
    }

    this.cache.info = message;

    return this.cache.info;
  }

  async getTidiedInfo() {
    if (this.cache.tidiedInfo) {
      return this.cache.tidiedInfo;
    }

    const messageInfo = await this.getInfo();
    const tidiedInfo = {
      objectType: 'Slack Message',
      message: messageInfo.text,
      dateSent: SlackObject.convertTimestampToDate(messageInfo.ts),
      dateEdited: messageInfo.edited ? SlackObject.convertTimestampToDate(messageInfo.edited.ts) : null,
      user: await this.getUserName(messageInfo)
    };

    this.cache.tidiedInfo = tidiedInfo;

    return tidiedInfo;
  }

  async getReplies() {
    if (this.cache.replies) {
      return this.cache.replies;
    }

    const result = await this.slackApiClient.client.conversations.replies({
      channel: this.channel,
      ts: this.ts
    });
    const replies = result.messages.map((m) => new SlackMessage(this.slackApiClient, this.channel, m, this));
    this.cache.replies = replies;

    return this.cache.replies;
  }

  async getUserName(messageInfo) {
    if (messageInfo.bot_id) {
      return messageInfo.username || 'Unknown bot';
    }

    if (!messageInfo?.user) {
      return 'Unknown user';
    }

    const user = await this.slackApiClient.getUser(messageInfo?.user?.id);
    return user?.real_name_normalized || 'Unknown User';
  }

  static replaceUserMentions(message, slackApiClient) {
    return message.replace(/<@(U\w+)>/g, async (match, userId) => {
      const user = await slackApiClient.getUser(userId);
      return user.real_name_normalized;
    });
  }
}

export default SlackMessage;
