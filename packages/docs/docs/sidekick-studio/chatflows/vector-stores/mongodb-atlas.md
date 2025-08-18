---
description: MongoDB Atlas Vector Store for AnswerAgentAI
---

# MongoDB Atlas Vector Store

## Overview

The MongoDB Atlas Vector Store node in AnswerAgentAI allows you to store, retrieve, and search vector embeddings using MongoDB Atlas, a managed cloud MongoDB database. This node enables efficient similarity searches and supports upsert operations for embedded data.

## Key Benefits

-   Seamless integration with MongoDB Atlas for vector storage and retrieval
-   Efficient similarity and MMR (Maximal Marginal Relevance) search capabilities
-   Easy management of document embeddings in a cloud-based environment

## How to Use

1. Add the MongoDB Atlas Vector Store node to your AnswerAgentAI canvas.
2. Configure the node with the following parameters:

    - Document: (Optional) Input the documents you want to store in the vector database.
    - Embeddings: Select the embeddings model to use for vectorizing the documents.
    - Database: Enter the name of your MongoDB Atlas database.
    - Collection Name: Specify the name of the collection to store the vectors.
    - Index Name: Provide the name of the vector index in MongoDB Atlas.
    - Content Field: (Optional) Name of the field that contains the actual content (default: "text").
    - Embedded Field: (Optional) Name of the field that contains the embedding (default: "embedding").
    - Top K: (Optional) Number of top results to fetch (default: 4).

3. Connect the node to your credential containing the MongoDB Atlas connection URL.
4. Connect the output to other nodes in your workflow that require vector storage or retrieval.

<!-- TODO: Add a screenshot showing the MongoDB Atlas Vector Store node configuration -->
<figure><img src="/.gitbook/assets/screenshots/mongodbvectorstore.png" alt="" /><figcaption><p> MongoDB Atlas Vector Store node configuration  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure your MongoDB Atlas cluster is properly configured with vector search capabilities.
2. Use meaningful names for your database, collection, and index to easily manage your vector data.
3. Experiment with different "Top K" values to find the optimal number of results for your use case.
4. Consider using the MMR search option for more diverse results when querying the vector store.

## Troubleshooting

1. Connection issues:

    - Verify that your MongoDB Atlas connection URL is correct and that your IP address is whitelisted in the Atlas configuration.
    - Ensure that your Atlas cluster has the necessary permissions set up for read and write operations.

2. Performance problems:

    - Check if your Atlas cluster has sufficient resources to handle the vector operations.
    - Optimize your index configuration in MongoDB Atlas for better search performance.

3. Upsert failures:
    - Confirm that the document format matches the expected schema for your collection.
    - Verify that the embeddings model is compatible with the vector dimensions in your Atlas index.

If you encounter persistent issues, consult the MongoDB Atlas documentation or reach out to the AnswerAgentAI support team for assistance.
