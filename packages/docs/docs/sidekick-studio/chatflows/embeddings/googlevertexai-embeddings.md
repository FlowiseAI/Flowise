---
description: Generate embeddings using Google Vertex AI API
---

# GoogleVertexAI Embeddings

## Overview

The GoogleVertexAI Embeddings feature allows you to generate embeddings for given text using Google's Vertex AI API. Embeddings are vector representations of text that capture semantic meaning, which can be useful for various natural language processing tasks.

## Key Benefits

-   Access to powerful, state-of-the-art embedding models from Google
-   Seamless integration with Google Cloud services
-   High-quality embeddings for improved text analysis and processing

## How to Use

1. Navigate to the Embeddings section in AnswerAgentAI.
2. Locate and select the "GoogleVertexAI Embeddings" node.
3. Configure the node with the following settings:

    a. **Connect Credential**: (Optional) If you're not using a GCP service or don't have default credentials set up, provide your Google Vertex AI credential.

    b. **Model Name**: Select the desired embedding model from the dropdown list. The default is "textembedding-gecko@001".

<!-- TODO: Add a screenshot of the GoogleVertexAI Embeddings node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/googlevertexembeddingsnode.png" alt="" /><figcaption><p> GoogleVertexAI Embeddings Node In A Workflow  &#x26; Drop UI</p></figcaption></figure>

4. Connect the GoogleVertexAI Embeddings node to your input text source and any subsequent nodes that will use the generated embeddings.
5. Run your workflow to generate embeddings for your input text.

## Tips and Best Practices

1. If you're running AnswerAgentAI on Google Cloud Platform services like Cloud Run, you may not need to provide explicit credentials.
2. Choose the appropriate embedding model based on your specific use case and performance requirements.
3. Be mindful of API usage and costs associated with generating embeddings, especially for large volumes of text.
4. Consider caching embeddings for frequently used text to improve performance and reduce API calls.

## Troubleshooting

1. **Authentication Issues**:

    - Ensure you have the correct credentials set up, either through the AnswerAgentAI interface or by using default GCP credentials.
    - Verify that your Google Cloud project has the necessary APIs enabled for Vertex AI.

2. **Model Not Found**:

    - Check that you've selected a valid model name from the dropdown list.
    - Ensure your Google Cloud project has access to the selected model.

3. **Quota Exceeded**:

    - If you encounter quota errors, check your Google Cloud Console for your current usage and limits.
    - Consider requesting a quota increase if needed.

4. **Performance Issues**:
    - If embedding generation is slow, try using a different model or optimizing your input text (e.g., batching requests).

For any persistent issues, consult the Google Vertex AI documentation or contact AnswerAgentAI support for further assistance.
