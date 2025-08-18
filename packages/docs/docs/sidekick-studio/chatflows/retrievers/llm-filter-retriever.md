---
description: LLM Filter Retriever - Enhance document retrieval with contextual compression
---

# LLM Filter Retriever

## Overview

The LLM Filter Retriever is an advanced retrieval node that enhances the document retrieval process by applying contextual compression. It iterates over initially returned documents and extracts only the content that is relevant to the query, providing more focused and accurate results.

## Key Benefits

-   Improves retrieval accuracy by filtering out irrelevant content
-   Reduces noise in retrieved documents, focusing on query-relevant information
-   Enhances the quality of input for downstream tasks in your AnswerAgentAI workflow

## How to Use

1. Add the LLM Filter Retriever node to your AnswerAgentAI canvas.
2. Connect a Vector Store Retriever to the "Vector Store Retriever" input.
3. Connect a Language Model to the "Language Model" input.
4. (Optional) Provide a specific query in the "Query" input field.
5. Choose the desired output type: retriever, document, or text.

<!-- TODO: Add a screenshot showing the LLM Filter Retriever node connected to a Vector Store Retriever and a Language Model -->
<figure><img src="/.gitbook/assets/screenshots/llmfilterretreiver.png" alt="" /><figcaption><p> LLM Filter Retreiver Node &#x26; Drop UI</p></figcaption></figure>

## Input Parameters

1. **Vector Store Retriever**: Connect a Vector Store Retriever node to provide the base retrieval mechanism.
2. **Language Model**: Connect a Language Model node (e.g., GPT-3, GPT-4) to power the contextual compression.
3. **Query** (optional): Enter a specific query for document retrieval. If not provided, the user's question will be used.

## Output Options

1. **LLM Filter Retriever**: Returns the retriever object for use in subsequent nodes.
2. **Document**: Provides an array of document objects containing metadata and filtered page content.
3. **Text**: Returns a concatenated string of the filtered page content from all retrieved documents.

## Tips and Best Practices

1. Experiment with different Language Models to find the best balance between performance and accuracy.
2. Use specific queries when possible to improve the relevance of retrieved content.
3. Consider the trade-off between processing time and result quality when using this node in your workflow.

## Troubleshooting

1. **Error: "There must be a LLM model connected to LLM Filter Retriever"**

    - Ensure that you have connected a Language Model node to the LLM Filter Retriever.

2. **Retrieved content is not relevant to the query**

    - Try using a more powerful Language Model or refine your Vector Store Retriever's settings.
    - Ensure your document collection in the Vector Store is relevant and up-to-date.

3. **Slow performance**
    - The LLM Filter Retriever may increase processing time due to the additional filtering step. Consider using it only when necessary for high-precision tasks.

Remember that the effectiveness of the LLM Filter Retriever depends on the quality of both the Vector Store Retriever and the Language Model used. Experiment with different combinations to achieve the best results for your specific use case.
