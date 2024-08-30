---
description: Qdrant Vector Store for AnswerAI
---

# Qdrant Vector Store

## Overview

The Qdrant Vector Store node in AnswerAI allows you to upsert embedded data and perform similarity searches using Qdrant, a scalable open-source vector database written in Rust. This node enables efficient storage and retrieval of high-dimensional vectors, making it ideal for various AI and machine learning applications.

## Key Benefits

-   Scalable and efficient vector storage and retrieval
-   Support for both local and cloud-hosted Qdrant instances
-   Flexible configuration options for advanced use cases

## How to Use

1. Add the Qdrant Vector Store node to your AnswerAI canvas.
2. Connect the required inputs:
    - Document: Connect to a Document Loader node (optional)
    - Embeddings: Connect to an Embeddings node
3. Configure the node settings:
    - Qdrant Server URL: Enter the URL of your Qdrant server
    - Qdrant Collection Name: Specify the name of the collection to use
    - Vector Dimension: Set the dimension of your vectors (default: 1536)
4. (Optional) Configure additional parameters:
    - Upsert Batch Size: Set the batch size for upserting documents
    - Similarity: Choose the similarity measure (Cosine, Euclid, or Dot)
    - Additional Collection Configuration: Provide JSON configuration for advanced settings
    - Top K: Specify the number of top results to fetch
    - Qdrant Search Filter: Add a JSON filter to refine search results

<!-- TODO: Add a screenshot showing the Qdrant Vector Store node with its inputs and configuration options -->
<figure><img src="/.gitbook/assets/screenshots/qdrant.png" alt="" /><figcaption><p> Qdrant Vector Store node configuration  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use a Record Manager to prevent duplication when upserting documents.
2. Adjust the Upsert Batch Size for optimal performance when dealing with large datasets.
3. Experiment with different similarity measures to find the best fit for your use case.
4. Utilize the Qdrant Search Filter to narrow down search results based on metadata or other criteria.

## Troubleshooting

1. Connection issues:

    - Ensure that the Qdrant Server URL is correct and accessible.
    - Check if the API key (for cloud-hosted instances) is valid and properly configured.

2. Performance problems:

    - Try adjusting the Upsert Batch Size to find the optimal balance between speed and resource usage.
    - Verify that the Vector Dimension matches the output of your Embeddings node.

3. Unexpected search results:
    - Double-check the Qdrant Search Filter syntax for any errors.
    - Ensure that the Top K value is appropriate for your use case.

## Advanced Usage: Filtering

Qdrant supports advanced filtering capabilities to refine your search results. Here's how to use filters effectively:

1. Each document in your vector store can have metadata associated with it, such as a `source` field.

2. To filter results based on metadata, use the "Qdrant Search Filter" option in the node configuration.

3. The filter should be provided as a JSON object. For example, to filter documents from a specific source:

```json
{
    "should": [
        {
            "key": "metadata.source",
            "match": {
                "value": "apple"
            }
        }
    ]
}
```

<!-- TODO: Add a screenshot showing the Qdrant Search Filter configuration in the node settings -->
<figure><img src="/.gitbook/assets/screenshots/qdrantapicredentials.png" alt="" /><figcaption><p> Qdrant Search Filter configuration  &#x26; Drop UI</p></figcaption></figure>

This filter will return only documents where the `metadata.source` field matches "apple".

4. You can create more complex filters using Qdrant's filter syntax, which supports nested conditions, range queries, and more. Refer to the Qdrant documentation for advanced filtering options.

By leveraging filters, you can create more targeted and relevant search results, improving the overall performance of your AnswerAI workflows.

Remember to test your filters thoroughly to ensure they're working as expected in your specific use case.
