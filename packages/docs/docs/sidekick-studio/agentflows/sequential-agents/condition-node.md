---
description: Understanding the Condition Node in Sequential Agents
---

# Condition Node

The Condition Node is a **specialized node that enables branching logic in Sequential Agent workflows**. It evaluates a condition based on the current State (conversation history and custom State) and directs the flow to one of two possible output paths depending on whether the condition is true or false.

<!-- ![](../../assets/seq-15.png) -->

## Understanding the Condition Node

The Condition Node acts as a decision point in your workflow, allowing different execution paths based on:

-   The **content of the conversation** (from `state.messages`)
-   **Custom State variables** updated by previous nodes
-   **User inputs** or preferences
-   **Results of previous operations** or tool executions

For example, a Condition Node might check if the user has provided their contact information, if a certain product is in stock, or if a user's sentiment is positive or negative, and then direct the conversation flow accordingly.

## Inputs

|                 | Required | Description                                                                                                                                          |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Condition Value | **Yes**  | A **JavaScript expression** that will be evaluated to determine which branch to follow. This expression should evaluate to either `true` or `false`. |

## Outputs

The Condition Node has two possible output connections:

-   **True:** This path is followed when the condition evaluates to `true`.
-   **False:** This path is followed when the condition evaluates to `false`.

## Features

### JavaScript Expression Evaluation

The Condition Node uses JavaScript expression evaluation to determine which path to take. This provides tremendous flexibility, allowing you to:

-   **Access any part of the State** using dot notation (e.g., `state.userDetails.age > 18`)
-   **Perform comparisons** using operators (`===`, `>`, `<`, etc.)
-   **Use logical operators** for complex conditions (`&&`, `||`, `!`)
-   **Call JavaScript methods** on strings, arrays, or objects (e.g., `state.products.some(p => p.category === 'Electronics')`)

### Dynamic Workflow Routing

The Condition Node enables dynamic routing of the conversation flow, creating personalized user experiences based on various factors:

-   **User preferences or characteristics** stored in the custom State
-   **Conversation context** derived from the messages array
-   **External data** retrieved by Tool Nodes
-   **Progress markers** indicating completion of specific steps

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Clear condition naming**

    Use descriptive names for your conditions (e.g., "If user is under 18, then Policy Advisor Agent", "If order is confirmed, then End Node") to make your workflow easier to understand and debug.

    **Prioritize simple conditions**

    Start with simple conditions and gradually add complexity as needed. This makes your workflow more manageable and reduces the risk of errors.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Mismatched condition logic and workflow design**

    * **Problem:** The conditions you define in the Condition Node don't align with the actual structure or purpose of your workflow, leading to unexpected or illogical conversation paths.
    * **Example:** You create a condition that checks if the user's age is over 18, but the workflow doesn't collect age information in any preceding nodes, resulting in the condition always evaluating to `false`.
    * **Solution:** Ensure that the information needed for condition evaluation is collected or created in preceding nodes. Map out the data flow of your workflow to identify any missing links or incorrect assumptions.

    **Overly complex condition expressions**

    * **Problem:** The JavaScript expression used for the condition is too complex, making it difficult to understand, debug, or maintain.
    * **Example:** You write a multi-line nested condition with complex object traversals, array filters, and multiple logical operators, making it almost impossible to predict its behavior in all scenarios.
    * **Solution:** Break down complex conditions into simpler parts, potentially using multiple Condition Nodes in sequence. Consider moving complex logic to an LLM Node or Agent Node that can simplify the evaluation criteria and update the State accordingly.

    **Undefined or null value handling**

    * **Problem:** The condition doesn't account for undefined or null values, leading to unexpected or default behaviors.
    * **Example:** Your condition checks `state.userPreference.color === 'blue'` without first verifying if `state.userPreference` exists, potentially causing an error.
    * **Solution:** Include checks for undefined or null values in your conditions, or ensure that all necessary State properties are initialized with default values before they're accessed. For example: `state.userPreference && state.userPreference.color === 'blue'`.

  </TabItem>
</Tabs>
