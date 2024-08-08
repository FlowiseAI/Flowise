import { WebClient } from '@slack/web-api';
import SlackChannel from './models/channel';
import SlackUser from './models/user';

class SlackApiClient {
  constructor({ accessToken: token }) {
    this.client = new WebClient(token);
    this.cache = {
      users: {},
      channels: {},
      groups: {}
    };
  }

  async initDataLookups() {
    await this.initUserCache();
    await this.initChannelCache();
    // await this.initGroupCache();
  }

  async initUserCache() {
    const users = [];
    let cursor;

    do {
      const result = await this.client.users.list({ limit: 1000, cursor });
      users.push(...result.members);
      cursor = result.response_metadata.next_cursor;
    } while (cursor);

    for (const user of users) {
      this.cache.users[user.id] = new SlackUser(this.client, user.id);
    }
  }

  async initChannelCache() {
    const channels = [];
    let cursor;

    do {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
        cursor
      });
      channels.push(...result.channels);
      cursor = result.response_metadata.next_cursor;
      // console.log('running');
    } while (cursor);
    // console.log('mid initChannelCache');
    for (const channel of channels) {
      this.cache.channels[channel.id] = channel;
      // console.log('setting');
    }
    // console.log('end initChannelCache');
  }

  async initGroupCache() {
    const groups = [];
    let cursor;

    do {
      const result = await this.client.conversations.list({
        types: 'mpim,im',
        limit: 1000,
        cursor
      });
      groups.push(...result.channels);
      cursor = result.response_metadata.next_cursor;
    } while (cursor);

    for (const group of groups) {
      this.cache.groups[group.id] = group;
    }
  }

  async getChannel(channelId) {
    if (!Object.keys(this.cache.channels).length) {
      await this.initChannelCache();
    }
    if (this.cache.channels[channelId]) {
      return this.cache.channels[channelId];
    }

    const result = await this.client.conversations.info({ channel: channelId });
    const channel = new SlackChannel(this.client, result.channel);
    this.cache.channels[channelId] = channel;

    return channel;
  }
  async getChannels() {
    if (!Object.keys(this.cache.channels).length) {
      await this.initChannelCache();
    }
    return Object.values(this.cache.channels);
  }

  async getUser(userId) {
    if (this.cache.users[userId]) {
      return this.cache.users[userId];
    }

    const result = await this.client.users.info({ user: userId });
    const user = new SlackUser(this.client, result.user);
    this.cache.users[userId] = user;

    return user;
  }

  getGroup(groupId) {
    if (this.cache.groups[groupId]) {
      return this.cache.groups[groupId];
    }

    throw new Error(`Group not found in cache: ${groupId}`);
  }
}

export default SlackApiClient;
