---
description: Generate embeddings using Azure OpenAI API
---

# Azure OpenAI Embeddings

## Prerequisite

1. [Log in](https://portal.azure.com/) or [sign up](https://azure.microsoft.com/en-us/free/) to Azure
2. [Create](https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI) your Azure OpenAI and wait for approval approximately 10 business days
3. Your API key will be available at **Azure OpenAI** > click **name_azure_openai** > click **Click here to manage keys**

## Overview

The Azure OpenAI Embeddings feature in AnswerAgentAI allows you to generate embeddings for given text using the Azure OpenAI API. Embeddings are vector representations of text that capture semantic meaning, which can be used for various natural language processing tasks.

## Key Benefits

-   Leverage Azure's powerful OpenAI models for generating high-quality embeddings
-   Easily integrate embeddings into your AnswerAgentAI workflows
-   Customize batch size and timeout settings for optimal performance

## How to Use

1. Add the Azure OpenAI Embeddings node to your AnswerAgentAI workflow.

<!-- TODO: Screenshot of adding the Azure OpenAI Embeddings node to the workflow -->
<figure><img src="/.gitbook/assets/screenshots/azureopenaiembeddinginaworkflow.png" alt="" /><figcaption><p> Azure OpenAI Embeddings Node In a Workflow   &#x26; Drop UI</p></figcaption></figure>

2. Connect your Azure OpenAI API credential:
    - Click on the node to open its settings
    - In the "Connect Credential" field, select your Azure OpenAI API credential or create a new one

<!-- TODO: Screenshot of connecting the Azure OpenAI API credential -->
<figure><img src="/.gitbook/assets/screenshots/azurecredentialsembedding.png" alt="" /><figcaption><p> Azure OpenAI Embeddings Credentials   &#x26; Drop UI</p></figcaption></figure>

3. (Optional) Configure additional parameters:
    - Batch Size: Set the number of texts to process in a single API call (default: 100)
    - Timeout: Specify the maximum time (in milliseconds) to wait for the API response

<!-- TODO: Screenshot of configuring additional parameters -->
<figure><img src="/.gitbook/assets/screenshots/azureopenaiembeddingnadditionalparameters.png" alt="" /><figcaption><p> Azure OpenAI Embeddings Node Additional Parameters   &#x26; Drop UI</p></figcaption></figure>

4. Connect the Azure OpenAI Embeddings node to other nodes in your workflow that require text embeddings.

5. Run your workflow to generate embeddings for your input text.

## Tips and Best Practices

-   Choose an appropriate batch size based on your input data and API rate limits. A larger batch size can improve efficiency, but may increase the risk of timeouts.
-   Monitor your Azure OpenAI API usage to ensure you stay within your quota limits.
-   Use embeddings for tasks such as semantic search, text classification, or clustering to improve the performance of your natural language processing applications.

## Troubleshooting

1. API Key Issues:

    - Ensure that your Azure OpenAI API key is correct and has the necessary permissions.
    - Check that the API key is properly stored in your AnswerAgentAI credentials.

2. Timeout Errors:

    - If you encounter timeout errors, try increasing the timeout value in the node settings.
    - Alternatively, reduce the batch size to process smaller chunks of text at a time.

3. Deployment Name Mismatch:

    - Verify that the Azure OpenAI API deployment name in your credentials matches the one in your Azure account.

4. API Version Compatibility:
    - Make sure you're using a compatible Azure OpenAI API version. Check the Azure documentation for the latest supported versions.

If you continue to experience issues, consult the AnswerAgentAI documentation or reach out to our support team for assistance.
