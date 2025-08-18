---
description: Execute HTTP GET requests with the Requests Get tool
---

# Requests Get

## Overview

The Requests Get tool allows you to execute HTTP GET requests within your AnswerAgentAI workflows. This powerful feature enables your agents to interact with external APIs and retrieve data from specified URLs.

## Key Benefits

-   Seamlessly integrate external data sources into your workflows
-   Enhance your agents' capabilities by allowing them to fetch real-time information
-   Customize requests with headers for more complex API interactions

## How to Use

1. Locate the "Requests Get" node in the Tools section of the node palette.
2. Drag and drop the node onto your canvas to add it to your workflow.
3. Configure the node by setting the following parameters:
    - URL (optional): The exact URL to which the agent will make the GET request.
    - Description (optional): A prompt to guide the agent on when to use this tool.
    - Headers (optional): Any additional headers required for the GET request.

<!-- TODO: Add a screenshot showing the Requests Get node on the canvas with its configuration panel open -->
<figure><img src="/.gitbook/assets/screenshots/requestget.png" alt="" /><figcaption><p> Requests Get node   &#x26; Drop UI</p></figcaption></figure>

4. Connect the Requests Get node to other nodes in your workflow as needed.

## Tips and Best Practices

-   If you don't specify a URL, the agent will attempt to determine it from the AIPlugin if provided.
-   Use the Description field to provide context for when the agent should use this tool. This helps in creating more intelligent and context-aware workflows.
-   When working with APIs that require authentication, use the Headers field to include necessary authorization tokens or API keys.
-   Test your GET requests thoroughly to ensure they're returning the expected data before deploying your workflow.

## Troubleshooting

-   If you're not receiving the expected data, double-check the URL and ensure it's accessible and returning the correct information.
-   For APIs requiring authentication, verify that you've included the correct headers and that your authentication credentials are valid.
-   If the agent isn't using the Requests Get tool when expected, review and refine the Description field to provide clearer instructions.

Remember that the Requests Get tool is a powerful way to extend your AnswerAgentAI workflows by incorporating external data. Use it wisely to create more dynamic and informative agent interactions.
