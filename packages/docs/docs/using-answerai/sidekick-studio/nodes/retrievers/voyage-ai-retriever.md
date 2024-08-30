---
description: Voyage AI Rerank Retriever - Enhance document retrieval with semantic relevance
---

# Voyage AI Rerank Retriever

## Overview

The Voyage AI Rerank Retriever is a powerful feature in AnswerAI that enhances document retrieval by semantically ranking documents based on their relevance to a given query. This retriever uses Voyage AI's reranking model to sort documents from most to least semantically relevant, improving the quality of retrieved information.

## Key Benefits

-   Improves search accuracy by semantically ranking documents
-   Enhances the relevance of retrieved information for user queries
-   Integrates seamlessly with existing vector store retrievers

## How to Use

1. Add the Voyage AI Rerank Retriever node to your AnswerAI workflow canvas.
2. Connect a Vector Store Retriever to the Voyage AI Rerank Retriever node.
3. Configure the node settings:
    - Select the model (currently only 'rerank-lite-1' is available)
    - Optionally, specify a query for document retrieval
    - Set the Top K value to determine the number of top results to fetch
4. Connect your Voyage AI API credentials.
5. Choose the desired output type: retriever, document, or text.

<!-- TODO: Add a screenshot of the Voyage AI Rerank Retriever node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/voyageretreiver.png" alt="" /><figcaption><p> Voyage AI Rerank Retreiver  Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different Top K values to find the optimal balance between relevance and quantity of retrieved documents.
2. Use the query input when you want to retrieve documents based on a specific question rather than the user's input.
3. Consider using the 'document' or 'text' output options when you need to directly access the retrieved information in subsequent nodes.

## Troubleshooting

1. If you encounter authentication errors, double-check that your Voyage AI API credentials are correctly configured in the AnswerAI credential manager.
2. Ensure that the connected Vector Store Retriever is properly set up and contains indexed documents.
3. If the retrieved documents seem irrelevant, try adjusting the Top K value or refining your query input.
