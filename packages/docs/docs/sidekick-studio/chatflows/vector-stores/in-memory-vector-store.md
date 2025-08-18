---
description: In-Memory Vector Store for AnswerAgentAI
---

# In-Memory Vector Store

## Overview

The In-Memory Vector Store is a fundamental component in AnswerAgentAI's workflow system. It provides a quick and easy way to store and retrieve vector embeddings directly in memory. This feature is particularly useful for testing, prototyping, and small-scale applications where persistence is not required.

## Key Benefits

-   **Quick Setup**: Easily integrate into your workflow for immediate use.
-   **Efficient for Small Datasets**: Ideal for testing and small-scale applications.
-   **No External Dependencies**: Runs entirely in memory, requiring no additional database setup.

## How to Use

1. Add the "In-Memory Vector Store" node to your AnswerAgentAI canvas.
2. Connect a Document source to the "Document" input (optional).
3. Connect an Embeddings model to the "Embeddings" input.
4. Set the "Top K" value if you want to change the default number of results (optional).
5. Choose the output type: either "Memory Retriever" or "Memory Vector Store".

<!-- TODO: Screenshot of the In-Memory Vector Store node on the AnswerAgentAI canvas with inputs and outputs connected -->

<figure><img src="/.gitbook/assets/screenshots/inmemoryvectorstore.png" alt="" /><figcaption><p> In-Memory Vector Store   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. **Testing and Prototyping**: Use this vector store for initial testing and prototyping of your workflows.
2. **Small Datasets**: Ideal for working with small to medium-sized datasets that can fit comfortably in memory.
3. **Temporary Storage**: Remember that data is not persisted and will be lost when the application restarts.
4. **Performance Consideration**: For larger datasets or production use, consider switching to a persistent vector store.

## Troubleshooting

1. **Out of Memory Errors**: If you encounter out of memory errors, consider reducing the size of your dataset or switching to a disk-based vector store.
2. **Slow Performance with Large Datasets**: For larger datasets, performance may degrade. In such cases, it's recommended to use a more scalable vector store solution.

## Important Note for Production Use

While the In-Memory Vector Store is an excellent tool for getting started quickly and for testing purposes, it is not recommended for production use with large datasets or when data persistence is required. For production environments, consider using more robust and persistent storage solutions available in AnswerAgentAI, such as Pinecone, Weaviate, or other database-backed vector stores. These will provide better scalability, persistence, and performance for larger-scale applications.

When you're ready to move beyond testing and prototyping, explore AnswerAgentAI's other vector store options that offer long-term storage and are better suited for production workflows.
