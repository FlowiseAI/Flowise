---
description: Enhance document retrieval with embeddings-based filtering
---

# Embeddings Filter Retriever

## Overview

The Embeddings Filter Retriever is a powerful tool in AnswerAgentAI that enhances document retrieval by using embeddings to filter out documents unrelated to the query. This retriever combines the efficiency of vector store retrieval with the precision of embeddings-based filtering, resulting in more relevant and focused document retrieval.

## Key Benefits

-   Improved relevance: Filters out documents that are not semantically related to the query
-   Customizable filtering: Adjust similarity thresholds to fine-tune retrieval precision
-   Flexible output options: Retrieve the retriever object, filtered documents, or concatenated text

## How to Use

1. Add the Embeddings Filter Retriever node to your AnswerAgentAI workflow canvas.
2. Connect a Vector Store Retriever to the "Vector Store Retriever" input.
3. Connect an Embeddings model to the "Embeddings" input.
4. (Optional) Specify a query in the "Query" input field. If left empty, the user's question will be used.
5. Adjust the "Similarity Threshold" (default: 0.8) to set the minimum similarity score for document inclusion.
6. (Optional) Set the "K" value to limit the number of returned documents (default: 20).
7. Choose the desired output type: retriever, document, or text.
8. Connect the output to subsequent nodes in your workflow.

<!-- TODO: Add a screenshot of the Embeddings Filter Retriever node with its inputs and outputs labeled -->
<figure><img src="/.gitbook/assets/screenshots/embeddingsfilter.png" alt="" /><figcaption><p> Embeddings Filter Retreiver Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different similarity thresholds to find the optimal balance between precision and recall for your use case.
2. When using the "document" or "text" output, consider adding a prompt template node to format the retrieved information for your language model.
3. If you're unsure about the query ahead of time, leave the "Query" field empty to use the dynamic user input.
4. Use the "K" parameter to limit the number of documents when you need a fixed-size output, and use the "Similarity Threshold" when you want to ensure a minimum relevance level.

## Troubleshooting

1. If you're not getting any results, try lowering the similarity threshold or increasing the "K" value.
2. Ensure that your Vector Store Retriever and Embeddings model are compatible and properly configured.
3. If you encounter an error stating "Must specify one of 'k' or 'similarity_threshold'", make sure you've set at least one of these parameters.

<!-- TODO: Add a screenshot showing the error message and where to set the required parameters -->
