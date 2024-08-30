---
description: Custom Document Loader in AnswerAI
---

# Custom Document Loader

## Overview

The Custom Document Loader is a powerful feature in AnswerAI that allows you to create custom functions for loading documents. This feature provides flexibility in handling various document formats and sources, enabling you to tailor the document loading process to your specific needs.

## Key Benefits

-   Customizable document loading: Create custom functions to load documents from any source or format.
-   Flexible output options: Choose between returning document objects or plain text.
-   Integration with AnswerAI variables: Utilize input variables and system variables in your custom functions.

## How to Use

1. Navigate to the Custom Document Loader in the Document Loaders category.

<!-- TODO: Screenshot of the Custom Document Loader node in the AnswerAI interface -->
<figure><img src="/.gitbook/assets/screenshots/customdocumentloader.png" alt="" /><figcaption><p> Custom Document Loader  &#x26; Drop UI</p></figcaption></figure>

2. Configure the Input Variables (optional):

    - Click on the "Input Variables" field.
    - Enter a JSON object with key-value pairs representing your input variables.
    - These variables can be used in your custom function with a `$` prefix (e.g., `$var`).

3. Write your Javascript Function:

    - Click on the "Javascript Function" field.
    - Write your custom function to load and process documents.
    - Ensure your function returns the correct format based on your chosen output type:
        - For "Document" output: Return an array of document objects containing `pageContent` and `metadata`.
        - For "Text" output: Return a string.

4. Select the desired output type:

    - Choose between "Document" or "Text" in the output options.

5. Connect the Custom Document Loader to other nodes in your AnswerAI workflow.

6. Run your workflow to test the custom document loading function.

## Tips and Best Practices

1. Use meaningful variable names in your custom function to improve readability.
2. Leverage the `$input`, `$vars`, and `$flow` objects to access input data, variables, and flow information within your function.
3. Handle errors gracefully in your custom function to provide meaningful feedback.
4. When working with large documents, consider implementing pagination or chunking to improve performance.
5. Use the available built-in dependencies and external dependencies as needed in your custom function.

## Troubleshooting

1. Invalid JSON in Input Variables:

    - Ensure that the JSON object in the Input Variables field is properly formatted.
    - Use double quotes for keys and string values.

2. Function not returning the expected format:

    - Double-check that your function returns an array of document objects for "Document" output or a string for "Text" output.
    - Verify that document objects contain both `pageContent` and `metadata` properties.

3. Dependency issues:

    - If you need to use external dependencies, make sure they are allowed in your AnswerAI environment.
    - Check the `TOOL_FUNCTION_BUILTIN_DEP` and `TOOL_FUNCTION_EXTERNAL_DEP` environment variables for available dependencies.

4. Errors in the custom function:
    - Use console.log statements to debug your function (output will be visible in the AnswerAI logs).
    - Ensure that all asynchronous operations are properly handled using async/await or promises.

## Example Custom Function

Here's an example of a custom function that loads a simple document:

```javascript
return [
    {
        pageContent: 'This is the content of my custom document.',
        metadata: {
            title: 'Custom Document',
            source: 'Custom Document Loader',
            date: new Date().toISOString()
        }
    }
]
```

This function returns a single document object with page content and metadata. You can expand on this example to load documents from files, databases, or APIs based on your specific requirements.

Remember to test your custom document loader thoroughly to ensure it integrates smoothly with the rest of your AnswerAI workflow.
