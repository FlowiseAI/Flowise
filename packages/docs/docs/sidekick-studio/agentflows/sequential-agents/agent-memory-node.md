---
description: Understanding the Agent Memory Node in Sequential Agents
---

# Agent Memory Node

The Agent Memory Node **provides a mechanism for persistent memory storage**, allowing the Sequential Agent workflow to retain the conversation history `state.messages` and any custom State previously defined across multiple interactions

This long-term memory is essential for agents to learn from previous interactions, maintain context over extended conversations, and provide more relevant responses.

<!-- ![](../../assets/seq-03.png) -->

## Where the data is recorded

By default, Flowise utilizes its **built-in SQLite database** to store conversation history and custom state data, creating a "**checkpoints**" table to manage this persistent information.

## Understanding the Agent Memory Node

The Agent Memory Node serves as the intermediary between the conversational workflow and the database, tracking the conversation history and custom state information for specific chat sessions.

-   It **assigns a unique session ID to each conversation**, allowing multiple chats to be managed simultaneously.
-   It **manages changes in State (conversation history and custom State)** throughout the workflow's execution, tracking these changes and committing them to the database.
-   It **retrieves the latest State** from the database for a chat session, ensuring continuity between conversations.

## Inputs

|                | Required | Description                                                                                 |
| -------------- | -------- | ------------------------------------------------------------------------------------------- |
| Memory Options | No       | A configuration object to **customize how memory is managed** (e.g., database connections). |

## Outputs

The Agent Memory Node has no direct outputs. Instead, it connects to the Start Node as its input, providing memory functionality to the entire Sequential Agent workflow.

## How the memory is used

When a user interacts with an Agent in which the **Start Node is connected to an Agent Memory Node**, a unique session ID is generated to identify the conversation. Each time the user engages with the workflow, the conversation history and any custom State are:

1. **Retrieved** from the database using the conversation's session ID.
2. **Updated** to include the latest user inputs and agent responses.
3. **Committed** back to the database for future use.

This allows the workflow to provide contextually relevant responses based on the complete conversation history, even for interactions spanning multiple sessions over extended periods.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Leverage memory for personalization**

    Use the Agent Memory Node to store preferences, language patterns, and interaction history to tailor responses to individual users over time.

    **Balance context and performance**

    When working with large conversation histories, consider implementing strategies to manage context window limitations, such as summarizing or focusing on relevant portions of the conversation history.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Not connecting the Agent Memory Node to the Start Node**

    * **Problem:** The Agent Memory Node is not properly connected to the Start Node, resulting in a failure to preserve conversation context across user sessions.
    * **Example:** Users must reintroduce themselves and re-establish context in every new session because the conversation history is not being saved or retrieved correctly.
    * **Solution:** Ensure the Agent Memory Node is connected to the Start Node at the appropriate input field. Verify that the connection is active and functioning by testing the workflow across multiple sessions.

    **Misunderstanding memory persistence**

    * **Problem:** The State with a specific session ID is not being correctly saved or retrieved due to improper configuration or misunderstanding of the Agent Memory Node's functionality.
    * **Example:** Custom State variables or conversation history pieces appear to be "forgotten" in subsequent interactions.
    * **Solution:** Verify that the database is correctly set up and that the session ID generation mechanism is working properly. Test memory persistence by creating a simple workflow that reads and writes custom State variables.

    **Not configuring the correct storage method**

    * **Problem:** The chosen storage method is not appropriate for the application's requirements, leading to performance issues or data loss.
    * **Example:** The default SQLite database is used for a high-traffic application that requires more robust database solutions.
    * **Solution:** Assess your application's requirements and select the appropriate storage solution. For most use cases, the default SQLite database is sufficient, but consider alternatives for specific needs. Implement proper database maintenance practices to prevent performance degradation.

  </TabItem>
</Tabs>
