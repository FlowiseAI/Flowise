---
description: Split flows based on If Else javascript functions
---

# IfElse Function

## Overview

The IfElse Function is a powerful utility node in AnswerAI that allows you to create conditional logic within your workflows. This node evaluates a condition and directs the flow based on whether the condition is true or false.

## Key Benefits

-   Create dynamic, branching workflows based on specific conditions
-   Implement custom logic using JavaScript functions
-   Easily integrate with other nodes and variables in your AnswerAI workflow

## How to Use

1. Add the IfElse Function node to your canvas in the AnswerAI Studio.
2. Configure the node's settings:
   a. Input Variables (optional): Define any variables you want to use in your functions.
   b. IfElse Name (optional): Give your condition a descriptive name.
   c. If Function: Write a JavaScript function that returns true or false.
   d. Else Function: Write a JavaScript function to execute if the If condition is false.
3. Connect the node's outputs ("True" and "False") to the appropriate next steps in your workflow.

<!-- TODO: Add a screenshot of the IfElse Function node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/ifelsefunction.png" alt="" /><figcaption><p> Ifelse Function Example   &#x26; Drop UI</p></figcaption></figure>

### Writing Functions

Both the If and Else functions should return a value. Here's an example of how to write these functions:

If Function:

```javascript
if ('hello' == 'hello') {
    return true
}
```

Else Function:

```javascript
return false
```

## Tips and Best Practices

1. Use meaningful variable names to make your functions more readable.
2. Leverage the `$input` variable to access the input passed to the node.
3. Utilize `$vars` to access variables from previous nodes in the workflow.
4. Use `$flow` to access information about the current chatflow, session, and input.
5. Keep your functions simple and focused on a single condition or task.

## Troubleshooting

1. **Syntax Errors**: Ensure your JavaScript code is valid and free of syntax errors.
2. **Undefined Variables**: Check that all variables used in your functions are properly defined or passed as input variables.
3. **Incorrect Output**: Verify that your functions are returning the expected values (true/false for the If function, and the desired output for both functions).

<!-- TODO: Add a screenshot showing an example of a complete IfElse Function node setup in a workflow -->
<figure><img src="/.gitbook/assets/screenshots/ifelseinworkflow.png" alt="" /><figcaption><p> Ifelse Function Example   &#x26; Drop UI</p></figcaption></figure>

Remember, the IfElse Function node is a powerful tool for creating dynamic workflows in AnswerAI. By mastering its use, you can create sophisticated, responsive chatbots and applications that adapt to various conditions and user inputs.
