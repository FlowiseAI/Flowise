---
description: Create custom tools to extend AnswerAI's capabilities
---

# Custom Tool

Custom Tools allow you to add custom JavaScript functions to interact with APIs that are not natively supported by AnswerAI. This feature enables you to extend the functionality of your workflows and integrate with a wide range of external services.

## Overview

The Custom Tool node allows you to write JavaScript code that can be executed as part of your workflow. This is particularly useful when you need to interact with APIs or services that don't have a pre-built node in AnswerAI.

## Key Benefits

-   Extend AnswerAI's functionality with custom integrations
-   Interact with any API or service using JavaScript
-   Flexibility to implement complex logic and data processing

## How to Use

1. Add a Custom Tool node to your canvas.
2. Configure the tool with a name, description, and input schema (if required).
3. Write your JavaScript function in the provided code editor.
4. Connect the Custom Tool node to other nodes in your workflow.

## Example: Fetching Data from an API

Here's a simple example of how to create a Custom Tool that fetches data from a public API:

```javascript
const fetch = require('node-fetch')

const url = 'https://api.example.com/data'

try {
    const response = await fetch(url)
    const data = await response.json()
    return JSON.stringify(data)
} catch (error) {
    console.error('Error fetching data:', error)
    return JSON.stringify({ error: 'Failed to fetch data' })
}
```

This example uses the `node-fetch` library, which is available by default in Custom Tools. It fetches data from a hypothetical API and returns the result as a JSON string.

## Tips and Best Practices

1. Use `try-catch` blocks to handle errors gracefully.
2. Return data as a string to ensure compatibility with other nodes.
3. Use `console.log()` for debugging, but remember to remove or comment out these lines in production.
4. When working with APIs that require authentication, consider using environment variables to store sensitive information like API keys.

## Troubleshooting

-   If your Custom Tool is not executing, check that it's properly connected in the workflow.
-   Ensure that any external libraries you're using are supported by AnswerAI. You can find a list of supported libraries in the AnswerAI documentation.
-   If you're getting unexpected results, use `console.log()` statements to debug your code and check the AnswerAI logs for output.

For more detailed information on building custom tools, including how to work with input schemas and advanced use cases, please refer to the [Interacting with APIs documentation](../../../developers/use-cases/interacting-with-api.md).

<!-- TODO: Add a screenshot showing the Custom Tool node configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/.png" alt="" /><figcaption><p>Custom Tool node  &#x26; Drop UI</p></figcaption></figure>
