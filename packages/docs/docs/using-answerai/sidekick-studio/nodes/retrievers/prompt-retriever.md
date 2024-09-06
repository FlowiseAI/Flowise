---
description: Store and retrieve prompt templates for specialized tasks
---

# Prompt Retriever

## Overview

The Prompt Retriever node allows you to store prompt templates with a name and description, which can be later queried and used by the MultiPromptChain. This node is particularly useful for organizing and managing multiple specialized prompts for different tasks or domains.

## Key Benefits

-   Easily organize and manage multiple prompt templates
-   Streamline the process of using specialized prompts for different tasks
-   Improve the efficiency and accuracy of your AI workflows

## How to Use

1. Add the Prompt Retriever node to your canvas in the AnswerAI Studio.
2. Configure the node by filling in the following fields:

    a. Prompt Name: Enter a unique name for your prompt template (e.g., "physics-qa").

    b. Prompt Description: Provide a brief description of what the prompt does and when it should be used (e.g., "Good for answering questions about physics").

    c. Prompt System Message: Enter the system message that sets the context and behavior for the AI model (e.g., "You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.").

3. Connect the Prompt Retriever node to other nodes in your workflow, such as the MultiPromptChain node.

<!-- TODO: Add a screenshot showing the Prompt Retriever node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/promptretreiver.png" alt="" /><figcaption><p> Prompt Retreiver  Node &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Use descriptive and specific names for your prompt templates to easily identify them later.
2. Write clear and concise descriptions that explain the purpose and ideal use case for each prompt.
3. Craft system messages that effectively guide the AI model's behavior and expertise for the specific task.
4. Create multiple Prompt Retriever nodes for different domains or tasks to build a comprehensive library of specialized prompts.
5. Regularly review and update your prompt templates to improve their effectiveness over time.

## Troubleshooting

1. If your prompt is not being retrieved correctly:

    - Double-check that the Prompt Name is correctly spelled and matches the name used in the MultiPromptChain node.
    - Ensure that the Prompt Retriever node is properly connected to the MultiPromptChain node in your workflow.

2. If the AI responses are not as expected:

    - Review and refine your Prompt System Message to provide clearer instructions or context to the AI model.
    - Consider adjusting the Prompt Description to better match the intended use case.

3. If you're experiencing performance issues:
    - Try to keep your system messages concise while still providing necessary context.
    - Avoid creating too many Prompt Retriever nodes in a single workflow, as this may impact performance.

By using the Prompt Retriever node effectively, you can create a powerful and flexible system for managing specialized prompts in your AnswerAI workflows, enhancing the capabilities and accuracy of your AI-powered applications.
