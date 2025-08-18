---
description: Astra Vector Store for efficient similarity search and retrieval
---

# Astra Vector Store

## Overview

The Astra Vector Store node in AnswerAgentAI allows you to store and retrieve embedded data using DataStax Astra DB, a serverless vector database designed for managing mission-critical AI workloads. This node enables you to perform similarity or MMR (Maximal Marginal Relevance) searches on your embedded data.

## Key Benefits

-   Efficient storage and retrieval of high-dimensional vector data
-   Seamless integration with DataStax Astra DB for scalable vector operations
-   Supports various similarity metrics for flexible search capabilities

## How to Use

1. Add the Astra Vector Store node to your AnswerAgentAI workflow canvas.
2. Connect the necessary input nodes (e.g., Document and Embeddings).
3. Configure the node parameters:
    - Connect Credential: Select your Astra DB API credential.
    - Document: Connect a Document node (optional).
    - Embeddings: Connect an Embeddings node.
    - Namespace: Enter the Astra DB namespace.
    - Collection: Specify the Astra DB collection name.
    - Vector Dimension: Set the dimension for storing vector embeddings (default: 1536).
    - Similarity Metric: Choose from 'cosine', 'euclidean', or 'dot_product' (default: cosine).
    - Top K: Set the number of top results to fetch (default: 4).
4. Configure additional MMR parameters if needed.
5. Run your workflow to store or retrieve vector data.

<!-- TODO: Add a screenshot of the Astra Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/astravectorstore.png" alt="" /><figcaption><p> Astra Vector Store Node   &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Ensure your Astra DB API credentials are correctly set up in AnswerAgentAI before using this node.
2. Choose the appropriate similarity metric based on your specific use case and data characteristics.
3. Experiment with different 'Top K' values to find the optimal number of results for your application.
4. When using the MMR search, adjust the lambda parameter to balance between relevance and diversity in the results.

## Troubleshooting

1. Invalid Similarity Metric error:

    - Make sure you've selected one of the supported metrics: 'cosine', 'euclidean', or 'dot_product'.

2. Connection issues:

    - Verify that your Astra DB API credentials are correct and that you have the necessary permissions.
    - Check your network connection and ensure that the Astra DB endpoint is accessible.

3. Dimension mismatch:
    - Ensure that the Vector Dimension parameter matches the dimension of your embedding model.

If you encounter any other issues, double-check your node configuration and input connections. For persistent problems, consult the AnswerAgentAI documentation or reach out to support.
