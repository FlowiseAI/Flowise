---
description: Redis Vector Store for efficient similarity search and data storage
---

# Redis Vector Store

## Overview

The Redis Vector Store node in AnswerAgentAI allows you to store and retrieve high-dimensional vectors efficiently using Redis, an open-source, in-memory data structure store. This node enables you to perform similarity searches on embedded data, making it ideal for various AI and machine learning applications.

## Key Benefits

-   Fast similarity searches on large datasets
-   Efficient storage and retrieval of high-dimensional vectors
-   Seamless integration with Redis, a popular and robust data store

## How to Use

1. Add the Redis Vector Store node to your AnswerAgentAI workflow canvas.
2. Connect an Embeddings node to the "Embeddings" input of the Redis node.
3. (Optional) Connect a Document node to the "Document" input if you want to upsert data.
4. Configure the node parameters:
    - Index Name: Specify a unique name for your vector index.
    - Replace Index on Upsert: Choose whether to replace the existing index when upserting data.
    - Content Field: Name of the field containing the actual content (default: "content").
    - Metadata Field: Name of the field containing document metadata (default: "metadata").
    - Vector Field: Name of the field containing the vector (default: "content_vector").
    - Top K: Number of top results to fetch (default: 4).
5. Connect the Redis Vector Store node's output to other nodes in your workflow that require vector storage or retrieval capabilities.

<!-- TODO: Add a screenshot of the Redis Vector Store node configuration -->
<figure><img src="/.gitbook/assets/screenshots/redisvectorstore.png" alt="" /><figcaption><p> Redis Vector Store node   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use meaningful index names to easily identify different vector stores in your Redis instance.
2. Consider the trade-offs between replacing the index on upsert and appending to an existing index based on your use case.
3. Adjust the "Top K" value based on your specific requirements for similarity search results.
4. Ensure your Redis instance is properly configured and optimized for vector operations.

## Troubleshooting

1. Connection issues:

    - Verify that the Redis connection credentials are correct.
    - Ensure that the Redis instance is running and accessible from your AnswerAgentAI environment.

2. Performance problems:

    - Check if your Redis instance has enough memory allocated for vector operations.
    - Consider optimizing your index structure or Redis configuration for better performance.

3. Unexpected search results:
    - Verify that the embeddings used for storage and querying are consistent.
    - Double-check the field names (Content Field, Metadata Field, Vector Field) to ensure they match your data structure.

If you encounter any other issues or need further assistance, please consult the AnswerAgentAI documentation or reach out to our support team.
