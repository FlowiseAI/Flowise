---
description: Understanding the Loop Node in Sequential Agents
---

# Loop Node

The Loop Node is a **specialized node that enables repetitive processes** within the Sequential Agent workflow, allowing a sequence of nodes to be executed multiple times until a specific condition is met. This enables iterative refinement, information gathering, or step-by-step task completion.

<!-- ![](../../assets/seq-11.png) -->

## Understanding the Loop Node

The Loop Node acts as a control mechanism, creating a cyclic path within the graph that can be traversed multiple times. It evaluates a condition each time and determines whether to:

-   **Continue the loop:** Proceed to the nodes within the loop for another iteration
-   **Exit the loop:** Move on to the node connected to the "Exit" output when a termination condition is met

This functionality is particularly valuable for workflows that require:

-   **Incremental problem-solving:** Breaking down complex tasks into smaller, repeated steps
-   **Information gathering:** Collecting multiple pieces of information through a series of related questions
-   **Refinement processes:** Iteratively improving a response or output until it meets certain criteria
-   **Hierarchical conversations:** Exploring topics in depth before returning to higher-level discussion

## Inputs

|                | Required | Description                                                                                                                                                                                                                                  |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loop Condition | **Yes**  | A **JavaScript expression** that will be evaluated at the beginning of each loop iteration to determine whether to continue looping or exit. This expression should evaluate to either `true` (continue looping) or `false` (exit the loop). |
| Max Iterations | No       | An optional **maximum number of iterations** to prevent infinite loops. If not specified, a default limit is applied as a safety measure.                                                                                                    |

## Outputs

The Loop Node has two possible output connections:

-   **Loop:** This path is followed when the loop condition evaluates to `true`, directing the flow to the nodes within the loop.
-   **Exit:** This path is followed when the loop condition evaluates to `false` or the maximum number of iterations is reached, directing the flow to continue beyond the loop.

## Features

### Conditional Looping with JavaScript Expressions

Like the Condition Node, the Loop Node uses JavaScript expression evaluation to determine whether to continue looping. This provides tremendous flexibility, allowing you to:

-   **Access any part of the State** using dot notation (e.g., `state.itemsToProcess.length > 0`)
-   **Track iteration counts** using custom State variables (e.g., `state.iterationCount < 5`)
-   **Check for completion criteria** in the custom State (e.g., `!state.allRequiredInfoCollected`)
-   **Examine conversation history** to make loop decisions (e.g., `state.messages.find(m => m.includes("stop"))`)

### Iteration Safeguards

To prevent infinite loops, the Loop Node includes safeguards:

-   **Explicit maximum iterations:** Allows you to set a specific limit based on your workflow's needs
-   **Default maximum:** Applies a reasonable limit if none is specified
-   **Early exit:** Allows breaking out of the loop based on the condition, even before reaching the maximum iterations

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Clear loop purpose**

    Define a clear purpose for each loop in your workflow. If possible, document with a sticky note what you're trying to achieve with the loop.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Confusing workflow structure**

    * **Problem:** Excessive or poorly designed loops make the workflow difficult to understand and maintain.
    * **Example:** You use multiple nested loops without clear purpose or labels, making it hard to follow the flow of the conversation.
    * **Solution:** Use loops sparingly and only when necessary. Clearly document each loop's purpose and termination condition. Consider using descriptive names or annotations to indicate the loop's function in the workflow.

    **Infinite or excessive looping**

    * **Problem:** The loop condition never evaluates to `false`, or the condition isn't correctly set up to terminate the loop appropriately, leading to repetitive or stuck conversations.
    * **Example:** Your loop condition checks for a specific value in the custom State, but that value is never updated within the loop, causing the workflow to reach the maximum iteration limit repeatedly.
    * **Solution:** Ensure that the loop condition is based on values that are updated within the loop's execution path. Set appropriate maximum iteration limits based on the expected loop behavior. Include debugging state variables to track the loop's progress and help diagnose issues.

    **State management gaps**

    * **Problem:** The custom State isn't properly updated within the loop, leading to incorrect loop behavior or loss of information.
    * **Example:** You collect user preferences in each loop iteration, but overwrite previous preferences instead of appending to a list, resulting in only the last preference being saved.
    * **Solution:** Carefully plan how the State will be modified in each iteration. Use appropriate data structures (arrays, objects) to accumulate information across iterations. Consider adding timestamp or sequence information to track the order of updates.

  </TabItem>
</Tabs>
