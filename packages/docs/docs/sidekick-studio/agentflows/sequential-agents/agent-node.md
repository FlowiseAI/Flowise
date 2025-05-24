---
description: Understanding the Agent Node in Sequential Agents
---

# Agent Node

The Agent Node is a **core component of the Sequential Agent architecture.** It acts as a decision-maker and orchestrator within our workflow.

<!-- ![](../../assets/sa-agent.png) -->

## Understanding the Agent Node

Upon receiving input from preceding nodes, which always includes the full conversation history `state.messages` and any custom State at that point in the execution, the Agent Node uses its defined "persona", established by the System Prompt, to determine if external tools are necessary to fulfill the user's request.

-   If tools are required, the Agent Node autonomously selects and executes the appropriate tool. This execution can be automatic or, for sensitive tasks, require human approval before proceeding (**Human-in-the-Loop, HITL**).
-   The Agent Node also maintains an ongoing dialogue with users, providing relevant responses based on the conversation's context and any tool-derived information.

## Inputs

|                               | Required | Description                                                                                                                                     |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| System Prompt                 | **Yes**  | A text prompt that defines the **Agent's personality, role, and constraints**. It guides the Agent's decision-making and response generation.   |
| Tools                         | No       | The **Tool Nodes** that the Agent Node can access and execute, each offering specific functionality to retrieve information or perform actions. |
| Chat Model                    | No       | A custom **Chat Model (LLM)** to use instead of the default one defined in the Start Node.                                                      |
| JSON Schema                   | No       | A schema defining the structure of the Agent Node's response when JSON Structured Output is enabled.                                            |
| Enable JSON Structured Output | No       | A configuration to **force the Agent Node's response to follow** a predefined JSON schema.                                                      |
| Update State                  | No       | A JSON object that defines **how the Agent Node should update the custom State** before passing it to the next node.                            |

## Outputs

The Agent Node can connect to the following nodes as outputs:

-   **Agent Node:** Connects to another Agent Node to continue the conversation with a different agent or persona.
-   **LLM Node:** Routes the conversation flow to an LLM Node for processing and response generation.
-   **Condition Agent Node:** Connects to a Condition Agent Node to implement branching logic based on the agent's evaluation of the conversation.
-   **Condition Node:** Connects to a Condition Node to implement branching logic based on predefined conditions.
-   **Loop Node:** Connects to a Loop Node to implement repetitive processes based on specific conditions.
-   **End Node:** Connects to an End Node to conclude the conversational flow.

## Features

### Tool Usage

When connected to Tool Nodes, the Agent Node can **analyze the user's request and determine if tools are necessary** to fulfill it. If multiple Tool Nodes are available, the Agent Node selects the most appropriate one(s) for the task at hand.

For example, if a user asks a recipe-related question, the Agent Node might execute a "Recipe Search" Tool Node to retrieve relevant recipes, or if a user queries about weather data, the Agent Node might execute a "Weather API" Tool Node.

### Human-in-the-Loop (HITL)

The Agent Node supports **Human-in-the-Loop (HITL)** functionality, allowing human intervention in the agent's decision-making process, particularly for sensitive or critical operations. When HITL is enabled, the Agent Node might request human approval before executing a tool, making it a critical feature for workflows where accuracy, security, or alignment are paramount.

### State Management

In addition to responding to the user and executing tools, the Agent Node can **modify the custom State** to reflect progress or changes in the conversation. This enables the Agent Node to share information with subsequent nodes in the workflow.

For example, an Agent Node might update the custom State to mark a client's ID verification as complete, enabling other nodes in the workflow to proceed with sensitive operations.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Clear system prompt**

    Craft a concise and unambiguous System Prompt that accurately reflects the agent's role and capabilities. This guides the agent's decision-making and ensures it acts within its defined scope.

    **Strategic tool selection**

    Choose and configure a set of tools that align with the agent's purpose. Avoid providing too many tools, which can lead to confusion and suboptimal selections. Instead, select specific, purpose-driven tools that integrate seamlessly with the agent's role.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Unclear or incomplete system prompt**

    * **Problem:** The System Prompt provided to the Agent Node lacks the necessary specificity and context to guide the agent effectively in carrying out its intended tasks. A vague or overly general prompt can lead to irrelevant responses, difficulty in understanding user intent, and an inability to leverage tools or data appropriately.
    * **Example:** You're building a travel booking agent, and your System Prompt simply states "_You are a helpful AI assistant._" This lacks the specific instructions and context needed for the agent to effectively guide users through flight searches, hotel bookings, and itinerary planning.
    * **Solution:** Craft a detailed and context-aware System Prompt:

    ```
    You are a travel booking agent. Your primary goal is to assist users in planning and booking their trips.
    - Guide them through searching for flights, finding accommodations, and exploring destinations.
    - Be polite, patient, and offer travel recommendations based on their preferences.
    - Utilize available tools to access flight data, hotel availability, and destination information.
    ```

  </TabItem>
</Tabs>
