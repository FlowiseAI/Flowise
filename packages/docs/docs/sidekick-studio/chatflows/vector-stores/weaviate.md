---
description: Weaviate Vector Store for AnswerAI
---

# Weaviate Vector Store

## Overview

The Weaviate Vector Store node in AnswerAI allows you to store, retrieve, and search vector embeddings using Weaviate, a scalable open-source vector database. This node enables you to perform similarity searches and MMR (Maximal Marginal Relevance) searches on your embedded data.

## Key Benefits

-   Efficiently store and search vector embeddings
-   Perform similarity and MMR searches on your data
-   Scalable solution for managing large datasets

## How to Use

1. Add the Weaviate Vector Store node to your AnswerAI canvas.
2. Connect the necessary input nodes (Document, Embeddings, and optionally RecordManager).
3. Configure the Weaviate connection settings and other parameters.
4. Run your workflow to store or retrieve data from the Weaviate Vector Store.

### Input Parameters

-   **Document**: (Optional) The documents to be stored in the vector database.
-   **Embeddings**: The embedding model to use for converting text to vectors.
-   **Record Manager**: (Optional) Keeps track of records to prevent duplication.
-   **Weaviate Scheme**: Choose between "https" or "http" for the connection.
-   **Weaviate Host**: The host address of your Weaviate instance (e.g., "localhost:8080").
-   **Weaviate Index**: The name of the index to use in Weaviate.
-   **Weaviate Text Key**: (Optional) The key used for storing text data.
-   **Weaviate Metadata Keys**: (Optional) Keys for additional metadata to be stored.
-   **Top K**: (Optional) Number of top results to fetch (default is 4).
-   **Weaviate Search Filter**: (Optional) JSON filter for search queries.

### Output

The node provides two outputs:

1. **Weaviate Retriever**: A retriever object for performing searches.
2. **Weaviate Vector Store**: The vector store object for direct interactions.

## Tips and Best Practices

1. Ensure your Weaviate instance is properly set up and accessible before using this node.
2. Use a Record Manager to prevent duplicate entries when upserting documents.
3. Experiment with different "Top K" values to find the optimal number of results for your use case.
4. Utilize the Weaviate Search Filter for more precise queries when needed.

## Troubleshooting

1. **Connection Issues**: Verify that the Weaviate host and scheme are correct. Ensure that your Weaviate instance is running and accessible.

2. **Authentication Errors**: If using Weaviate cloud hosted, make sure you've provided the correct API key in the credential settings.

3. **Indexing Failures**: Check that your documents are properly formatted and that the specified Weaviate index exists.

4. **Search Returns No Results**: Verify that you have data in your index and that your search filter (if used) is not too restrictive.

<!-- TODO: Add a screenshot of the Weaviate Vector Store node configuration in the AnswerAI canvas -->
<figure><img src="/.gitbook/assets/screenshots/weaviate.png" alt="" /><figcaption><p> Weaviate Vector Store node configuration panel &#x26; Drop UI</p></figcaption></figure>

Remember to refer to the Weaviate documentation for more advanced configurations and features specific to the Weaviate vector database.
