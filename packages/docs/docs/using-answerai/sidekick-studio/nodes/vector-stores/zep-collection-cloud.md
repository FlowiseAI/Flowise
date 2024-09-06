---
description: Zep Collection - Cloud Vector Store for AnswerAI
---

# Zep Collection - Cloud Vector Store

## Overview

The Zep Collection - Cloud Vector Store is a powerful component in AnswerAI that allows you to store, retrieve, and search vector embeddings efficiently. It uses Zep, a fast and scalable building block for LLM applications, to manage your vector data in the cloud.

## Key Benefits

-   Efficient similarity search: Quickly find the most relevant documents based on vector similarity.
-   Cloud-based storage: Store and access your vector data securely in the cloud.
-   Flexible metadata filtering: Easily filter your search results using custom metadata.

## How to Use

1. Add the "Zep Collection - Cloud" node to your AnswerAI canvas.
2. Configure the node with the following settings:

    a. Connect Credential: Select or create a Zep Memory API credential.

    b. Document: (Optional) Connect a Document node to add documents to the vector store.

    c. Zep Collection: Enter a name for your Zep collection (e.g., "my-first-collection").

    d. Zep Metadata Filter: (Optional) Add a JSON object to filter search results based on metadata.

    e. Top K: (Optional) Specify the number of top results to fetch (default is 4).

3. Connect the Zep Collection node to other nodes in your workflow that require vector storage or retrieval.

<!-- TODO: Add a screenshot of the Zep Collection - Cloud node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/zepcloud.png" alt="" /><figcaption><p> Zep Collectionconfiguration panel &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use meaningful collection names: Choose descriptive names for your Zep collections to easily identify their purpose.

2. Optimize metadata: Design your metadata structure carefully to enable efficient filtering and improve search relevance.

3. Manage API keys securely: Always use the credential manager to store your Zep API keys securely.

4. Monitor usage: Keep track of your vector store usage to optimize performance and manage costs effectively.

## Troubleshooting

1. Connection issues:

    - Ensure that your Zep API credential is correctly configured.
    - Check your internet connection and firewall settings.

2. Slow search performance:

    - Consider optimizing your metadata filters.
    - Reduce the number of vectors in your collection if it becomes too large.

3. Unexpected search results:
    - Verify that your metadata filters are correctly formatted as JSON.
    - Double-check the "Top K" value to ensure you're retrieving the desired number of results.

If you encounter persistent issues, consult the AnswerAI documentation or reach out to support for assistance.
