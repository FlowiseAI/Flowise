---
description: Use another chatflow as a tool in your workflow
---

# Chatflow Tool

## Overview

The Chatflow Tool allows you to use another chatflow as a tool within your current workflow. This feature enables you to leverage existing chatflows and incorporate their functionality into your current project, enhancing modularity and reusability.

## Key Benefits

-   Reuse existing chatflows as tools in new workflows
-   Enhance modularity and reduce redundancy in your projects
-   Easily integrate complex functionalities from other chatflows

## How to Use

1. Drag and drop the Chatflow Tool node onto your canvas.
2. Configure the node with the following settings:

    a. Select Chatflow: Choose the chatflow you want to use as a tool from the dropdown menu.

    b. Tool Name: Enter a name for this tool (e.g., "State of the Union QA").

    c. Tool Description: Provide a description of what the tool does. This helps the AI determine when to use this tool.

    d. Use Question from Chat: Toggle this option if you want to use the question from the chat as input to the selected chatflow.

    e. Custom Input: If not using the question from chat, you can specify a custom input here. Leave it empty to let the AI decide the input.

3. Optionally, connect a credential if you need to use API authentication for the selected chatflow.

4. Connect the Chatflow Tool node to other nodes in your workflow as needed.

<!-- TODO: Add a screenshot showing a configured Chatflow Tool node on the canvas -->

<figure><img src="/.gitbook/assets/screenshots/.png" alt="" /><figcaption><p>Chatflow Tool node  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose descriptive names and provide detailed descriptions for your Chatflow Tools to help the AI understand when to use them.
2. Avoid using a chatflow as a tool within itself to prevent infinite loops.
3. Consider using the "Use Question from Chat" option when you want the tool to dynamically respond to user input.
4. If you need consistent input for the tool, use the "Custom Input" field to provide a specific prompt or question.

## Troubleshooting

1. If the Chatflow Tool is not executing:

    - Ensure that the selected chatflow exists and is accessible.
    - Check if the required credentials are properly configured.

2. If you receive an error about calling the same chatflow:

    - Verify that you're not trying to use the current chatflow as a tool within itself.

3. If the tool's output is unexpected:
    - Review the description and input settings to make sure they align with the selected chatflow's purpose.
    - Test the selected chatflow independently to ensure it's functioning as expected.

Remember that the Chatflow Tool allows you to leverage the power of existing chatflows within new workflows, promoting code reuse and modular design in your AnswerAgentAI projects.
