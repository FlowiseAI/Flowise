---
description: Milvus Vector Store for AnswerAgentAI
---

# Milvus Vector Store

## Overview

The Milvus Vector Store node in AnswerAgentAI allows you to store and retrieve embedded data using Milvus, an advanced open-source vector database. This node enables efficient similarity searches on your vector data, making it ideal for various AI and machine learning applications.

## Key Benefits

-   Efficient similarity search: Quickly find the most relevant data based on vector similarity.
-   Scalable: Designed to handle large-scale vector data with high performance.
-   Flexible: Supports various index types and search parameters for optimized retrieval.

## How to Use

1. Add the Milvus Vector Store node to your AnswerAgentAI workflow canvas.
2. Configure the node with the following parameters:
    - Document: (Optional) The input documents to be stored in the vector database.
    - Embeddings: The embedding model to use for converting text to vectors.
    - Milvus Server URL: The URL of your Milvus server (e.g., `http://localhost:19530`.
    - Milvus Collection Name: The name of the collection to store your vectors.
    - Milvus Text Field: (Optional) The field name for storing text data.
    - Milvus Filter: (Optional) A filter string for querying data.
    - Top K: (Optional) The number of top results to fetch (default is 4).
3. Connect the node to your desired input and output nodes in the workflow.

<!-- TODO: Add a screenshot of the Milvus Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/milvus.png" alt="" /><figcaption><p> Milvus Vector Store node configuration panel  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure your Milvus server is properly set up and running before using this node.
2. Choose appropriate embedding models that suit your data and use case.
3. Experiment with different filter strings to refine your search results.
4. Adjust the Top K value based on your specific needs for precision vs. recall.

## Troubleshooting

1. Connection issues:

    - Verify that the Milvus Server URL is correct and the server is running.
    - Check if any firewall or network settings are blocking the connection.

2. Performance problems:

    - Ensure your Milvus server has sufficient resources (CPU, RAM, storage).
    - Consider optimizing your index settings for better search performance.

3. Unexpected search results:
    - Double-check your filter string syntax for any errors.
    - Verify that the embedded data is correctly stored in the specified collection.

If you encounter any persistent issues, consult the AnswerAgentAI documentation or reach out to our support team for assistance.

<!-- TODO: Add a screenshot of a sample workflow using the Milvus Vector Store node -->
<figure><img src="/.gitbook/assets/screenshots/milvusinaworkflow.png" alt="" /><figcaption><p> Milvus Vector Store node In a workflow  &#x26; Drop UI</p></figcaption></figure>
