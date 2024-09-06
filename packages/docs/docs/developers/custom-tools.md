---
description: Custom Tools in AnswerAI allow you to integrate your own functions into the AI workflow.
---

# Custom Tools

Custom Tools in AnswerAI allow you to integrate your own functions into the AI workflow.

## Creating a Custom Tool

When creating a custom tool, you need to define several components:

### Tool Name

The tool name is required and should follow these conventions:

-   Use lowercase letters
-   Use underscores instead of spaces
-   Be descriptive and concise

For example: `add_contact_hubspot`

### Tool Description

Provide a clear and concise description of what the tool does. This helps the AI understand when and how to use the tool.

### Input Schema

Define the input parameters your tool requires. Each parameter should have:

-   A name (lowercase, use underscores for spaces)
-   A type (e.g., string, number, boolean)
-   A description used by the AI to understand the parameter
-   Whether it's required or optional

Example input schema:

| Property  | Type   | Description              | Required |
| --------- | ------ | ------------------------ | -------- |
| email     | string | email address of contact | Yes      |
| firstname | string | first name of contact    | No       |
| lastname  | string | last name of contact     | No       |

### JavaScript Function

The JavaScript function is where you implement the logic of your custom tool. Here's an example of how to use the input variables in your code:

### Referencing Input Variables

In your JavaScript function, you can reference the input variables defined in your input schema by using the `$` prefix. This allows you to dynamically access the values provided when the tool is used. For example, if you have an input parameter named `email`, you would reference it in your code as `$email`. This syntax tells the system to replace `$email` with the actual value passed to the tool at runtime. Remember to use this `$` prefix for all input variables to ensure they are correctly interpreted and replaced with their corresponding values.

```javascript
const fetch = require('node-fetch');
const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
const token = 'your-hubspot-api-token';
const body = {
    "properties": {
        "email": $email
    }
};
if (firstname) body.properties.firstname = $firstname;
if (lastname) body.properties.lastname = $lastname;

const options = {
    method: 'POST',
    headers: {
        'Authorization': Bearer ${token},
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
};
try {
    const response = await fetch(url, options);
    const text = await response.text();
    return text;
} catch (error) {
    console.error(error);
    return '';
}
```

In this example:

-   The `email` parameter is required and always included in the request body.
-   `firstname` and `lastname` are optional. The code checks if they exist before adding them to the request body.
-   The function uses the input variables directly (e.g., `email`, `firstname`, `lastname`) without the `$` prefix.

Remember to replace `'your-hubspot-api-token'` with your actual HubSpot API token.

By following these guidelines, you can create powerful custom tools that integrate seamlessly with AnswerAI's workflow.
