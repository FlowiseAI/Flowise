---
description: Create customizable chat prompt templates for your AI workflows
---

# Chat Prompt Template

## Overview

The Chat Prompt Template node allows you to create structured prompts for chat-based AI interactions. It combines a system message and a human message to guide the AI's behavior and provide context for the conversation.

## Key Benefits

-   Customize AI behavior with specific system instructions
-   Create reusable templates for consistent chat interactions
-   Easily incorporate dynamic values into your prompts

## How to Use

1. Add the Chat Prompt Template node to your AnswerAI canvas.
2. Configure the node with the following inputs:

    a. System Message:

    - Enter the instructions or context for the AI assistant.
    - Use curly braces {} to denote variables (e.g., \{input_language\}).

    b. Human Message:

    - Enter the template for the user's input.
    - Use curly braces {} to denote variables (e.g., \{text\}).

    c. Format Prompt Values (optional):

    - Provide a JSON object with key-value pairs for the variables used in your prompts.

3. Connect the Chat Prompt Template node to other nodes in your workflow.

<!-- TODO: Add a screenshot of the Chat Prompt Template node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/chatprompttemplate.png" alt="" /><figcaption><p> Chat Prompt Template Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   Use clear and specific language in your system message to guide the AI's behavior effectively.
-   Keep your human message template simple and focused on the core input you want to process.
-   When using variables, ensure that the keys in your Format Prompt Values JSON match the variable names in your prompts.
-   Test your prompt template with various inputs to ensure it produces the desired results consistently.

## Troubleshooting

1. Issue: Invalid JSON error in Format Prompt Values
   Solution: Ensure that your JSON is properly formatted. Use double quotes for keys and string values, and avoid trailing commas.

2. Issue: Variables not being replaced in the prompt
   Solution: Double-check that the variable names in your prompts match the keys in your Format Prompt Values JSON exactly.

## Example Usage

Here's an example of how to set up a Chat Prompt Template for a language translation assistant:

System Message:

```
You are a helpful assistant that translates \{input_language\} to \{output_language\}.
```

Human Message:

```
\{text\}
```

Format Prompt Values:

```json
{
    "input_language": "English",
    "output_language": "Spanish",
    "text": "Hello, how are you?"
}
```

This setup will create a prompt that instructs the AI to act as a translator from English to Spanish, with the text "Hello, how are you?" as the input to be translated.

<!-- TODO: Add a screenshot of a completed Chat Prompt Template node connected to other nodes in a workflow -->
<figure><img src="/.gitbook/assets/screenshots/chatpromptnodeinaworkflow.png" alt="" /><figcaption><p> Chat Prompt Template Node In Workflow &#x26; Drop UI</p></figcaption></figure>

By using the Chat Prompt Template node, you can create flexible and powerful prompts that adapt to various use cases in your AnswerAI workflows.
