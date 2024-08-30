---
description: Cohere Rerank Retriever - Enhance document retrieval with semantic relevance
---

# Cohere Rerank Retriever

## Overview

The Cohere Rerank Retriever is a powerful feature in AnswerAI that enhances document retrieval by ranking documents based on their semantic relevance to a given query. This retriever uses Cohere's advanced reranking models to provide more accurate and contextually appropriate search results.

## Key Benefits

-   Improved search accuracy: Ranks documents based on semantic relevance, not just keyword matching
-   Multilingual support: Offers both English and multilingual reranking models
-   Customizable retrieval: Allows fine-tuning of parameters for optimal results

## How to Use

1. Add the Cohere Rerank Retriever node to your AnswerAI workflow canvas.
2. Connect a Vector Store Retriever to the Cohere Rerank Retriever node.
3. Configure the node settings:
    - Select the Cohere API credential.
    - Choose the reranking model (English or Multilingual).
    - Set additional parameters like Top K and Max Chunks Per Doc if needed.
4. Connect the output to your desired next step in the workflow.

<!-- TODO: Add a screenshot of the Cohere Rerank Retriever node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/cohereretreivernode.png" alt="" /><figcaption><p> Cohere Retreiver Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Start with the default settings and adjust as needed based on your specific use case.
2. Experiment with different Top K values to balance between retrieval speed and accuracy.
3. Use the multilingual model if your content or queries are in languages other than English.
4. Consider the trade-off between Max Chunks Per Doc and processing time – higher values may provide better results but take longer to process.

## Troubleshooting

1. If you're not getting expected results:

    - Ensure your Cohere API credential is correctly set up.
    - Check if the base Vector Store Retriever is properly configured and contains relevant documents.
    - Try adjusting the Top K value to retrieve more or fewer documents.

2. If the retrieval process is slow:

    - Consider reducing the Max Chunks Per Doc value.
    - Optimize your base Vector Store Retriever for faster initial retrieval.

3. For multilingual issues:
    - Make sure you're using the 'rerank-multilingual-v2.0' model for non-English content.
