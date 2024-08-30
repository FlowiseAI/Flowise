---
description: Learn how to use the POST API Chain feature in AnswerAI
---

# POST API Chain

## Overview

The POST API Chain is a powerful feature in AnswerAI that allows you to run queries against POST APIs. This feature enables you to integrate external API data into your workflows, enhancing the capabilities of your AI-powered applications by sending data to and receiving responses from external services.

## Key Benefits

-   Seamless integration with external services that require POST requests
-   Customizable API interactions for complex data submissions
-   Enhanced AI responses with real-time data exchange

## How to Use

### 1. Set up the POST API Chain

<!-- TODO: Screenshot of the POST API Chain node in the AnswerAI interface -->
<figure><img src="/.gitbook/assets/screenshots/postapinode.png" alt="" /><figcaption><p>Post API Chain &#x26; Drop UI</p></figcaption></figure>

1. In your AnswerAI workflow, locate and add the "POST API Chain" node.
2. Connect the node to your desired input and output nodes.

### 2. Configure the Language Model

1. In the "Language Model" field, select the appropriate language model for your task.
2. Ensure the chosen model is compatible with your API and query requirements.

### 3. Provide API Documentation

1. In the "API Documentation" field, enter a detailed description of how the API works.
2. Include information such as endpoint structure, required POST parameters, request body format, and expected response format. Many times you can just copy and paste the docs into the field.
3. For reference, you can use this example:

<!-- TODO: Add example of API Post docs -->

### 4. Set Headers (Optional)

1. If your API requires specific headers, click on "Add Additional Parameter."
2. Select "Headers" and enter the required headers in JSON format.

### 5. Customize Prompts (Optional)

1. To fine-tune how AnswerAI interacts with the API, you can customize two prompts:

    - URL Prompt: Determines how AnswerAI constructs the API URL and request body
    - Answer Prompt: Guides AnswerAI on how to process and return the API response

2. To customize, click on "Add Additional Parameter" and select the prompt you want to modify.
3. Ensure that you include the required placeholders in your custom prompts:
    - URL Prompt: `{api_docs}` and `{question}`
    - Answer Prompt: `{api_docs}`, `{question}`, `{api_url_body}`, and `{api_response}`

### 6. Run Your Workflow

1. Once configured, run your workflow with an input query.
2. The POST API Chain will process the query, construct the appropriate API call with the necessary POST data, and return the results.

## Tips and Best Practices

-   Provide clear and detailed API documentation, especially regarding the structure of the POST request body.
-   Use specific and relevant examples in your API documentation to guide the AI in constructing proper POST requests.
-   Regularly update your API documentation to reflect any changes in the external API's request or response format.
-   Test your POST API Chain with various queries to ensure it handles different scenarios and data inputs correctly.
-   Monitor API usage to stay within rate limits and optimize performance.
-   Be cautious with sensitive data in POST requests and ensure proper security measures are in place.

## Troubleshooting

### Issue: Incorrect API Request Construction

-   **Solution**: Review and refine your API documentation. Ensure all necessary endpoints, parameters, and POST body structures are clearly described.

### Issue: Unexpected API Responses

-   **Solution**: Check that your Answer Prompt accurately guides the AI in interpreting the API response. Adjust as needed for better results. Verify that the API is receiving the expected POST data.

### Issue: Authentication Errors

-   **Solution**: Verify that you've correctly included any required authentication headers or tokens in the "Headers" section.

### Issue: Rate Limiting Issues

-   **Solution**: Implement appropriate rate limiting in your workflow or consider using caching mechanisms to reduce API calls.

### Issue: Data Format Errors

-   **Solution**: Ensure that the POST data being sent matches the format expected by the API. Review the API documentation and adjust your prompts if necessary.

If you encounter persistent issues, consult the AnswerAI documentation or reach out to our support team for assistance.
