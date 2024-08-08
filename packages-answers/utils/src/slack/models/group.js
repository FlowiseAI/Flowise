class SlackGroup {
  constructor(slackApiClient, group) {
    this.slackApiClient = slackApiClient;
    this.group = group;
    this.cache = {};
  }

  get id() {
    return this.group.id;
  }

  get name() {
    return this.group.name;
  }

  async getMembers() {
    if (this.cache.members) {
      return this.cache.members;
    }

    const members = [];

    let cursor;
    do {
      const result = await this.slackApiClient.client.conversations.members({
        channel: this.id,
        cursor
      });
      for (const userId of result.members) {
        const user = await this.slackApiClient.getUser(userId);
        members.push(user);
      }
      cursor = result.response_metadata.next_cursor;
    } while (cursor);

    this.cache.members = members;

    return members;
  }
}
