---
description: Upsert embedded data and perform similarity search using Faiss library from Meta
---

# Faiss Vector Store

## Overview

The Faiss Vector Store node in AnswerAI allows you to store and retrieve high-dimensional vectors efficiently using the Faiss library developed by Meta. This node is particularly useful for similarity search operations on large datasets of embedded documents.

## Key Benefits

-   Fast and efficient similarity search on large datasets
-   Seamless integration with other AnswerAI components
-   Supports both document storage and retrieval operations

## How to Use

1. Add the Faiss Vector Store node to your AnswerAI canvas.
2. Connect the required input nodes:

    - Document: (Optional) Connect a Document node if you want to add new documents to the vector store.
    - Embeddings: Connect an Embeddings node to provide the embedding model for vectorizing the documents.
    - Base Path: Specify the file path where the Faiss index will be saved or loaded from.

3. Configure the node:

    - Top K: (Optional) Set the number of top results to fetch during similarity search. Default is 4.

4. Connect the output to other nodes in your workflow:
    - Faiss Retriever: Use this output for document retrieval operations.
    - Faiss Vector Store: Use this output for direct access to the vector store.

<!-- TODO: Add a screenshot of the Faiss Vector Store node with its inputs and outputs connected -->
<figure><img src="/.gitbook/assets/screenshots/faiss.png" alt="" /><figcaption><p> Faiss Vector Store Node    &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure that the Base Path is set to a directory where you have write permissions.
2. When using the Faiss Vector Store for the first time, provide Document input to create and populate the index.
3. For subsequent uses, you can load an existing index by providing only the Base Path and Embeddings inputs.
4. Adjust the Top K value based on your specific use case and the size of your document collection.

## Troubleshooting

1. If you encounter an error related to the Faiss index, ensure that the Base Path is correct and that the directory exists.
2. If the similarity search returns fewer results than expected, check if the Top K value is set appropriately and if your index contains enough documents.
3. In case of "illegal invocation" errors, make sure you're using the latest version of AnswerAI, as this issue has been addressed in recent updates.

<!-- TODO: Add a screenshot showing the configuration panel of the Faiss Vector Store node -->
<figure><img src="/.gitbook/assets/screenshots/faissconfiguration.png" alt="" /><figcaption><p> Faiss Vector Store Configuration Panel    &#x26; Drop UI</p></figcaption></figure>
