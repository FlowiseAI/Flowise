---
description: Summarizes the conversation and stores the current summary in memory
---

# Conversation Summary Memory

## Overview

The Conversation Summary Memory node is a powerful feature in AnswerAgentAI that summarizes the conversation and stores the current summary in memory. This node is particularly useful for maintaining context in long conversations or when dealing with large amounts of information.

## Key Benefits

-   Maintains context across long conversations
-   Reduces memory usage by storing summaries instead of full conversation history
-   Improves the relevance of AI responses by providing a concise context

## How to Use

1. Drag the Conversation Summary Memory node onto your canvas in the AnswerAgentAI Studio.
2. Connect the node to your chat model and other relevant nodes in your workflow.
3. Configure the node settings:
    - **Chat Model**: Select the chat model to use for summarization.
    - **Session ID** (optional): Specify a unique identifier for the conversation. If not provided, a random ID will be used.
    - **Memory Key**: Set the key used to store the summary in memory (default is 'chat_history').

<!-- TODO: Add a screenshot showing the Conversation Summary Memory node on the canvas with its configuration panel open -->
<figure><img src="/.gitbook/assets/screenshots/conversationsummarybuffermemory.pngconfiguration.png" alt="" /><figcaption><p> Conversation Summary Buffer Memory Configuration &#x26; Drop UI</p></figcaption></figure>

4. Run your workflow to start using the Conversation Summary Memory.

## Tips and Best Practices

1. Use this node when dealing with long conversations or complex topics that require maintaining context.
2. Experiment with different chat models to find the one that provides the most accurate and concise summaries.
3. If you're building a multi-user application, make sure to use unique session IDs for each conversation to prevent cross-talk between different users' contexts.
4. Consider using this node in combination with other memory types for more sophisticated context management.

## Troubleshooting

1. **Summaries are too short or missing important details**: Try using a more capable chat model or adjust the model's parameters to generate more detailed summaries.
2. **High latency in responses**: If you notice increased response times, it might be due to the summarization process. Consider using this node less frequently or optimizing your workflow.
3. **Inconsistent context**: Ensure that you're using the correct session ID for each conversation to maintain consistent context.
