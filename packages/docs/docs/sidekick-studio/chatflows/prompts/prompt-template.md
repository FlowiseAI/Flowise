---
description: Create and customize templates for language model prompts
---

# Prompt Template

## Overview

The Prompt Template node in AnswerAgentAI allows you to create structured templates for generating prompts for language models. This feature enables you to design reusable prompt structures with placeholders for dynamic content, making it easier to create consistent and customizable prompts for various use cases.

## Key Benefits

-   Standardize prompt structures for consistent outputs
-   Easily incorporate dynamic content into your prompts
-   Improve efficiency by reusing prompt templates across different workflows

## How to Use

1. Add the Prompt Template node to your AnswerAgentAI canvas.
2. Configure the template:
   a. In the "Template" field, enter your prompt structure with placeholders in curly braces, e.g., `{placeholder}`.
   b. (Optional) In the "Format Prompt Values" field, provide JSON data for the placeholders.

3. Connect the Prompt Template node to other nodes in your workflow.

<!-- TODO: Screenshot of the Prompt Template node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/prompt.png" alt="" /><figcaption><p> Prompt Template Node &#x26; Drop UI</p></figcaption></figure>

### Example Template

```
What is a good name for a company that makes {product}?
```

### Example Format Prompt Values (JSON)

```json
{
    "product": "eco-friendly water bottles"
}
```

## Tips and Best Practices

1. Use descriptive placeholder names to make your templates more readable and maintainable.
2. Keep your templates modular and reusable by focusing on specific prompt structures.
3. Use the "Format Prompt Values" field to test your template with sample data before integrating it into your workflow.
4. Consider creating a library of commonly used prompt templates for quick access and consistency across projects.

## Troubleshooting

1. Invalid JSON error: Ensure that the JSON in the "Format Prompt Values" field is correctly formatted. Use a JSON validator if needed.
2. Missing placeholder values: Check that all placeholders in your template have corresponding values in the JSON data or connected nodes.

## Use Cases and Examples

### 1. Product Naming

Template:

```
Generate 5 creative names for a {product_type} that emphasizes its {key_feature}. The target audience is {target_audience}.
```

Format Prompt Values:

```json
{
    "product_type": "smartphone",
    "key_feature": "long battery life",
    "target_audience": "busy professionals"
}
```

### 2. Customer Support Response

Template:

```
You are a customer support representative for {company_name}. Craft a polite and helpful response to the following customer inquiry:

Customer: {customer_inquiry}

Your response should address the customer's concern and provide a solution if possible. If you need more information, ask for it politely.
```

Format Prompt Values:

```json
{
    "company_name": "TechGadgets Inc.",
    "customer_inquiry": "I received my new smartwatch yesterday, but I can't figure out how to pair it with my phone. Can you help?"
}
```

### 3. Content Summarization

Template:

```
Summarize the following {content_type} in {word_count} words or less, focusing on the main points and key takeaways:

{content}
```

Format Prompt Values:

```json
{
    "content_type": "research paper",
    "word_count": 150,
    "content": "... (full text of the research paper) ..."
}
```

## Difference from Chat Prompt Template

The Prompt Template node differs from the Chat Prompt Template in several key aspects:

1. Structure: Prompt Template is designed for single-turn interactions, while Chat Prompt Template is optimized for multi-turn conversations.

2. Use case: Use Prompt Template for generating standalone prompts, such as content creation or single-query tasks. Use Chat Prompt Template for building conversational flows or maintaining context across multiple exchanges.

3. Placeholder handling: Prompt Template uses simple `{placeholder}` syntax, while Chat Prompt Template may have more complex structures for handling user and system messages.

4. Output: Prompt Template generates a single prompt string, whereas Chat Prompt Template typically produces a structured chat history or message array.

Choose the Prompt Template when you need a straightforward, single-turn prompt generation, and opt for the Chat Prompt Template when building more complex, conversational interactions.
