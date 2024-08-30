---
description: Summarizes the conversation and stores the memory in Upstash Redis server
---

# Upstash Redis-Backed Chat Memory

## Overview

The Upstash Redis-Backed Chat Memory is a powerful feature in AnswerAI that allows you to store and retrieve conversation history using Upstash Redis. This memory solution provides persistent storage for chat messages, enabling long-term memory capabilities for your AI applications.

## Key Benefits

-   **Persistent Storage**: Safely store conversation history in Upstash Redis for long-term retention.
-   **Scalable Solution**: Leverage Upstash Redis's scalability to handle large volumes of chat data.
-   **Flexible Configuration**: Customize session management and memory retrieval to suit your specific needs.

## How to Use

1. Add the Upstash Redis-Backed Chat Memory node to your AnswerAI workflow canvas.

<!-- TODO: Screenshot of adding the Upstash Redis-Backed Chat Memory node to the canvas -->
<figure><img src="/.gitbook/assets/screenshots/upstashmemorynode.png" alt="" /><figcaption><p> Upstash Redis-Backed Chat Memory Node Configuration &#x26; Drop UI</p></figcaption></figure>

2. Configure the node with the following parameters:

    - **Upstash Redis REST URL**: Enter your Upstash Redis instance URL (e.g., `https://<your-url>.upstash.io`).
    - **Session Id**: (Optional) Specify a unique identifier for the chat session. If not provided, a random ID will be generated.
    - **Session Timeouts**: (Optional) Set the time-to-live (TTL) for chat sessions in seconds. Omit this to make sessions never expire.
    - **Memory Key**: Set the key used to store chat history (default is `chat_history`).

3. Connect your Upstash Redis credential:
    - Click on the "Connect Credential" option.
    - Select or create an "Upstash Redis Memory API" credential with your Upstash REST token.

<!-- TODO: Screenshot of the credential configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/upstashapcredentials.png" alt="" /><figcaption><p> Upstash Redis Memory API credential &#x26; Drop UI</p></figcaption></figure>

4. Connect the Upstash Redis-Backed Chat Memory node to other nodes in your workflow that require access to chat history.

## Tips and Best Practices

1. **Session Management**: Use unique session IDs for different conversations or users to keep chat histories separate.
2. **Security**: Always use credentials to secure your Upstash Redis connection. Never expose your Upstash REST token in client-side code.
3. **Performance**: Consider setting appropriate session timeouts to manage memory usage and storage costs.
4. **Scalability**: Upstash Redis is designed to handle high loads, making it suitable for applications with many concurrent users.

## Troubleshooting

1. **Connection Issues**:

    - Ensure your Upstash Redis REST URL is correct and accessible.
    - Verify that your Upstash REST token is valid and has the necessary permissions.

2. **Missing Chat History**:

    - Check if the correct session ID is being used across interactions.
    - Verify that the session hasn't expired if you've set a session timeout.

3. **Performance Concerns**:
    - If experiencing slow responses, consider optimizing your Redis usage or upgrading your Upstash plan.

## API Reference

For advanced usage and custom implementations, refer to the Upstash Redis client API documentation:

```javascript
import { Redis } from '@upstash/redis'

// Initialize Redis client
const client = new Redis({
    url: 'https://<your-url>.upstash.io',
    token: 'your-upstash-rest-token'
})

// Example: Storing a message
await client.lpush('sessionId', JSON.stringify(messageObject))

// Example: Retrieving messages
const messages = await client.lrange('sessionId', 0, -1)
```

For more detailed information on available methods and options, consult the [@upstash/redis npm package documentation](https://www.npmjs.com/package/@upstash/redis).
