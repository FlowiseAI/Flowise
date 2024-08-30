---
description: Execute custom JavaScript functions in your AnswerAI workflows
---

# Custom JS Function

## Overview

The Custom JS Function node allows you to execute custom JavaScript code within your AnswerAI workflows. This powerful utility enables you to perform complex operations, data manipulations, and integrate external libraries into your chatflows.

## Key Benefits

-   Flexibility to implement custom logic and algorithms
-   Ability to integrate external JavaScript libraries
-   Powerful tool for data transformation and manipulation

## How to Use

1. Add the Custom JS Function node to your workflow canvas.
2. Configure the node with the following inputs:

    - Input Variables (optional): Define input variables that can be used in your function.
    - Function Name (optional): Give your function a descriptive name.
    - JavaScript Function: Write your custom JavaScript code in this field.

3. Connect the node to other components in your workflow as needed.

<!-- TODO: Screenshot of the Custom JS Function node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/customjsfunction.png" alt="" /><figcaption><p> Custom JS Function node   &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Use the `$input` variable to access the input data passed to the node.
2. Utilize `$vars` to access variables from the AnswerAI environment.
3. Access flow-specific information using the `$flow` object, which contains `chatflowId`, `sessionId`, `chatId`, and `input`.
4. When defining input variables, use the `$` prefix to access them in your code (e.g., `$myVariable`).
5. You can use both built-in Node.js modules and external npm packages in your custom functions, depending on your AnswerAI configuration.

## Troubleshooting

1. Invalid JSON Error: If you encounter an "Invalid JSON" error when using input variables, double-check that your JSON is correctly formatted.
2. Undefined Variables: Ensure that all variables used in your function are properly defined or passed as input variables.
3. External Module Issues: If you're trying to use an external module and encountering errors, verify that the module is included in your AnswerAI configuration's allowed dependencies.

## Example

Here's a simple example of a custom function that concatenates two strings:

```javascript
const result = $firstName + ' ' + $lastName
return result
```

In this example, `$firstName` and `$lastName` should be defined as input variables when configuring the node.

<!-- TODO: Screenshot showing the example code in the node configuration and the corresponding input variables setup -->
<figure><img src="/.gitbook/assets/screenshots/customjsfunctionexample.png" alt="" /><figcaption><p> Custom JS Function Example   &#x26; Drop UI</p></figcaption></figure>

Remember to test your custom functions thoroughly to ensure they work as expected within your AnswerAI workflows.
