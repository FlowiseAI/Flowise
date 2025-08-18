---
description: LangChain Memory Nodes
---

# Memory Nodes

Memory nodes in AnswerAgentAI allow you to create chatbots with persistent memory, enabling more natural and context-aware conversations. This feature simulates human-like memory, allowing the AI to recall information from previous interactions within the same conversation.

## Overview

Memory nodes store and retrieve conversation history, providing context to the AI model. This enables the AI to maintain coherent, contextually relevant dialogues across multiple exchanges.

<div style={{ backgroundColor: 'blue', color: 'white', padding: '5px', borderRadius: '5px', marginBottom: '10px' }}>
  Human: hi i am bob
</div>

<div style={{ backgroundColor: 'green', color: 'white', padding: '5px', borderRadius: '5px', marginBottom: '10px' }}>
  AI: Hello Bob! It's nice to meet you. How can I assist you today?
</div>

<div style={{ backgroundColor: 'blue', color: 'white', padding: '5px', borderRadius: '5px', marginBottom: '10px' }}>
  Human: what's my name?
</div>

<div style={{ backgroundColor: 'green', color: 'white', padding: '5px', borderRadius: '5px', marginBottom: '10px' }}>
  AI: Your name is Bob, as you mentioned earlier.
</div>

Under the hood, these conversations are stored in arrays or databases, and provided as context to prompts. For example:

```
You are an assistant to a human, powered by a large language model trained by OpenAI.

Whether the human needs help with a specific question or just wants to have a conversation about a particular topic, you are here to assist.

Current conversation:
{chat_history}
```

## Key Benefits

-   Improved conversation continuity and context awareness
-   More natural and human-like interactions
-   Ability to recall and reference information from earlier in the conversation

## How to Use

1. Select a memory node from the available options in the AnswerAgentAI canvas.
2. Connect the memory node to your conversation flow.
3. Configure the memory node settings as needed (e.g., memory size, storage method).
4. Test your chatbot to ensure it correctly remembers and uses information from previous exchanges.

<!-- TODO: Screenshot of the AnswerAgentAI canvas showing where to find and how to connect a memory node -->
<figure><img src="/.gitbook/assets/screenshots/memorynodes.png" alt="" /><figcaption><p> Memory Nodes &#x26; Drop UI</p></figcaption></figure>

### Memory Nodes

-   [Buffer Memory](buffer-memory.md)
-   [Buffer Window Memory](buffer-window-memory.md)
-   [Conversation Summary Memory](conversation-summary-memory.md)
-   [Conversation Summary Buffer Memory](conversation-summary-buffer-memory.md)
-   [DynamoDB Chat Memory](dynamodb-chat-memory.md)
-   [MongoDB Atlas Chat Memory](mongodb-atlas-chat-memory.md)
-   [Redis-Backed Chat Memory](redis-backed-chat-memory.md)
-   [Upstash Redis-Backed Chat Memory](upstash-redis-backed-chat-memory.md)
-   [Zep Memory](zep-memory.md)

Each memory node type has its own configuration options and is suitable for different scenarios. Refer to the individual documentation for each memory node type for more detailed information.

## Tips and Best Practices

1. Choose the appropriate memory node based on your specific use case and requirements.
2. Consider the trade-off between memory size and performance when configuring your memory nodes.
3. Regularly test your chatbot to ensure it's using the stored memory effectively and accurately.
4. Use memory nodes in combination with other AnswerAgentAI features for more sophisticated conversational AI experiences.

## Handling Multiple Users

AnswerAgentAI provides methods to maintain separate conversation histories for multiple users:

### UI & Embedded Chat

For UI and Embedded Chat implementations, AnswerAgentAI automatically separates conversations for different users by generating a unique `chatId` for each new interaction.

### Prediction API

To separate conversations for multiple users when using the Prediction API:

1. Locate the "Session ID" input parameter in your chosen memory node.

<!-- TODO: Screenshot showing the "Session ID" input parameter in a memory node configuration -->

2. In your POST request to `/api/v1/prediction/{your-chatflowid}`, include a `sessionId` in the `overrideConfig` object:

```json
{
    "question": "Hello!",
    "overrideConfig": {
        "sessionId": "user1"
    }
}
```

### Message API

Use the Message API to retrieve or delete chat messages:

-   GET `/api/v1/chatmessage/{your-chatflowid}`
-   DELETE `/api/v1/chatmessage/{your-chatflowid}`

Query parameters:

| Parameter | Type   | Description                    |
| --------- | ------ | ------------------------------ |
| sessionId | string | Unique identifier for the user |
| sort      | enum   | "ASC" or "DESC"                |
| startDate | string | Start date for message range   |
| endDate   | string | End date for message range     |

## Conversation Management

AnswerAgentAI provides a user interface for visualizing and managing conversations:

<!-- TODO: Screenshot of the AnswerAgentAI conversation management interface -->

This interface allows you to review, analyze, and manage conversation histories for different users or sessions.

## Troubleshooting

1. If the AI isn't recalling information correctly, check that your memory node is properly connected and configured.
2. Ensure you're using the correct `sessionId` when working with multiple users.
3. If you're experiencing performance issues, consider adjusting the memory size or using a different type of memory node.
4. For persistent storage issues, verify the connection settings for database-backed memory nodes (e.g., DynamoDB, MongoDB, Redis).

By effectively using memory nodes in AnswerAgentAI, you can create more engaging, context-aware conversational AI experiences that better simulate human-like interactions.
