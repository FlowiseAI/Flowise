---
description: Understanding the Start Node in Sequential Agents
---

# Start Node

As its name implies, the Start Node is the **entry point for all workflows in the Sequential Agent architecture**. It receives the initial user query, initializes the conversation State, and sets the flow in motion.

<!-- ![](../../assets/seq-02.png) -->

## Understanding the Start Node

The Start Node ensures that our conversational workflows have the necessary setup and context to function correctly. **It's responsible for setting up key functionalities** that will be used throughout the rest of the workflow:

-   **Defining the default LLM:** The Start Node requires us to specify a Chat Model (LLM) compatible with function calling, enabling agents in the workflow to interact with tools and external systems. It will be the default LLM used under the hood in the workflow.
-   **Initializing Memory:** We can optionally connect an Agent Memory Node to store and retrieve conversation history, enabling more context-aware responses.
-   **Setting a custom State:** By default, the State contains an immutable `state.messages` array, which acts as the transcript or history of the conversation between the user and the agents. The Start Node allows you to connect a custom State to the workflow adding a State Node, enabling the storage of additional information relevant to your workflow
-   **Enabling moderation:** Optionally, we can connect Input Moderation to analyze the user's input and prevent potentially harmful content from being sent to the LLM.

## Inputs

|                   | Required | Description                                                                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat Model        | **Yes**  | The default LLM that will power the conversation. Only compatible with **models that are capable of function calling**.                         |
| Agent Memory Node | No       | Connect an Agent Memory Node to **enable persistence and context preservation**.                                                                |
| State Node        | No       | Connect a State Node to **set a custom State**, a shared context that can be accessed and modified by other nodes in the workflow.              |
| Input Moderation  | No       | Connect a Moderation Node to **filter content** by detecting text that could generate harmful output, preventing it from being sent to the LLM. |

## Outputs

The Start Node can connect to the following nodes as outputs:

-   **Agent Node:** Routes the conversation flow to an Agent Node, which can then execute actions or access tools based on the conversation's context.
-   **LLM Node:** Routes the conversation flow to an LLM Node for processing and response generation.
-   **Condition Agent Node:** Connects to a Condition Agent Node to implement branching logic based on the agent's evaluation of the conversation.
-   **Condition Node:** Connects to a Condition Node to implement branching logic based on predefined conditions.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Choose the right Chat Model**

    Ensure your selected LLM supports function calling, a key feature for enabling agent-tool interactions. Additionally, choose an LLM that aligns with the complexity and requirements of your application. You can override the default LLM by setting it at the Agent/LLM/Condition Agent node level when necessary.

    **Consider context and persistence**

    If your use case demands it, utilize Agent Memory Node to maintain context and personalize interactions.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Incorrect Chat Model (LLM) selection**

    * **Problem:** The Chat Model selected in the Start Node is not suitable for the intended tasks or capabilities of the workflow, resulting in poor performance or inaccurate responses.
    * **Example:** A workflow requires a Chat Model with strong summarization capabilities, but the Start Node selects a model optimized for code generation, leading to inadequate summaries.
    * **Solution:** Choose a Chat Model that aligns with the specific requirements of your workflow. Consider the model's strengths, weaknesses, and the types of tasks it excels at. Refer to the documentation and experiment with different models to find the best fit.

    **Overlooking Agent Memory Node configuration**

    * **Problem:** The Agent Memory Node is not properly connected or configured, resulting in the loss of conversation history data between sessions.
    * **Example:** You intend to use persistent memory to store user preferences, but the Agent Memory Node is not connected to the Start Node, causing preferences to be reset on each new conversation.
    * **Solution:** Ensure that the Agent Memory Node is connected to the Start Node and configured with the appropriate database (SQLite). For most use cases, the default SQLite database will be sufficient.

    **Inadequate Input Moderation**

    * **Problem:** The "Input Moderation" is not enabled or configured correctly, allowing potentially harmful or inappropriate user input to reach the LLM and generate undesirable responses.
    * **Example:** A user submits offensive language, but the input moderation fails to detect it or is not set up at all, allowing the query to reach the LLM.
    * **Solution:** Add and configure an input moderation node in the Start Node to filter out potentially harmful or inappropriate language. Customize the moderation settings to align with your specific requirements and use cases.

  </TabItem>
</Tabs>
