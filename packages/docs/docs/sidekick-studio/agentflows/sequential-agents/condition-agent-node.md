---
description: Understanding the Condition Agent Node in Sequential Agents
---

# Condition Agent Node

The Condition Agent Node is a specialized node that utilizes an LLM Agent to make nuanced, context-aware decisions about the conversation flow. Unlike the Condition Node, which uses static JavaScript expressions, the Condition Agent Node leverages the reasoning capabilities of a language model to dynamically analyze the conversation, extract insights, and determine the appropriate branch for the workflow.

<!-- ![](../../assets/seq-16.png) -->

## Understanding the Condition Agent Node

The Condition Agent Node combines aspects of the Agent Node and the Condition Node, offering a higher level of cognitive processing for branching decisions. It's particularly valuable when:

-   The decision-making criteria are complex or subjective, requiring nuanced understanding of language and context
-   The rules for branching cannot be easily expressed as simple conditional statements
-   The decision should take into account the full conversation history and subtle user cues
-   Human-like reasoning is needed to determine the best path forward

For example, a Condition Agent Node might assess whether a customer's issue requires escalation to a supervisor, determine which product category a user is most interested in, or decide if a user's query is related to sales or technical support.

## Inputs

|                               | Required | Description                                                                                                                                                                          |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| System Prompt                 | **Yes**  | A text prompt that defines the Agent's role in making the decision. It should clearly outline the decision-making criteria and the types of outputs expected.                        |
| Tools                         | No       | The Tool Nodes that the Condition Agent Node can access and execute, each offering specific functionality to retrieve information or perform actions that might aid in the decision. |
| Chat Model                    | No       | A custom Chat Model (LLM) to use instead of the default one defined in the Start Node.                                                                                               |
| JSON Schema                   | No       | A schema defining the structure of the Condition Agent Node's response when JSON Structured Output is enabled.                                                                       |
| Enable JSON Structured Output | No       | A configuration to force the Condition Agent Node's response to follow a predefined JSON schema.                                                                                     |
| Update State                  | No       | A JSON object that defines how the Condition Agent Node should update the custom State before passing it to the next node.                                                           |

## Outputs

The Condition Agent Node has two possible output connections:

-   **True:** This path is followed when the agent determines the condition is true.
-   **False:** This path is followed when the agent determines the condition is false.

## Features

### LLM-Powered Decision Making

The Condition Agent Node uses a language model to make decisions based on:

-   Natural language understanding of the conversation context
-   Reasoning and inference about user intentions, needs, or preferences
-   Pattern recognition in user behavior or conversation flow
-   Decision criteria outlined in the System Prompt

This allows for much more sophisticated branching logic than would be possible with simple conditional expressions.

### JSON Structured Output for Clear Decisions

To ensure reliable and consistent decision-making, the Condition Agent Node typically uses JSON Structured Output with a schema that explicitly captures the decision outcome. A simple schema might look like:

```json
{
    "type": "object",
    "properties": {
        "decision": {
            "type": "boolean",
            "description": "The decision outcome (true or false)"
        },
        "reasoning": {
            "type": "string",
            "description": "Explanation for why this decision was made"
        }
    },
    "required": ["decision", "reasoning"]
}
```

### State Updates for Contextual Information

In addition to making a decision, the Condition Agent Node can update the custom State to include its reasoning, extracted information, or other contextual details that might be useful for downstream nodes. This allows the decision-making process to contribute to the overall workflow, not just determine its path.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Craft a clear and focused system prompt**

    Provide a well-defined persona and clear instructions to the agent in the System Prompt. This will guide its reasoning and help it generate relevant output for the conditional logic.

    **Structure output for reliable conditions**

    Use the JSON Structured Output feature to define a schema for the Condition Agent's output. This will ensure that the output is consistent and easily parsable, making it more reliable for use in conditional evaluations.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Unreliable routing due to unstructured output**

    * **Problem:** The Condition Agent's output is not properly structured or doesn't consistently provide a clear decision value, leading to unreliable or unpredictable routing in the workflow.
    * **Example:** The System Prompt asks the agent to "determine if the user is interested in premium products" without specifying how to format the output, resulting in verbose text responses that don't clearly indicate true or false.
    * **Solution:** Enable JSON Structured Output and define a clear schema with a boolean decision field. In the System Prompt, emphasize the importance of providing a definitive true/false decision based on specific criteria.

    **Ambiguous decision criteria**

    * **Problem:** The System Prompt doesn't provide clear criteria for the agent to make decisions, leading to inconsistent or subjective routing.
    * **Example:** The prompt simply states "route the conversation based on user needs" without defining how to identify different types of needs or which ones should route to which path.
    * **Solution:** Provide explicit decision criteria in the System Prompt, outlining the factors the agent should consider and how they should be weighted. For example: "Determine if the user needs technical support (route to TRUE) or has a billing inquiry (route to FALSE). Technical support queries typically mention product functionality, errors, or how-to questions, while billing inquiries involve payments, subscriptions, or pricing."

    **Overcomplex reasoning**

    * **Problem:** The agent engages in unnecessary reasoning or analysis, making the decision process slower and more prone to errors or inconsistencies.
    * **Example:** For a simple routing decision (e.g., "Is this a support request?"), the agent performs an exhaustive analysis of the conversation, considering multiple factors that aren't relevant to the decision.
    * **Solution:** Focus the System Prompt on the specific decision the agent needs to make, emphasizing efficiency and directness. Limit the scope of analysis to only the relevant factors. Consider using a simpler Condition Node if the decision criteria can be expressed as a straightforward conditional expression.

  </TabItem>
</Tabs>
