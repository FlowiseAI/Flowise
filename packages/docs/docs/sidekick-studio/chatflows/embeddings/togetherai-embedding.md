---
description: Generate embeddings for text using TogetherAI models
---

# TogetherAI Embedding

## Overview

TogetherAI Embedding is a powerful feature in AnswerAgentAI that allows you to generate embeddings for a given text using TogetherAI's embedding models. Embeddings are numerical representations of text that capture semantic meaning, making them useful for various natural language processing tasks.

## Key Benefits

-   Access to state-of-the-art embedding models from TogetherAI
-   Easily integrate embeddings into your AnswerAgentAI workflows
-   Improve the performance of text-based tasks such as similarity search and text classification

## How to Use

To use the TogetherAI Embedding feature in AnswerAgentAI, follow these steps:

1. Add the TogetherAI Embedding node to your workflow.
2. Connect your TogetherAI API credential:

    - Click on the "Connect Credential" field.
    - Select an existing TogetherAI API credential or create a new one.
    - If creating a new credential, enter your TogetherAI API key.

3. Configure the embedding settings:

    - (Optional) Connect a Cache node to the "Cache" input if you want to cache embedding results.
    - Enter the desired model name in the "Model Name" field (e.g., "sentence-transformers/msmarco-bert-base-dot-v5").

4. Connect the TogetherAI Embedding node to other nodes in your workflow that require text embeddings.

<!-- TODO: Add a screenshot of the TogetherAI Embedding node configuration in the AnswerAgentAI interface -->
<figure><img src="/.gitbook/assets/screenshots/togetheraiembeddingnode.png" alt="" /><figcaption><p> TogetherAI Embedding Node  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose the appropriate embedding model for your use case. Refer to the [TogetherAI embedding models documentation](https://docs.together.ai/docs/embedding-models) for a list of available models and their characteristics.

2. Use caching to improve performance, especially if you're generating embeddings for the same text multiple times.

3. Experiment with different embedding models to find the one that works best for your specific task.

4. Be mindful of the input text length limitations for the chosen embedding model.

## Troubleshooting

1. **Error: Invalid API key**

    - Make sure you've entered the correct TogetherAI API key in your credential settings.
    - Verify that your TogetherAI account is active and has the necessary permissions.

2. **Error: Model not found**

    - Double-check the model name you've entered in the "Model Name" field.
    - Ensure that the model name is spelled correctly and is available in the TogetherAI embedding models list.

3. **Slow performance**
    - Consider using a cache to store and reuse embedding results for frequently used text.
    - Check your internet connection, as embedding generation requires API calls to TogetherAI servers.

If you encounter any other issues or have questions about using TogetherAI Embedding in AnswerAgentAI, please refer to our support documentation or contact our customer support team for assistance.
