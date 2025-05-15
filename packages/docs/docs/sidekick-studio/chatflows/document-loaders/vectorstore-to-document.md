---
description: Search and customize documents from vector stores
---

# VectorStore to Document

## Overview

The VectorStore to Document feature allows you to retrieve and customize documents from a vector store based on a given query. This powerful tool enables you to fine-tune the context returned from your vector database and manipulate the data through various operations.

## Key Benefits

-   Customizable document retrieval from vector stores
-   Flexible integration with other chains for data manipulation
-   Can be used as an ending node for easy application integration

## How to Use

1. Connect a Vector Store to the "Vector Store" input.
2. (Optional) Provide a specific query in the "Query" input. If left empty, the user's question will be used.
3. (Optional) Set a "Minimum Score (%)" to filter out less relevant documents.
4. Choose the desired output format: "Document," "Text," or "Ending Node."

<!-- TODO: Add a screenshot of the node configuration UI -->
<figure><img src="/.gitbook/assets/screenshots/vector store to document.png" alt="" /><figcaption><p> Unstructured Folder Loader Configuration   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. **Customizing Context**: Use the "Query" input to refine the context retrieved from the vector store. This allows you to focus on specific aspects of your data.

2. **Data Manipulation**: Leverage the "Document" output to chain this node with other nodes for further data processing. For example:

    - Use a text splitter to break down long documents
    - Apply a summarization chain to condense the information
    - Implement custom filtering or transformation logic

3. **Integration as an Ending Node**: Utilize the "Ending Node" output to seamlessly integrate this feature into your applications. This is particularly useful for:

    - Retrieving relevant documents for display in a user interface
    - Providing context to other AI models or tools

4. **Fine-tuning Relevance**: Adjust the "Minimum Score (%)" to control the quality of returned documents. A higher percentage will result in more relevant but potentially fewer documents.

5. **Optimizing for ChatGPT Integration**: When using this feature as a tool for ChatGPT:
    - Use the "Text" output to provide a concatenated string of relevant information
    - Adjust the query and minimum score to ensure the most pertinent information is passed to ChatGPT

## Troubleshooting

1. **No documents returned**:

    - Check if your minimum score is set too high
    - Verify that your query is relevant to the content in your vector store
    - Ensure your vector store is properly populated with data

2. **Irrelevant documents**:

    - Try increasing the minimum score
    - Refine your query to be more specific
    - Review the contents of your vector store to ensure it contains the expected data

3. **Performance issues**:
    - If retrieval is slow, consider optimizing your vector store or reducing the number of documents returned

## Example Use Cases

1. **Custom Knowledge Base**: Use this feature to create a tailored knowledge base for a chatbot, retrieving only the most relevant information based on user queries.

2. **Document Summarization Pipeline**: Chain this node with a summarization node to automatically generate summaries of the most relevant documents for a given topic.

3. **ChatGPT Integration**: Implement this as a tool for ChatGPT to provide it with up-to-date, internal information from your vector store, allowing for more accurate and context-aware responses.

4. **Dynamic Content Filtering**: Use this node as part of a larger chain to dynamically filter and present content in a user interface based on user preferences or behavior.

By leveraging the VectorStore to Document feature, you can create powerful, context-aware applications that make the most of your vector database while providing flexibility in how you process and present the retrieved information.
