---
description: Retrieve documents based on similarity score threshold
---

# Similarity Score Threshold Retriever

## Overview

The Similarity Score Threshold Retriever is a powerful tool in AnswerAI that allows you to retrieve documents from a vector store based on a minimum similarity percentage. This retriever ensures that only the most relevant documents are returned, improving the quality of information used in your workflows.

## Key Benefits

-   Retrieve highly relevant documents by setting a minimum similarity score
-   Customize the retrieval process with adjustable parameters
-   Improve the accuracy of your AnswerAI workflows by filtering out less relevant information

## How to Use

1. Add the Similarity Score Threshold Retriever node to your AnswerAI canvas.
2. Connect a Vector Store node to the "Vector Store" input of the retriever.
3. Configure the following parameters:
    - Query (optional): Specify a custom query for document retrieval. If left empty, the user's question will be used.
    - Minimum Similarity Score (%): Set the minimum similarity percentage for retrieved documents.
    - Max K: Define the maximum number of results to fetch.
    - K Increment: Specify how much to increase K by each time when fetching results.
4. Connect the output of the retriever to other nodes in your workflow as needed.

<!-- TODO: Add a screenshot of the Similarity Score Threshold Retriever node with its inputs and outputs labeled -->
<figure><img src="/.gitbook/assets/screenshots/similarityscore.png" alt="" /><figcaption><p> Similarity Score Threshold Retreiver  Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different minimum similarity scores to find the right balance between relevance and coverage for your specific use case.
2. Use the "Query" input to provide context-specific searches when you want to retrieve documents for a particular topic or question.
3. Adjust the "Max K" and "K Increment" values to fine-tune the number of documents retrieved and the retrieval process's efficiency.
4. Consider using the "Document" or "Text" outputs for further processing or analysis in your workflow.

## Troubleshooting

1. If you're not getting any results, try lowering the minimum similarity score or increasing the Max K value.
2. Ensure that your Vector Store is properly configured and contains relevant documents for your queries.
3. If the retriever is slow, try reducing the Max K value or increasing the K Increment to balance between thoroughness and speed.

This retriever is based on the `ScoreThresholdRetriever` class from LangChain, adapted for use in AnswerAI. For more detailed information on the underlying implementation, refer to the LangChain documentation.
