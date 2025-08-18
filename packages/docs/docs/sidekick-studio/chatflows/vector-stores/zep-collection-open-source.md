---
description: Zep Collection - Open Source Vector Store
---

# Zep Vector Store

## Overview

The Zep Vector Store is a powerful component in AnswerAgentAI that allows you to store, retrieve, and search embedded data efficiently. It's designed for fast and scalable operations, making it an excellent building block for LLM applications.

## Key Benefits

-   Fast and scalable similarity search
-   Efficient storage and retrieval of embedded data
-   Seamless integration with AnswerAgentAI workflows

## How to Use

1. Add the Zep Vector Store node to your canvas.
2. Configure the following inputs:

    - Document: (Optional) Add document(s) to be stored in the vector store.
    - Embeddings: Select the embeddings model to use.
    - Base URL: Enter the base URL for your Zep instance (default: `http://127.0.0.1:8000`).
    - Zep Collection: Specify the name of your Zep collection.
    - Zep Metadata Filter: (Optional) Add a JSON metadata filter for advanced querying.
    - Embedding Dimension: Set the dimension of your embeddings (default: 1536).
    - Top K: Specify the number of top results to fetch (default: 4).

3. Connect the node to other components in your workflow.
4. Run your workflow to utilize the Zep Vector Store for storing or retrieving embedded data.

<!-- TODO: Add a screenshot of the Zep Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/zepopensource.png" alt="" /><figcaption><p> Zep Collection figuration panel &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

-   Ensure your Zep instance is running and accessible before using this node.
-   Use meaningful names for your Zep collections to organize your data effectively.
-   Experiment with different embedding dimensions and top K values to optimize performance for your specific use case.
-   Utilize metadata filters to refine your searches and improve result relevance.

## Troubleshooting

1. Connection issues:

    - Verify that your Zep instance is running and the Base URL is correct.
    - Check your network connection and firewall settings.

2. Authentication errors:

    - Ensure you've properly configured the JWT authentication in your Zep instance.
    - Verify that the API key in the credential settings is correct.

3. Unexpected search results:
    - Double-check your metadata filter syntax if you're using one.
    - Verify that your documents were properly ingested into the vector store.

If you encounter persistent issues, consult the AnswerAgentAI documentation or reach out to our support team for assistance.
