---
description: Conversation Summary Buffer Memory in AnswerAI
---

# Conversation Summary Buffer Memory

## Overview

The Conversation Summary Buffer Memory is a powerful feature in AnswerAI that uses token length to decide when to summarize conversations. This memory type helps manage long conversations efficiently by summarizing older parts of the conversation when a token limit is reached.

## Key Benefits

-   Maintains context for long conversations without exceeding token limits
-   Automatically summarizes older parts of the conversation
-   Allows customization of token limits and memory settings

## How to Use

1. Add the Conversation Summary Buffer Memory node to your AnswerAI workflow canvas.
2. Configure the node with the following settings:

    a. **Chat Model**: Select the language model to use for summarization.

    b. **Max Token Limit**: Set the maximum number of tokens before summarization occurs (default is 2000).

    c. **Session ID** (optional): Specify a unique identifier for the conversation. If not provided, a random ID will be generated.

    d. **Memory Key** (optional): Set the key used to store the chat history (default is 'chat_history').

3. Connect the memory node to other nodes in your workflow that require conversation history.

<!-- TODO: Add a screenshot of the Conversation Summary Buffer Memory node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/conversationsummarybuffermemory.png" alt="" /><figcaption><p> Conversation Summary Buffer Memory Node in a workflow&#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose an appropriate Max Token Limit based on your use case and the complexity of your conversations.
2. Use a consistent Session ID for related conversations to maintain context across multiple interactions.
3. Experiment with different Chat Models to find the best balance between summarization quality and performance.
4. Monitor the summarized content to ensure important information is not lost during the summarization process.

## Troubleshooting

1. **Issue**: Conversation context seems to be lost unexpectedly.
   **Solution**: Check if the Max Token Limit is set too low. Increase the limit to allow for more context retention.

2. **Issue**: Summarization is not occurring as expected.
   **Solution**: Verify that the Chat Model is properly connected and functioning. Ensure that the conversation length is actually reaching the Max Token Limit.

3. **Issue**: Memory is not persisting across sessions.
   **Solution**: Make sure you're using a consistent Session ID for related conversations. If the issue persists, check your database configuration and connections.

Remember to handle the memory operations carefully, especially when dealing with sensitive conversation data.
