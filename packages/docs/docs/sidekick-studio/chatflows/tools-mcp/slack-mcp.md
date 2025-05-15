---
sidebar_position: 4
title: Slack MCP
description: Use Slack MCP to send messages and interact with Slack
---

# Slack MCP for Answer Agent

This documentation outlines how to use the Slack Model Context Protocol (MCP) integration with Answer Agent. The MCP allows Answer Agent to interact with Slack's API, enabling message sending, channel management, and user operations through natural language.

## Setting Up Credentials

To use the Slack MCP, you'll need to configure the following credentials:

### Obtaining Credentials

1. **Slack Bot Token**:
    - Go to [https://api.slack.com/apps](https://api.slack.com/apps)
    - Create a new app or select an existing one
    - Navigate to "OAuth & Permissions"
    - Add necessary bot scopes like `chat:write`, `channels:read`, etc.
    - Install the app to your workspace
    - Copy the Bot User OAuth Token

### Configuration

You can provide these credentials in one of two ways:

1. **During conversation**: Answer Agent will prompt you for your credentials if not already configured.

2. **Via configuration file**: You can set up a permanent configuration by creating a file with:
    ```
    SLACK_BOT_TOKEN=your_token_here
    ```

> ⚠️ **Warning**: Your bot token has the permissions you granted during app creation. Use appropriate scopes based on your needs.

## Available Tools

The Slack MCP provides the following tools for interacting with Slack:

### `slack_list_channels`

List public or pre-defined channels in the workspace.

**Optional inputs:**

-   `limit` (number, default: 100, max: 200): Maximum number of channels to return
-   `cursor` (string): Pagination cursor for next page

**Returns:** List of channels with their IDs and information

### `slack_post_message`

Post a new message to a Slack channel.

**Required inputs:**

-   `channel_id` (string): The ID of the channel to post to
-   `text` (string): The message text to post

**Returns:** Message posting confirmation and timestamp

### `slack_reply_to_thread`

Reply to a specific message thread.

**Required inputs:**

-   `channel_id` (string): The channel containing the thread
-   `thread_ts` (string): Timestamp of the parent message
-   `text` (string): The reply text

**Returns:** Reply confirmation and timestamp

### `slack_add_reaction`

Add an emoji reaction to a message.

**Required inputs:**

-   `channel_id` (string): The channel containing the message
-   `timestamp` (string): Message timestamp to react to
-   `reaction` (string): Emoji name without colons

**Returns:** Reaction confirmation

### `slack_get_channel_history`

Get recent messages from a channel.

**Required inputs:**

-   `channel_id` (string): The channel ID

**Optional inputs:**

-   `limit` (number, default: 10): Number of messages to retrieve

**Returns:** List of messages with their content and metadata

### `slack_get_thread_replies`

Get all replies in a message thread.

**Required inputs:**

-   `channel_id` (string): The channel containing the thread
-   `thread_ts` (string): Timestamp of the parent message

**Returns:** List of replies with their content and metadata

### `slack_get_users`

Get list of workspace users with basic profile information.

**Optional inputs:**

-   `cursor` (string): Pagination cursor for next page
-   `limit` (number, default: 100, max: 200): Maximum users to return

**Returns:** List of users with their basic profiles

### `slack_get_user_profile`

Get detailed profile information for a specific user.

**Required inputs:**

-   `user_id` (string): The user's ID

**Returns:** Detailed user profile information

## Setup

### Create a Slack App

1. Visit the [Slack Apps page](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Name your app and select your workspace

### Configure Bot Token Scopes

Navigate to "OAuth & Permissions" and add these scopes:

-   `channels:history` - View messages and other content in public channels
-   `channels:read` - View basic channel information
-   `chat:write` - Send messages as the app
-   `reactions:write` - Add emoji reactions to messages
-   `users:read` - View users and their basic information
-   `users.profile:read` - View detailed profiles about users

### Install App to Workspace

1. Click "Install to Workspace" and authorize the app
2. Save the "Bot User OAuth Token" that starts with `xoxb-`
3. Get your Team ID (starts with a T) by following Slack's guidance

## Environment Variables

-   **SLACK_BOT_TOKEN**: Required. The Bot User OAuth Token starting with `xoxb-`.
-   **SLACK_TEAM_ID**: Required. Your Slack workspace ID starting with T.
-   **SLACK_CHANNEL_IDS**: Optional. Comma-separated list of channel IDs to limit channel access (e.g., "C01234567, C76543210"). If not set, all public channels will be listed.

## Troubleshooting

If you encounter permission errors, verify that:

-   All required scopes are added to your Slack app
-   The app is properly installed to your workspace
-   The tokens and workspace ID are correctly copied to your configuration
-   The app has been added to the channels it needs to access
