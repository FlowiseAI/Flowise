---
description: Generate embeddings using VoyageAI API
---

# VoyageAI Embeddings

## Overview

VoyageAI Embeddings is a powerful feature in AnswerAI that allows you to generate embeddings for given text using the Voyage AI API. Embeddings are numerical representations of text that capture semantic meaning, making them useful for various natural language processing tasks.

## Key Benefits

-   Generate high-quality embeddings for text analysis and processing
-   Utilize state-of-the-art models from VoyageAI for improved accuracy
-   Easily integrate embeddings into your AnswerAI workflows

## How to Use

To use VoyageAI Embeddings in AnswerAI, follow these steps:

1. Add the VoyageAI Embeddings node to your workflow.
    <!-- TODO: Screenshot of adding VoyageAI Embeddings node to the workflow -->
    <figure><img src="/.gitbook/assets/screenshots/voyageaiembedding.png" alt="" /><figcaption><p> VoyageAI Embedding Node  &#x26; Drop UI</p></figcaption></figure>

2. Connect your VoyageAI API credential:

    - Click on the VoyageAI Embeddings node to open its settings.
    - In the "Connect Credential" field, select your VoyageAI API credential or create a new one if you haven't already.
          <!-- TODO: Screenshot of connecting VoyageAI API credential -->
          <figure><img src="/.gitbook/assets/screenshots/voyageaiapicredentials.png" alt="" /><figcaption><p> VoyageAI Embedding Node &#x26; Drop UI</p></figcaption></figure>

3. Choose the model:

    - In the "Model Name" dropdown, select the desired VoyageAI model for generating embeddings.
    - The default model is "voyage-2", but you can choose other available models.
          <!-- TODO: Screenshot of model selection dropdown -->
          <figure><img src="/.gitbook/assets/screenshots/voyagemodelselection.png" alt="" /><figcaption><p> VoyageAI Embedding Node Model Selection &#x26; Drop UI</p></figcaption></figure>

4. Connect the VoyageAI Embeddings node to other nodes in your workflow as needed.

5. Run your workflow to generate embeddings for your text input.

## Tips and Best Practices

1. Experiment with different models to find the one that works best for your specific use case.
2. Use the generated embeddings for tasks such as semantic search, text classification, or clustering.
3. Consider the length of your input text when choosing a model, as some models may have length limitations.
4. If you're working with a large volume of text, consider batching your requests to optimize performance.

## Troubleshooting

1. API Key Issues:

    - If you encounter authentication errors, double-check that your VoyageAI API key is correct and properly configured in your credentials.
    - Ensure that your API key has the necessary permissions to access the chosen model.

2. Model Availability:

    - If a specific model is not available in the dropdown, it may not be supported by the current version of AnswerAI or your API access level. Try updating AnswerAI or contacting VoyageAI support for more information.

3. Endpoint Errors:

    - If you're using a custom endpoint and experiencing connection issues, verify that the endpoint URL is correct and accessible from your network.

4. Input Text Limitations:
    - If you receive errors related to input text, check if your text exceeds the maximum length supported by the chosen model. Try breaking longer text into smaller chunks if necessary.

By following this guide, you should be able to effectively use VoyageAI Embeddings in your AnswerAI workflows to generate high-quality text embeddings for various natural language processing tasks.
