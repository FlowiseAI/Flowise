---
description: Generate embeddings using AWS Bedrock embedding models
---

# AWS Bedrock Embeddings

## Overview

AWS Bedrock Embeddings is a powerful feature in AnswerAI that allows you to generate embeddings for a given text using AWS Bedrock embedding models. Embeddings are vector representations of text that capture semantic meaning, making them useful for various natural language processing tasks.

## Key Benefits

-   Access to state-of-the-art embedding models from AWS Bedrock
-   Flexible configuration options for different use cases
-   Seamless integration with other AnswerAI components

## How to Use

To use AWS Bedrock Embeddings in AnswerAI, follow these steps:

1. Add the AWS Bedrock Embeddings node to your workflow.
2. Configure the node settings:

    - Select the AWS Region
    - Choose the Model Name
    - (Optional) Provide a Custom Model Name
    - (For Cohere models) Select the Cohere Input Type

3. Connect the node to other components in your workflow that require text embeddings.

<!-- TODO: Screenshot of the AWS Bedrock Embeddings node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/aws chatbedrock in a workflow.png" alt="" /><figcaption><p> AWS Bedrock Embeddings Node   &#x26; Drop UI</p></figcaption></figure>

### Configuration Options

#### AWS Credential

-   Label: AWS Credential
-   Type: Credential
-   Optional: Yes

If provided, use your AWS API credentials for authentication.

#### Region

-   Label: Region
-   Type: Dropdown (Async)
-   Default: us-east-1

Select the AWS region where you want to run the embedding model.

#### Model Name

-   Label: Model Name
-   Type: Dropdown (Async)
-   Default: amazon.titan-embed-text-v1

Choose the embedding model you want to use. The list of available models is dynamically loaded.

#### Custom Model Name

-   Label: Custom Model Name
-   Type: String
-   Optional: Yes

If you want to use a specific model not listed in the Model Name dropdown, you can provide its name here. This will override the selected Model Name.

#### Cohere Input Type

-   Label: Cohere Input Type
-   Type: Dropdown
-   Optional: Yes (Required for Cohere models v3 and higher)

Specifies the type of input passed to Cohere embedding models. Options include:

-   search_document: For encoding documents to store in a vector database for search use-cases
-   search_query: For querying your vector database to find relevant documents
-   classification: For using embeddings as input to a text classifier
-   clustering: For clustering the embeddings

## Tips and Best Practices

1. Choose the appropriate region based on your data residency requirements and latency considerations.
2. When using Cohere models, always select the appropriate Input Type for your use case to ensure optimal performance.
3. Experiment with different models to find the one that works best for your specific task.
4. If you're using a custom or fine-tuned model, use the Custom Model Name field to specify it.

## Troubleshooting

1. **Error: Input Type must be selected for Cohere models**

    - Make sure you've selected an Input Type when using Cohere embedding models.

2. **Error: An invalid response was returned by Bedrock**

    - Check your AWS credentials and ensure you have the necessary permissions to access the selected model.
    - Verify that the selected region supports the chosen model.

3. **Unexpected embedding results**
    - Ensure that the input text is properly formatted and cleaned (the node automatically replaces newlines with spaces).
    - Try a different model or adjust the input type (for Cohere models) to see if it improves results.

For any persistent issues, consult the AWS Bedrock documentation or contact AnswerAI support for assistance.
