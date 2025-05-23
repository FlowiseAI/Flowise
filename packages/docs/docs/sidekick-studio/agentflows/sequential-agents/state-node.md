---
description: Understanding the State Node in Sequential Agents
---

# State Node

The State Node, which can only be connected to the Start Node, **provides a mechanism to set a user-defined or custom State** into our workflow from the start of the conversation. This custom State is a JSON object that is shared and can be updated by nodes in the graph, passing from one node to another as the flow progresses.

<!-- ![](../../assets/seq-04.png) -->

## Understanding the State Node

By default, the State includes a `state.messages` array, which acts as our conversation history. This array stores all messages exchanged between the user and the agents, or any other actors in the workflow, preserving it throughout the workflow execution.

Since by definition this `state.messages` cannot be directly manipulated or overwritten, the **State Node allows us to** augment this default State **by adding our own custom attributes** to the top level of the State object (alongside `state.messages`), enabling us to track and manage workflow-specific information.

**For example**, let's consider a workflow where we want to track the user's language preferences, usage statistics, and product inquiries:

```
{
  "messages": [...],  // Conversation history - implicit
  "userSettings": {   // Custom State - defined by the State Node
    "preferredLanguage": "English",
    "productInquiries": ["Laptop", "Smartphone"],
    "usageMetrics": {
      "totalInteractions": 5,
      "lastInteractionDate": "2023-11-20"
    }
  }
}
```

In addition to the conversation history in the `messages` array, our workflow now has access to the custom State properties encapsulated under the `userSettings` object.

## Inputs

|               | Required | Description                                                                                   |
| ------------- | -------- | --------------------------------------------------------------------------------------------- |
| Initial State | **Yes**  | A JSON object that defines the custom State that will be **added to the conversation state**. |

## Outputs

The State Node has no direct outputs. Instead, it connects to the Start Node as its input, making the custom State available to all subsequent nodes in the workflow.

## Dynamics of the State

Think of the State as a package of information that **flows through the nodes in our Sequential Agent workflow**. Each node can inspect the package and either:

1. **Use the information** contained in the State to make decisions or generate responses, or
2. **Update the information** by modifying existing properties or adding new ones, all while preserving the `messages` array.

As the State passes from one node to the next, these modifications are carried forward, enabling cumulative and progressive data management throughout the workflow. For example, an Agent Node might add interview responses to the State, an LLM Node can analyze that information, and a Condition Node can use it to determine the next steps.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Use structured data**

    Design your custom State with well-organized, nested objects rather than flat key-value pairs. This approach promotes clarity and scalability, making it easier to manage and evolve your State as your workflow grows more complex.

    **Consistent naming conventions**

    Adopt clear, descriptive naming conventions for your State properties. This enhances readability and helps maintain consistency throughout your workflow, especially when multiple team members are involved.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Setting unnecessarily complex initial state**

    * **Problem:** The initial State defined in the State Node is overly complex or contains redundant information, leading to confusion, processing overhead, and difficulty in maintaining the workflow.
    * **Example:** You create a State with deeply nested objects and arrays that are not actually needed by any nodes in the workflow, complicating debugging and increasing the risk of errors.
    * **Solution:** Start with a minimalist approach to your State design. Define only the essential properties that your workflow needs and gradually expand as required. Regularly review your State structure to identify and remove unused or redundant properties.

    **Not planning for state updates**

    * **Problem:** Initial State is defined without considering how and where it will be updated, leading to inconsistent or unexpected behaviors in the workflow.
    * **Example:** You define a `userPreferences` object in the initial State but don't properly plan which nodes will update this object or how updates will be made, resulting in overwritten preferences or conflicts.
    * **Solution:** Map out the complete lifecycle of each State property, including where it's initialized, updated, and consumed. Document which nodes are responsible for updating specific parts of the State to avoid conflicts and ensure consistency. Consider using more granular objects or adding version tracking to manage updates more effectively.

    **Overwriting or overriding critical properties**

    * **Problem:** Custom State properties unintentionally override or conflict with system-defined properties or functions, causing the workflow to malfunction.
    * **Example:** You define a `messages` property in your custom State, which conflicts with the system's `state.messages` array, leading to loss of conversation history or errors in message handling.
    * **Solution:** Avoid using property names that might conflict with system-defined properties (like `messages`). If your custom State needs to track message-related data, use a different name or nest it under a unique property. Review the system documentation to understand what property names are reserved or have special meanings.

  </TabItem>
</Tabs>
