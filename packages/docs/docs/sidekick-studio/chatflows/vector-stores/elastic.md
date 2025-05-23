---
description: Upsert embedded data and perform similarity search using Elasticsearch
---

# Elasticsearch Vector Store

## Overview

The Elasticsearch Vector Store node allows you to store and retrieve embedded data using Elasticsearch, a powerful distributed search and analytics engine. This node enables you to perform similarity searches on your vector data, making it ideal for applications that require efficient retrieval of semantically similar information.

## Key Benefits

-   Efficient similarity search: Quickly find and retrieve the most relevant vector data based on similarity measures.
-   Scalable storage: Leverage Elasticsearch's distributed architecture for storing large amounts of vector data.
-   Flexible integration: Easily integrate with other AnswerAI components for advanced AI workflows.

## How to Use

1. Add the Elasticsearch Vector Store node to your AnswerAI canvas.
2. Connect the required input nodes:
    - Document (optional): Connect a Document node if you want to add new documents to the vector store.
    - Embeddings: Connect an Embeddings node to specify the embedding model for your vectors.
    - Record Manager (optional): Connect a Record Manager node to prevent duplication and manage records.
3. Configure the node parameters:
    - Index Name: Enter the name of the Elasticsearch index you want to use.
    - Top K: Specify the number of top results to fetch (default is 4).
    - Similarity: Choose the similarity measure (l2_norm, dot_product, or cosine).
4. Connect the Elasticsearch Vector Store node's output to other nodes in your workflow.

<!-- TODO: Add a screenshot of the Elasticsearch Vector Store node with its input and output connections -->
<figure><img src="/.gitbook/assets/screenshots/elasticcsearch.png" alt="" /><figcaption><p> ElasticSearch Vector Store Node    &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   Use a consistent embedding model: Ensure you use the same embedding model for storing and querying vectors to maintain consistency in your similarity searches.
-   Index optimization: Consider optimizing your Elasticsearch index settings for vector search performance, especially for large datasets.
-   Security: Always use secure credentials and follow Elasticsearch security best practices when setting up your connection.

## Troubleshooting

-   Connection issues: If you're having trouble connecting to Elasticsearch, double-check your endpoint URL, cloud ID, and authentication credentials.
-   Performance problems: If searches are slow, consider increasing the number of shards in your Elasticsearch index or optimizing your index settings.
-   Indexing errors: Ensure that your document format is correct and that all required fields are present before indexing.

<!-- TODO: Add a screenshot showing common error messages and their solutions -->
