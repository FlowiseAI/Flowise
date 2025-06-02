---
description: Understanding the Tool Node in Sequential Agents
---

# Tool Node

The Tool Node is a **specialized node that enables workflow to interact with external systems**, retrieve information, or perform actions. Tool Nodes do not act independently. Instead, they serve as a bridge between your conversational workflow and external resources, allowing Agent Nodes to access and utilize them as needed.

<!-- ![](../../assets/sa-tool.png) -->

## Understanding the Tool Node

The Tool Node encapsulates external functionality or services that Agent Nodes can invoke to complete specific tasks. When an Agent Node determines that external assistance is needed to fulfill a user's request, it selects and invokes the appropriate Tool Node.

Tool Nodes are particularly useful for **enhancing the capabilities of Agent Nodes**, allowing them to:

-   **Retrieve information** from external sources (e.g., weather data, stock prices, product information)
-   **Perform actions** in external systems (e.g., booking a reservation, creating a ticket, sending an email)
-   **Process data** in specialized ways (e.g., analyzing sentiment, generating images, translating text)

## Inputs

|                  | Required | Description                                                                                                   |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| Tool             | **Yes**  | The **specific tool or external service** functionality the node will provide.                                |
| JSON Schema      | No       | A schema defining the structure of the Tool Node's output.                                                    |
| Require Approval | No       | A configuration to **enable Human-in-the-Loop (HITL)**, requiring human approval before the tool is executed. |

## Features

### Human-in-the-Loop (HITL)

One of the most powerful features of the Tool Node is its support for **Human-in-the-Loop (HITL)** functionality. When the "Require Approval" option is enabled, every time the tool is invoked by an Agent Node, the execution pauses and waits for human approval. This feature is particularly valuable for:

-   **Critical operations** where errors could have significant consequences
-   **Security or compliance requirements** that necessitate human oversight
-   **Costly operations** where unauthorized use could lead to financial impact
-   **Learning scenarios** where human feedback improves the system's performance over time

### Tool Integration

Tool Nodes can integrate with a wide variety of external systems and services through various mechanisms:

-   **API integration:** Connecting to web APIs to access data or functionality
-   **Database connections:** Retrieving or storing data in databases
-   **Webhooks:** Triggering actions in external systems
-   **Custom code execution:** Running custom code to perform specialized operations

## Available Tools

Flowise provides a range of built-in tools that can be used with Tool Nodes, including:

-   **Search Tools:** Web search, Wikipedia lookup, etc.
-   **Data Retrieval Tools:** Database queries, file system access, etc.
-   **Communication Tools:** Email sending, SMS notifications, etc.
-   **AI Service Tools:** Image generation, audio processing, etc.
-   **Custom Integration Tools:** Connects to custom APIs and services

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Clear tool naming**

    Name your tools in a way that clearly communicates their functionality to the Agent Node. For instance, if you create a weather information tool, instead of naming it "Lookup" or "API," use a descriptive name like "Get Current Weather" to help the Agent make better decisions about tool selection.

    **Precise input specifications**

    When configuring tools, especially those with API connections, define clear and precise input specifications. This helps the Agent understand what information it needs to provide for the tool to execute successfully.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Inadequate tool descriptions**

    * **Problem:** The tool's description doesn't provide enough information for the Agent to understand when or how to use it, leading to incorrect or inefficient tool selection.
    * **Example:** A tool is simply described as "Get Data" without specifying what kind of data it retrieves or what parameters it requires.
    * **Solution:** Provide clear, detailed descriptions for each tool, specifying what it does, when it should be used, what inputs it requires, and what outputs it provides.

    **Over-reliance on HITL**

    * **Problem:** Enabling "Require Approval" for all Tool Nodes creates excessive interruptions in the workflow, leading to a poor user experience and inefficient operations.
    * **Example:** Even simple, low-risk operations like retrieving public weather data require human approval, slowing down the conversation unnecessarily.
    * **Solution:** Reserve HITL for critical or sensitive operations where human oversight provides meaningful value. For routine, low-risk operations, consider allowing automated execution.

    **Insufficient error handling**

    * **Problem:** The Tool Node doesn't properly handle errors or exceptions from the external system, leading to cryptic error messages or workflow failures.
    * **Example:** When an API returns an error, the raw error message is displayed to the user instead of a friendly explanation of what went wrong.
    * **Solution:** Implement robust error handling in your Tool Nodes, with clear, user-friendly messages for common error scenarios. Consider fallback options for critical operations.

  </TabItem>
</Tabs>
