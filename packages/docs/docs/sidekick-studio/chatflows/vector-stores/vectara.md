---
description: Upsert embedded data and perform similarity search using Vectara, a LLM-powered search-as-a-service
---

# Vectara Vector Store

## Overview

The Vectara Vector Store node allows you to store and retrieve embedded data using Vectara, a powerful search-as-a-service platform. This node enables you to perform similarity searches on your stored data, making it ideal for applications that require efficient information retrieval.

## Key Benefits

-   Efficient similarity search: Quickly find relevant information based on semantic similarity.
-   LLM-powered search: Leverage advanced language models for improved search accuracy.
-   Flexible integration: Easily incorporate Vectara's capabilities into your AnswerAgentAI workflows.

## How to Use

1. Add the Vectara Vector Store node to your canvas.
2. Connect your Vectara credentials:
    - Click on the "Connect Credential" dropdown.
    - Select an existing credential or click "Create New" to add your Vectara API credentials.
3. Configure the node inputs:
    - Document: Connect a Document node to provide text data for storage (optional).
    - File: Upload a file to be stored in Vectara (optional).
    - Additional Parameters: Adjust search behavior and result filtering (optional).
4. Connect the node outputs to other nodes in your workflow:
    - Vectara Retriever: Use this output for direct retrieval operations.
    - Vectara Vector Store: Use this output for more advanced vector store operations.

## Tips and Best Practices

1. Use the Metadata Filter for targeted searches within your stored data.
2. Experiment with the "Sentences Before" and "Sentences After" parameters to control the context returned with search results.
3. Adjust the "Lambda" parameter to balance between neural search and keyword-based search for optimal results.
4. Use the "Top K" parameter to control the number of results returned by the search.
5. Explore the MMR (Maximal Marginal Relevance) settings to get diverse search results.

## Troubleshooting

1. If you encounter authentication errors, double-check your Vectara API credentials in the connected credential.
2. Ensure that your Vectara corpus is properly set up and accessible with the provided API key.
3. If search results are not as expected, try adjusting the additional parameters such as Lambda or Metadata Filter.

<!-- TODO: Add a screenshot of the Vectara Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/vectara.png" alt="" /><figcaption><p> Vectara Vector Store node configuration panel &#x26; Drop UI</p></figcaption></figure>
