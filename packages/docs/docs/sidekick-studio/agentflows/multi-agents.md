---
description: Understanding Multi-Agent Systems in Flowise
sidebar_position: 2
---

# Multi-Agent Systems

Multi-Agent systems in Flowise provide a high-level, collaborative approach to solving complex tasks by dividing them among specialized agents working under the supervision of a coordinator.

## Understanding Multi-Agent Systems

Multi-Agent systems employ a hierarchical structure where a supervisor agent manages and delegates tasks to specialized worker agents. This architecture excels at breaking down complex problems into manageable subtasks that can be addressed sequentially.

## Key Components

### Supervisor Agent

The Supervisor Agent acts as the central coordinator of the Multi-Agent system. It:

-   Analyzes user requests to determine what needs to be accomplished
-   Breaks complex tasks into smaller, manageable subtasks
-   Delegates these subtasks to the most appropriate Worker Agents
-   Synthesizes the results from Worker Agents into coherent responses
-   Maintains the overall context and flow of the conversation

### Worker Agents

Worker Agents are specialized agents designed to handle specific types of tasks or domains. Each Worker Agent:

-   Focuses on a particular skillset or knowledge area
-   Receives tasks from the Supervisor Agent
-   May access specialized tools relevant to their domain
-   Completes their assigned subtask and returns results to the Supervisor
-   Operates independently without awareness of other Workers

## Benefits of Multi-Agent Systems

Multi-Agent systems offer several advantages for certain types of workflows:

-   **Simplicity:** Provides an intuitive, task-based approach to workflow design
-   **Specialization:** Allows for creating highly specialized agents optimized for particular tasks
-   **Isolation:** Each Worker Agent operates independently, reducing cognitive load and complexity
-   **Linear Execution:** Tasks are completed in sequence, ensuring orderly processing
-   **Abstraction:** Handles many complex details automatically, allowing focus on high-level workflow design

## Limitations

While powerful, Multi-Agent systems do have some limitations:

-   Limited support for parallel execution of tasks
-   No built-in support for Human-in-the-Loop (HITL) review
-   Less granular control over conversation flow compared to Sequential Agents
-   Implicit rather than explicit State management

## Ideal Use Cases

Multi-Agent systems are particularly well-suited for:

-   Customer service workflows that follow predictable patterns
-   Information retrieval and summarization tasks
-   Linear processes that can be broken down into sequential steps
-   Applications where simplicity of design is a priority
-   Workflows that don't require parallel execution or complex branching

## Getting Started

To create a Multi-Agent system in Flowise, you'll work with the Supervisor Agent node and one or more Worker Agent nodes. Each Worker can be customized with specific tools, knowledge, and instructions appropriate to their assigned tasks.
