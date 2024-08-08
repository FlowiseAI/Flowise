import SlackObject from './slackObject';

class SlackUser {
  constructor(slackApiClient, userId) {
    this.slackApiClient = slackApiClient;
    this.userId = userId;
    this.cache = {};
  }

  async getInfo() {
    if (this.cache.info) {
      return this.cache.info;
    }

    const result = await this.slackApiClient.client.users.info({
      user: this.userId
    });
    this.cache.info = result.user;

    return this.cache.info;
  }

  get real_name_normalized() {
    return this.getInfo().then((info) => info.real_name_normalized);
  }
}

export default SlackUser;
