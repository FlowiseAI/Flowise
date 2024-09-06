---
description: OpenSearch Vector Store for efficient similarity search and data retrieval
---

# OpenSearch Vector Store

## Overview

The OpenSearch Vector Store node in AnswerAI allows you to store and retrieve high-dimensional vectors efficiently. It's designed for performing similarity searches on embedded data, making it ideal for various natural language processing and machine learning tasks.

## Key Benefits

-   Efficient storage and retrieval of high-dimensional vectors
-   Fast similarity searches for improved query performance
-   Seamless integration with other AnswerAI components

## How to Use

1. Add the OpenSearch Vector Store node to your AnswerAI workflow canvas.
2. Connect the necessary input nodes:

    - Document (optional): Connect a Document node if you want to upsert data.
    - Embeddings: Connect an Embeddings node to provide vector representations.
    - Index Name: Specify the name of the index where your vectors will be stored.

3. Configure the node parameters:

    - Top K: Set the number of top results to fetch (default is 4).

4. Connect your OpenSearch credentials:

    - Click on the node and select "Connect Credential" in the right sidebar.
    - Choose or create an OpenSearch credential with the correct URL.

5. Choose the desired output:
    - OpenSearch Retriever: For retrieving similar documents.
    - OpenSearch Vector Store: For accessing the vector store directly.

<!-- TODO: Add a screenshot of the OpenSearch Vector Store node with its inputs and outputs connected -->

<figure><img src="/.gitbook/assets/screenshots/opensearchvectorstore.png" alt="" /><figcaption><p> OpenSearch Vector Store node configuration  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure your OpenSearch instance is properly set up and accessible before using this node.
2. Use an appropriate Embeddings model that aligns with your data and use case.
3. Experiment with different "Top K" values to find the optimal number of results for your specific application.
4. When upserting documents, make sure they are properly formatted and contain the necessary information.

## Troubleshooting

1. Connection issues:

    - Verify that your OpenSearch URL is correct and the instance is running.
    - Check your network settings and firewall configurations.

2. Indexing problems:

    - Ensure that your documents are properly formatted and contain valid content.
    - Verify that the index name is valid and doesn't contain any special characters.

3. Retrieval issues:
    - Check if the embeddings model used for indexing matches the one used for querying.
    - Verify that the index contains data by querying it directly in OpenSearch.

If you encounter persistent issues, consult the AnswerAI documentation or reach out to our support team for assistance.
