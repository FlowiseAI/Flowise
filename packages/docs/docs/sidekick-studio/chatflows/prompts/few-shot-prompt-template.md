---
description: Build prompt templates with examples using the Few Shot Prompt Template node
---

# Few Shot Prompt Template

## Overview

The Few Shot Prompt Template node allows you to create dynamic prompt templates with examples. This powerful feature enables you to guide the AI's responses by providing sample inputs and outputs, making it especially useful for tasks that require specific formatting or reasoning patterns.

## Key Benefits

-   Improve AI response consistency by providing examples
-   Customize prompts for specific use cases or domains
-   Enhance the quality of AI-generated content by demonstrating desired outputs

## How to Use

1. Add the "Few Shot Prompt Template" node to your AnswerAgentAI canvas.
2. Configure the node with the following inputs:

    a. Examples: Provide a JSON array of example input-output pairs.
    b. Example Prompt: Connect a Prompt Template node to define the structure of each example.
    c. Prefix: Add text that appears before the examples (optional).
    d. Suffix: Add text that appears after the examples, including input variables.
    e. Example Separator: Specify how to separate multiple examples (default is two newlines).
    f. Template Format: Choose between "f-string" (default) or "jinja-2" formatting.

3. Connect the Few Shot Prompt Template node to other nodes in your workflow, such as a language model or chain.

## Tips and Best Practices

-   Provide diverse examples to cover various scenarios your AI might encounter.
-   Keep your examples concise and relevant to the task at hand.
-   Experiment with different prefix and suffix texts to find the most effective prompt structure.
-   Use the Example Separator to control the visual spacing between examples.

## Troubleshooting

-   If you encounter an "Invalid JSON" error, double-check the format of your Examples input.
-   Ensure that the Example Prompt template matches the structure of your provided examples.
-   Verify that all required input variables are included in the Suffix.

## Example Use Cases

### 1. Antonym Generator

```javascript
{
  "examples": [
    { "word": "happy", "antonym": "sad" },
    { "word": "tall", "antonym": "short" },
    { "word": "rich", "antonym": "poor" }
  ],
  "examplePrompt": "Word: {word}\nAntonym: {antonym}",
  "prefix": "Generate antonyms for the following words:",
  "suffix": "Word: {input}\nAntonym:",
  "exampleSeparator": "\n\n"
}
```

This setup creates a prompt template that demonstrates how to generate antonyms, then asks for the antonym of a new input word.

### 2. Customer Support Response Generator

```javascript
{
  "examples": [
    {
      "query": "How do I reset my password?",
      "response": "To reset your password, please follow these steps:\n1. Go to the login page\n2. Click on 'Forgot Password'\n3. Enter your email address\n4. Follow the instructions sent to your email"
    },
    {
      "query": "What are your business hours?",
      "response": "Our customer support is available 24/7. Our physical stores are open Monday to Friday, 9 AM to 6 PM, and Saturday 10 AM to 4 PM. We are closed on Sundays and public holidays."
    }
  ],
  "examplePrompt": "Customer: {query}\n\nSupport Agent: {response}",
  "prefix": "You are a helpful customer support agent. Respond to the customer query based on the following examples:",
  "suffix": "Customer: {input}\n\nSupport Agent:",
  "exampleSeparator": "\n\n---\n\n"
}
```

This setup creates a prompt template that demonstrates how to respond to customer queries in a consistent and helpful manner.

### 3. Code Comment Generator

````javascript
{
  "examples": [
    {
      "code": "def factorial(n):\n    if n == 0:\n        return 1\n    else:\n        return n * factorial(n-1)",
      "comment": "This function calculates the factorial of a given number using recursion."
    },
    {
      "code": "for i in range(10):\n    print(i)",
      "comment": "This loop prints numbers from 0 to 9."
    }
  ],
  "examplePrompt": "Code:\n```python\n{code}\n```\n\nComment: {comment}",
  "prefix": "Generate a brief comment explaining the following code snippets:",
  "suffix": "Code:\n```python\n{input}\n```\n\nComment:",
  "exampleSeparator": "\n\n"
}
````

This setup creates a prompt template that demonstrates how to generate concise and informative comments for Python code snippets.

<!-- TODO: Add a screenshot showing the Few Shot Prompt Template node configuration panel with one of the example use cases filled in -->
<figure><img src="/.gitbook/assets/screenshots/fewshotprompt.png" alt="" /><figcaption><p> Few Shot Template Node Configuration &#x26; Drop UI</p></figcaption></figure>

By using these example configurations, you can create powerful Few Shot Prompt Templates tailored to various tasks and domains in AnswerAgentAI.
