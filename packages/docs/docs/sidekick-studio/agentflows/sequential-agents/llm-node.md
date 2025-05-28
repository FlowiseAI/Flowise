---
description: Understanding the LLM Node in Sequential Agents
---

# LLM Node

The LLM Node is a **specialized node that leverages language models to generate responses** based on conversation context. Unlike the Agent Node, the LLM Node does not make autonomous decisions about when to use tools or execute external actions. Instead, it focuses on generating high-quality text responses with flexible output formatting options.

<!-- ![](../../assets/seq-06.png) -->

## Understanding the LLM Node

The LLM Node processes input from previous nodes, including the conversation history `state.messages` and any custom State, and uses a language model to generate a response based on a System Prompt and optional configuration settings. It is particularly useful for:

-   **Generating responses when no external tools are required**
-   **Processing, analyzing, or transforming data** in the State
-   **Creating structured outputs** in JSON format for consumption by other nodes

## Inputs

|                               | Required | Description                                                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| System Prompt                 | **Yes**  | Text prompt that **defines the LLM's role and response parameters**.                                               |
| Chat Model                    | No       | A custom **Chat Model (LLM)** to use instead of the default one defined in the Start Node.                         |
| JSON Schema                   | No       | A schema defining the structure of the LLM Node's response when JSON Structured Output is enabled.                 |
| Enable JSON Structured Output | No       | A configuration to **force the LLM Node's response to follow** a predefined JSON schema.                           |
| Update State                  | No       | A JSON object that defines **how the LLM Node should update the custom State** before passing it to the next node. |

## Outputs

The LLM Node can connect to the following nodes as outputs:

-   **Agent Node:** Connects to an Agent Node to continue the conversation with an agent that can access tools.
-   **LLM Node:** Routes the conversation flow to another LLM Node for additional processing or response generation.
-   **Condition Agent Node:** Connects to a Condition Agent Node to implement branching logic based on the agent's evaluation of the conversation.
-   **Condition Node:** Connects to a Condition Node to implement branching logic based on predefined conditions.
-   **Loop Node:** Connects to a Loop Node to implement repetitive processes based on specific conditions.
-   **End Node:** Connects to an End Node to conclude the conversational flow.

## Features

### JSON Structured Output

When the "Enable JSON Structured Output" option is enabled, the LLM Node can generate responses that conform to a predefined JSON schema. This is particularly useful when:

-   You need to extract **specific data points** from the LLM's analysis
-   Downstream nodes require **structured input** for processing
-   You want to ensure **consistent response formats** for various user queries

For example, if you're building a customer inquiry workflow, you might define a JSON schema that extracts the customer's issue type, urgency level, and relevant product information from their message.

### State Management

The LLM Node can update the custom State based on the insights or analysis it generates. This allows the LLM Node to pass valuable information to subsequent nodes in the workflow without exposing that information directly to the user.

For example, an LLM Node might analyze a customer's sentiment and add a "sentimentScore" to the custom State, which a Condition Node could then use to route the conversation to different support agents based on the detected sentiment.

## Best Practices

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="pro-tips" label="Pro Tips">
    **Clear system prompt**

    Craft a concise and unambiguous System Prompt that accurately reflects the LLM Node's role and capabilities. This guides the LLM Node's decision-making and ensures it acts within its defined scope.

    **Optimize for structured output**

    Keep your JSON schemas as straightforward as possible, focusing on the essential data elements. Only enable JSON Structured Output when you need to extract specific data points from the LLM's response or when downstream nodes require JSON input.

    **Strategic tool selection**

    Choose and configure the tools available to the LLM Node (via the Tool Node), based on the specific tasks it needs to perform. Avoid providing too many tools, which can lead to confusion and inefficiency.

  </TabItem>
  <TabItem value="pitfalls" label="Potential Pitfalls">
    **Overly complex JSON schemas**

    * **Problem:** The JSON schema defined for the LLM Node's output is unnecessarily complex, making it difficult for the LLM to generate responses that match the schema or for downstream nodes to process the output efficiently.
    * **Example:** You create a schema with many nested objects, optional fields, and arrays of complex objects, leading to inconsistent or incorrect outputs and difficulties in processing the data.
    * **Solution:** Simplify your JSON schemas to focus on the essential data points. Define clear, flat structures whenever possible, and only use nested objects or arrays when necessary.

    **Inadequate system prompting**

    * **Problem:** The System Prompt doesn't provide enough guidance for the LLM to generate the desired output, especially when trying to produce structured data or provide a specific type of analysis.
    * **Example:** Your prompt simply says "Analyze the user's message," which doesn't specify what kind of analysis to perform or what output format to use.
    * **Solution:** Be specific about what you want the LLM to analyze, how it should present its findings, and any constraints it should consider. For example: "Analyze the user's message for signs of customer dissatisfaction. Identify the specific product or service mentioned, the nature of the issue, and the customer's emotional state, then provide a concise summary."

  </TabItem>
</Tabs>
