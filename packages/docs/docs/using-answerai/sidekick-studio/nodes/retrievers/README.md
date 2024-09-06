---
description: Understanding and Using Retriever Nodes in AnswerAI
---

# Retriever Nodes

## Overview

Retriever Nodes are powerful components in AnswerAI that allow you to fetch relevant documents based on unstructured queries. These nodes are designed to enhance your workflow by providing efficient and accurate document retrieval capabilities.

## Key Benefits

-   Improved information retrieval: Quickly find relevant documents from large datasets
-   Flexibility: Various retriever types to suit different use cases
-   Enhanced AI interactions: Provide context for more accurate AI responses

## Types of Retriever Nodes

AnswerAI offers several types of Retriever Nodes, each with its unique capabilities:

-   [Cohere Rerank Retriever](cohere-rerank-retriever.md)
-   [Embeddings Filter Retriever](embeddings-filter-retriever.md)
-   [HyDE Retriever](hyde-retriever.md)
-   [LLM Filter Retriever](llm-filter-retriever.md)
-   [Prompt Retriever](prompt-retriever.md)
-   [Reciprocal Rank Fusion Retriever](reciprocal-rank-fusion-retriever.md)
-   [Similarity Score Threshold Retriever](similarity-score-threshold-retriever.md)
-   [Vector Store Retriever](vector-store-retriever.md)
-   [Voyage AI Rerank Retriever](voyage-ai-retriever.md)

## Tips and Best Practices

1. Choose the appropriate Retriever Node based on your specific use case and data characteristics.
2. Experiment with different retriever configurations to optimize performance.
3. Use multiple Retriever Nodes in combination for more comprehensive results.
4. Regularly update your document index to ensure fresh and accurate retrievals.
5. Monitor retrieval performance and adjust settings as needed.

## Troubleshooting

Common issues and solutions:

1. **Slow retrieval**:

    - Optimize your document index
    - Consider using a more efficient Retriever Node
    - Reduce the number of documents in your dataset

2. **Irrelevant results**:

    - Refine your query formulation
    - Adjust similarity thresholds
    - Try a different Retriever Node type
      `

3. **Error messages**:
    - Check your node connections
    - Verify API keys and permissions
    - Consult the AnswerAI documentation for specific error codes

<!-- TODO: Add a screenshot showing the configuration panel of a Retriever Node with highlighted troubleshooting options -->
<figure><img src="/.gitbook/assets/screenshots/retreivernodes.png" alt="" /><figcaption><p> Retreiver Node &#x26; Drop UI</p></figcaption></figure>

By mastering the use of Retriever Nodes, you can significantly enhance your AnswerAI workflows, enabling more accurate and efficient information retrieval for your AI-powered applications.
