---
description: Learn the Fundamentals of Sequential Agents in Flowise
sidebar_position: 1
---

# Sequential Agents

This guide offers a complete overview of the Sequential Agent AI system architecture within Flowise, exploring its core components and workflow design principles.

:::warning
**Disclaimer**: This documentation is intended to help Flowise users understand and build conversational workflows using the Sequential Agent system architecture. It is not intended to be a comprehensive technical reference for the LangGraph framework and should not be interpreted as defining industry standards or core LangGraph concepts.
:::

## Concept

Built on top of [LangGraph](https://www.langchain.com/langgraph), Flowise's Sequential Agents architecture facilitates the **development of conversational agentic systems by structuring the workflow as a directed cyclic graph (DCG)**, allowing controlled loops and iterative processes.

This graph, composed of interconnected nodes, defines the sequential flow of information and actions, enabling the agents to process inputs, execute tasks, and generate responses in a structured manner.

### Understanding Sequential Agents' DCG Architecture

This architecture simplifies the management of complex conversational workflows by defining a clear and understandable sequence of operations through its DCG structure.

Let's explore some key elements of this approach:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="core" label="Core Principles">
    * **Node-based processing:** Each node in the graph represents a discrete processing unit, encapsulating its own functionality like language processing, tool execution, or conditional logic.
    * **Data flow as connections:** Edges in the graph represent the flow of data between nodes, where the output of one node becomes the input for the subsequent node, enabling a chain of processing steps.
    * **State management:** State is managed as a shared object, persisting throughout the conversation. This allows nodes to access relevant information as the workflow progresses.
  </TabItem>
  <TabItem value="terminology" label="Terminology">
    * **Flow:** The movement or direction of data within the workflow. It describes how information passes between nodes during a conversation.
    * **Workflow:** The overall design and structure of the system. It's the blueprint that defines the sequence of nodes, their connections, and the logic that orchestrates the conversation flow.
    * **State:** A shared data structure that represents the current snapshot of the conversation. It includes the conversation history `state.messages` and any custom State variables defined by the user.
    * **Custom State:** User-defined key-value pairs added to the state object to store additional information relevant to the workflow.
    * **Tool:** An external system, API, or service that can be accessed and executed by the workflow to perform specific tasks, such as retrieving information, processing data, or interacting with other applications.
    * **Human-in-the-Loop (HITL):** A feature that allows human intervention in the workflow, primarily during tool execution. It enables a human reviewer to approve or reject a tool call before it's executed.
    * **Parallel node execution:** It refers to the ability to execute multiple nodes concurrently within a workflow by using a branching mechanism. This means that different branches of the workflow can process information or interact with tools simultaneously, even though the overall flow of execution remains sequential.
  </TabItem>
</Tabs>

## Key Components of Sequential Agents

Sequential Agents bring a whole new dimension to Flowise, **introducing 10 specialized nodes**, each serving a specific purpose, offering more control over how our conversational agents interact with users, process information, make decisions, and execute actions.

-   **Start Node:** The entry point for all Sequential Agent workflows
-   **Agent Memory Node:** Enables persistence of conversation state across multiple interactions
-   **State Node:** Creates and manages custom state variables
-   **Agent Node:** A core processing unit that can interact with tools and generate responses
-   **LLM Node:** Provides structured outputs and specialized language processing
-   **Tool Node:** Connects to external systems and APIs
-   **Condition Node:** Implements branching logic using simple conditions
-   **Condition Agent Node:** Uses AI reasoning for advanced branching decisions
-   **Loop Node:** Creates iterative processes within the workflow
-   **End Node:** Marks the termination of a conversation flow

## Advantages of Sequential Agents

Sequential Agent systems offer several distinct advantages for complex workflows:

-   **Fine-grained control:** Direct access to every step of the conversation flow
-   **Explicit state management:** Custom state variables for tracking conversation context
-   **Parallel execution:** Multiple branches of processing can run simultaneously
-   **Human-in-the-Loop:** Built-in support for human review and approval of critical actions
-   **Dynamic branching:** Sophisticated condition-based routing of conversation flows
-   **Iterative processing:** Loop-based refinement of outputs and multi-step processes

## Getting Started

To begin working with Sequential Agents, you'll need to understand the function and configuration of each node type. The following sections provide detailed documentation for each component of the Sequential Agent architecture.
