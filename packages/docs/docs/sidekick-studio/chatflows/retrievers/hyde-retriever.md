---
description: Use HyDE retriever to retrieve relevant documents from a vector store
---

# HyDE Retriever

## Overview

The HyDE (Hypothetical Document Embeddings) Retriever is a powerful tool in AnswerAgentAI that enhances document retrieval from a vector store. It uses a language model to generate a hypothetical answer to a query, which is then used to find relevant documents. This approach can significantly improve the quality and relevance of retrieved documents, especially for complex or nuanced queries.

## Key Benefits

-   Improved retrieval quality for complex queries
-   Leverages the power of language models to enhance search
-   Flexible configuration options for various use cases

## How to Use

1. Add the HyDE Retriever node to your AnswerAgentAI canvas.
2. Connect a Language Model node to the "Language Model" input.
3. Connect a Vector Store node to the "Vector Store" input.
4. (Optional) Provide a specific query in the "Query" field. If left empty, the user's question will be used.
5. Choose a predefined prompt or create a custom one:
    - Select a prompt from the "Select Defined Prompt" dropdown, or
    - Enter a custom prompt in the "Custom Prompt" field (this will override the selected predefined prompt).
6. (Optional) Adjust the "Top K" value to set the number of results to retrieve (default is 4).
7. Choose the desired output type:
    - HyDE Retriever: Returns the retriever object for further processing
    - Document: Returns an array of retrieved documents
    - Text: Returns a concatenated string of the retrieved documents' content

<!-- TODO: Add a screenshot showing the HyDE Retriever node with its inputs and outputs connected -->
<figure><img src="/.gitbook/assets/screenshots/hyderetreiver.png" alt="" /><figcaption><p> Hyde Retreiver Node &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different prompts to find the best one for your use case. The predefined prompts cover various scenarios, but a custom prompt might work better for specific domains.
2. Adjust the "Top K" value based on your needs. A higher value will return more results but may include less relevant documents.
3. Use the "Document" output when you need to access individual document metadata or want to process documents separately.
4. Use the "Text" output when you need a simple concatenated string of all retrieved content.

## Troubleshooting

-   If the retriever is not returning expected results, try the following:

    1. Check if the Language Model and Vector Store are properly connected and configured.
    2. Experiment with different prompts or adjust the existing one.
    3. Increase the "Top K" value to retrieve more documents.
    4. Verify that the vector store contains relevant documents for your queries.

-   If you encounter performance issues:
    1. Reduce the "Top K" value to retrieve fewer documents.
    2. Use a smaller or more efficient Language Model.
    3. Optimize your Vector Store for faster retrieval.
