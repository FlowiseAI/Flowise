---
description: Learn about the different Agent Flows available in Flowise
---

# Agent Flows (Depricated)

Flowise provides multiple approaches to building agent systems, each designed for specific use cases and offering different levels of control and abstraction. This guide explores the two main agent architectures: **Multi-Agents** and **Sequential Agents**.

## Understanding Agent Flows

Agent Flows in Flowise represent different patterns and architectures for constructing conversational AI systems. Each pattern offers a unique approach to managing conversation flow, tool usage, and decision-making processes.

## Multi-Agents vs Sequential Agents

While both Multi-Agent and Sequential Agent systems in Flowise are built upon the LangGraph framework and share the same fundamental principles, the Sequential Agent architecture provides a lower level of abstraction, offering more granular control over every step of the workflow.

|                          | Multi-Agent                                                                                                                                        | Sequential Agent                                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure                | **Hierarchical**; Supervisor delegates to specialized Workers.                                                                                     | **Linear, cyclic and/or branching**; nodes connect in a sequence, with conditional logic for branching.                                                                                                                      |
| Workflow                 | Flexible; designed for breaking down a complex task into a **sequence of sub-tasks**, completed one after another.                                 | Highly flexible; **supports parallel node execution**, complex dialogue flows, branching logic, and loops within a single conversation turn.                                                                                 |
| Parallel Node Execution  | **No**; Supervisor handles one task at a time.                                                                                                     | **Yes**; can trigger multiple actions in parallel within a single run.                                                                                                                                                       |
| State Management         | **Implicit**; State is in place, but is not explicitly managed by the developer.                                                                   | **Explicit**; State is in place, and developers can define and manage an initial or custom State using the State Node and the "Update State" field in various nodes.                                                         |
| Tool Usage               | **Workers** can access and use tools as needed.                                                                                                    | Tools are accessed and executed through **Agent Nodes** and **Tool Nodes**.                                                                                                                                                  |
| Human-in-the-Loop (HITL) | HITL is **not supported.**                                                                                                                         | **Supported** through the Agent Node and Tool Node's "Require Approval" feature, allowing human review and approval or rejection of tool execution.                                                                          |
| Complexity               | Higher level of abstraction; **simplifies workflow design.**                                                                                       | Lower level of abstraction; **more complex workflow design**, requiring careful planning of node interactions, custom State management, and conditional logic.                                                               |
| Ideal Use Cases          | • Automating linear processes (e.g., data extraction, lead generation).<br/>• Situations where sub-tasks need to be completed one after the other. | • Building conversational systems with dynamic flows.<br/>• Complex workflows requiring parallel node execution or branching logic.<br/>• Situations where decision-making is needed at multiple points in the conversation. |

## Choosing the Right System

Selecting the ideal system for your application depends on understanding your specific workflow needs. Factors like task complexity, the need for parallel processing, and your desired level of control over data flow are all key considerations.

-   **For simplicity:** If your workflow is relatively straightforward, where tasks can be completed one after the other and does not require parallel node execution or Human-in-the-Loop (HITL), the Multi-Agent approach offers ease of use and quick setup.
-   **For flexibility:** If your workflow needs parallel execution, dynamic conversations, custom State management, and the ability to incorporate HITL, the **Sequential Agent** approach provides the necessary flexibility and control.

:::info
**Note**: Even though Multi-Agent systems are technically a higher-level layer built upon the Sequential Agent architecture, they offer a distinct user experience and approach to workflow design. The comparison above treats them as separate systems to help you select the best option for your specific needs.
:::
