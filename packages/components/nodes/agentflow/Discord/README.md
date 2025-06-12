### Discord Node

The Discord Agentflow node enables retrieving and sending messages in a Discord channel within an Agentflow V2 workflow.

- **Functionality**:
   Retrieves messages from and sends messages to a specified Discord channel.
- **Configuration Parameters**:
  - **credential**: Name of the Flowise credential entry containing Discord bot credentials.
    - **botToken**: Discord Bot token used for authentication.
    - **apiVersion**: (Optional) Discord API version, default is `v10`.
- **Inputs**:
  - **channelId** (`string`, required)
     The Discord channel’s unique [Snowflake](https://discord.com/developers/docs/reference#snowflakes) ID.
  - **mode** (`enum`, required)
     Operation mode of the node:
    - `retrieve` – fetch messages from the channel.
    - `send` – post a message to the channel.
  - **Retrieve Mode Inputs** (only when `mode` = `retrieve`):
    - **limit** (`number`, default `50`)
       Maximum number of messages to retrieve (1–100).
    - **beforeId** (`string`, optional`)
       Only return messages with IDs less than this Snowflake.
    - **afterId** (`string`, optional`)
       Only return messages with IDs greater than this Snowflake.
    - **aroundId** (`string`, optional`)
       Return messages around this Snowflake (half before/half after).
  - **Send Mode Inputs** (only when `mode` = `send`):
    - **content** (`string`, required)
       Plain-text message body (max 2000 characters).
    - **replyToMessageId** (`string`, optional`)
       Snowflake ID to reply to.
    - **embedTitle** (`string`, optional`)
       Embed title (max 256 characters).
    - **embedDescription** (`string`, optional`)
       Embed description (max 4096 characters).
    - **embedColor** (`string`, optional`)   Hex color code (e.g. `#FF0000`) or decimal number.
    - **embedUrl** (`string`, optional`)
       URL link for the embed title.
    - **embedThumbnail** (`string`, optional`)
       URL of the thumbnail image.
    - **embedImage** (`string`, optional`)
       URL of the main embed image.
- **Outputs**:
  - When `mode` = `retrieve`:
     Returns an array of `DiscordMessage` objects and pagination metadata.
  - When `mode` = `send`:
     Returns the newly created `DiscordMessage` object and related metadata.
