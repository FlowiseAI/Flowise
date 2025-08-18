---
description: Load data from an API using the API Loader in AnswerAgentAI
---

# API Loader

## Overview

The API Loader is a powerful feature in AnswerAgentAI that allows you to fetch data from external APIs and use it in your workflows. This tool supports both GET and POST requests, making it versatile for various data retrieval scenarios.

## Key Benefits

-   Easily integrate external data sources into your AnswerAgentAI workflows
-   Support for both GET and POST requests to accommodate different API requirements
-   Customizable headers and body parameters for flexible API interactions

## How to Use

Follow these steps to use the API Loader in AnswerAgentAI:

1. In the AnswerAgentAI interface, locate and select the "API Loader" node.
2. Configure the API Loader with the following settings:

    a. **Method**: Choose between GET or POST, depending on the API requirements.

    b. **URL**: Enter the full URL of the API endpoint you want to access.

    c. **Headers** (optional): Add any required headers for the API request in JSON format.

    d. **Body** (optional, for POST requests): Specify the request body in JSON format.

    e. **Text Splitter** (optional): Select a text splitter if you need to break down the API response into smaller chunks.

    f. **Additional Metadata** (optional): Add any extra metadata you want to include with the extracted documents.

    g. **Omit Metadata Keys** (optional): Specify any metadata keys you want to exclude from the final output.

3. Connect the API Loader node to other nodes in your workflow as needed.

4. Run your workflow to fetch data from the API and process it further.

<!-- TODO: Screenshot of the API Loader node configuration interface -->
<figure><img src="/.gitbook/assets/screenshots/apiloader.png" alt="" /><figcaption><p> Airtable Document Loader &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Always check the API documentation for the correct URL, required headers, and body format before configuring the API Loader.

2. Use the "Headers" field to include authentication tokens or API keys if required by the external API.

3. For POST requests, ensure that the body is properly formatted as JSON to avoid errors.

4. When dealing with large API responses, consider using a Text Splitter to break down the content into more manageable chunks for further processing.

5. Utilize the "Additional Metadata" field to add context or identifying information to the documents created from the API response.

## Troubleshooting

1. **API request fails**:

    - Double-check the URL for typos
    - Verify that all required headers are included
    - Ensure your internet connection is stable

2. **Empty response**:

    - Confirm that the API endpoint is correct and returns data
    - Check if authentication is required and properly implemented

3. **Error parsing JSON**:

    - Verify that the API response is in valid JSON format
    - Consider using a JSON validator tool to check the response structure

4. **Rate limiting issues**:
    - Implement appropriate delays between requests if you're making multiple API calls
    - Check the API documentation for rate limiting guidelines

If you encounter persistent issues, consult the API's documentation or reach out to the AnswerAgentAI support team for assistance.
