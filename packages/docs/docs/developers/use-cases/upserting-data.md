---
description: Learn how to upsert data to Vector Stores with AnswerAgentAI
---

# Upserting Data

---

There are two fundamental ways to upsert your data into a [Vector Store](../../sidekick-studio/chatflows/vector-stores/) using AnswerAgentAI, either via [API calls](http://localhost:4242/docs/api/vector-upsert/vector-upsert) or by using a set of dedicated nodes we have ready for this purpose.

In this guide, even though it is **highly recommended** that you prepare your data using the [Document Stores](../../sidekick-studio/documents) before upserting to a Vector Store, we will go through the entire process by using the specific nodes required for this end, outlining the steps, advantages of this approach, and optimization strategies for efficient data handling.

## Understanding the upserting process

The first thing we need to understand is that the upserting data process to a [Vector Store](../../sidekick-studio/chatflows/vector-stores/) is a fundamental piece for the formation of a [Retrieval Augmented Generation (RAG)](multiple-documents-qna.md) system. However, once this process is finished, the RAG can be executed independently.

In other words, in AnswerAgentAI you can upsert data without a full RAG setup, and you can run your RAG without the specific nodes used in the upsert process, meaning that although a well-populated vector store is crucial for RAG to function, the actual retrieval and generation processes don't require continuous upserting.

<figure><img src="/.gitbook/assets/ud_01.png" alt="" /><figcaption><p>Upsert vs. RAG</p></figcaption></figure>

## Setup

Let's say we have a long dataset in PDF format that we need to upsert to our [Upstash Vector Store](../../sidekick-studio/chatflows/vector-stores/upstash-vector.md) so we could instruct an LLM to retrieve specific information from that document.

In order to do that, and for illustrating this tutorial, we would need to create an **upserting flow** with 5 different nodes:

<figure><img src="/.gitbook/assets/UD_02.png" alt="" /><figcaption><p>Upserting Flow</p></figcaption></figure>

## 1. Document Loader

The first step is to **upload our PDF data into the AnswerAgentAI instance** using a [Document Loader node](../../sidekick-studio/chatflows/document-loaders/). Document Loaders are specialized nodes that handle the ingestion of various document formats, including **PDFs**, **TXT**, **CSV**, Notion pages, and more.

It is important to mention that every Document Loader comes with two important **additional parameters** that allow us to add and omit metadata from our dataset at will.

<figure><img src="/.gitbook/assets/UD_03.png" alt="" width="375" /><figcaption><p>Additional Parameters</p></figcaption></figure>

:::info
**Tip**: The add/omit metadata parameters, although they are optional, are very useful for targeting our dataset once it is upserted in a Vector Store or for removing unnecessary metadata from it.
:::

## 2. Text Splitter

Once we have uploaded our PDF or datset, we need to **split it into smaller pieces, documents, or chunks**. This is a crucial preprocessing step for 2 main reasons:

-   **Retrieval speed and relevance:** Storing and querying large documents as single entities in a vector database can lead to slower retrieval times and potentially less relevant results. Splitting the document into smaller chunks allows for more targeted retrieval. By querying against smaller, more focused units of information, we can achieve faster response times and improve the precision of the retrieved results.
-   **Cost-effective:** Since we only retrieve relevant chunks rather than the entire document, the number of tokens processed by the LLM is significantly reduced. This targeted retrieval approach directly translates to lower usage costs for our LLM, as billing is typically based on token consumption. By minimizing the amount of irrelevant information sent to the LLM, we also optimize for cost.

### Nodes

In AnswerAgentAI, this splitting process is accomplished using the [Text Splitter nodes](../../sidekick-studio/chatflows/text-splitters/). Those nodes provide a range of text segmentation strategies, including:

-   **Character Text Splitting:** Dividing the text into chunks of a fixed number of characters. This method is straightforward but may split words or phrases across chunks, potentially disrupting context.
-   **Token Text Splitting:** Segmenting the text based on word boundaries or tokenization schemes specific to the chosen embedding model. This approach often leads to more semantically coherent chunks, as it preserves word boundaries and considers the underlying linguistic structure of the text.
-   **Recursive Character Text Splitting:** This strategy aims to divide text into chunks that maintain semantic coherence while staying within a specified size limit. It's particularly well-suited for hierarchical documents with nested sections or headings. Instead of blindly splitting at the character limit, it recursively analyzes the text to find logical breakpoints, such as sentence endings or section breaks. This approach ensures that each chunk represents a meaningful unit of information, even if it slightly exceeds the target size.
-   **Markdown Text Splitter:** Designed specifically for markdown-formatted documents, this splitter logically segments the text based on markdown headings and structural elements, creating chunks that correspond to logical sections within the document.
-   **Code Text Splitter:** Tailored for splitting code files, this strategy considers code structure, function definitions, and other programming language-specific elements to create meaningful chunks that are suitable for tasks like code search and documentation.
-   **HTML-to-Markdown Text Splitter:** This specialized splitter first converts HTML content to Markdown and then applies the Markdown Text Splitter, allowing for structured segmentation of web pages and other HTML documents.

The Text Splitter nodes provide granular control over text segmentation, allowing for customization of parameters such as:

-   **Chunk Size:** The desired maximum size of each chunk, usually defined in characters or tokens.
-   **Chunk Overlap:** The number of characters or tokens to overlap between consecutive chunks, useful for maintaining contextual flow across chunks.

:::info
**Tip:** Note that Chunk Size and Chunk Overlap values are not additive. Selecting `chunk_size=1200` and `chunk_overlap=400` does not result in a total chunk size of 1600. The overlap value determines the number of tokens from the preceding chunk included in the current chunk to maintain context. It does not increase the overall chunk size.
:::

### Undertanding Chunk Overlap

In the context of vector-based retrieval and LLM querying, chunk overlap plays an **important role in maintaining contextual continuity** and **improving response accuracy**, especially when dealing with limited retrieval depth or **top K**, which is the parameter that determines the maximum number of most similar chunks that are retrieved from the [Vector Store](../../sidekick-studio/chatflows/vector-stores/) in response to a query.

During query processing, the LLM executes a similarity search against the Vector Store to retrieve the most semantically relevant chunks to the given query. If the retrieval depth, represented by the top K parameter, is set to a small value, 4 for default, the LLM initially uses information only from these 4 chunks to generate its response.

This scenario presents us with a problem, since relying solely on a limited number of chunks without overlap can lead to incomplete or inaccurate answers, particularly when dealing with queries that require information spanning multiple chunks.

Chunk overlap helps with this issue by ensuring that a portion of the textual context is shared across consecutive chunks, **increasing the likelihood that all relevant information for a given query is contained within the retrieved chunks**.

In other words, this overlap serves as a bridge between chunks, enabling the LLM to access a wider contextual window even when limited to a small set of retrieved chunks (top K). If a query relates to a concept or piece of information that extends beyond a single chunk, the overlapping regions increase the likelihood of capturing all the necessary context.

Therefore, by introducing chunk overlap during the text splitting phase, we enhance the LLM's ability to:

1. **Preserve contextual continuity:** Overlapping chunks provide a smoother transition of information between consecutive segments, allowing the model to maintain a more coherent understanding of the text.
2. **Improve retrieval accuracy:** By increasing the probability of capturing all relevant information within the target top K retrieved chunks, overlap contributes to more accurate and contextually appropriate responses.

### Accuracy vs. Cost

So, to further optimize the trade-off between retrieval accuracy and cost, two primary strategies can be used:

1. **Increase/Decrease Chunk Overlap:** Adjusting the overlap percentage during text splitting allows for fine-grained control over the amount of shared context between chunks. Higher overlap percentages generally lead to improved context preservation but may also increase costs since you would need to use more chunks to encompass the entire document. Conversely, lower overlap percentages can reduce costs but risk losing key contextual information between chunks, potentially leading to less accurate or incomplete answers from the LLM.
2. **Increase/Decrease Top K:** Raising the default top K value (4) expands the number of chunks considered for response generation. While this can improve accuracy, it also increases cost.

:::info
**Tip:** The choice of optimal **overlap** and **top K** values depends on factors such as document complexity, embedding model characteristics, and the desired balance between accuracy and cost. Experimentation with these values is important for finding the ideal configuration for a specific need.
:::

## 3. Embedding

We have now uploaded our dataset and configured how our data is going to be split before it gets upserted to our [Vector Store](../../sidekick-studio/chatflows/vector-stores/). At this point, [the embedding nodes](../../sidekick-studio/chatflows/embeddings/) come into play, **converting all those chunks into a "language" that an LLM can easily understand**.

In this current context, embedding is the process of converting text into a numerical representation that captures its meaning. This numerical representation, also called the embedding vector, is a multi-dimensional array of numbers, where each dimension represents a specific aspect of the text's meaning.

These vectors allow LLMs to compare and search for similar pieces of text within the vector store by measuring the distance or similarity between them in this multi-dimensional space.

### Understanding Embeddings/Vector Store dimensions

The number of dimensions in a Vector Store index is determined by the embedding model used when we upsert our data, and vice versa. Each dimension represents a specific feature or concept within the data. For example, a **dimension** might **represent a particular topic, sentiment, or other aspect of the text**.

The more dimensions we use to embed our data, the greater the potential for capturing nuanced meaning from our text. However, this increase comes at the cost of higher computational requirements per query.

In general, a larger number of dimensions needs more resources to store, process, and compare the resulting embedding vectors. Therefore, embeddings models like the Google `embedding-001`, which uses 768 dimensions, are, in theory, cheaper than others like the OpenAI `text-embedding-3-large`, with 3072 dimensions.

It's important to note that the **relationship between dimensions and meaning capture isn't strictly linear**; there's a point of diminishing returns where adding more dimensions provides negligible benefit for the added unnecessary cost.

:::info
**Tip:** To ensure compatibility between an embedding model and a Vector Store index, dimensional alignment is essential. Both **the model and the index must utilize the same number of dimensions for vector representation**. Dimensionality mismatch will result in upsertion errors, as the Vector Store is designed to handle vectors of a specific size determined by the chosen embedding model.
:::

## 4. Vector Store

The [Vector Store node](../../sidekick-studio/chatflows/vector-stores/) is the **end node of our upserting flow**. It acts as the bridge between our AnswerAgentAI instance and our vector database, enabling us to send the generated embeddings, along with any associated metadata, to our target Vector Store index for persistent storage and subsequent retrieval.

It is in this node where we can set parameters like "**top K**", which, as we said previously, is the parameter that determines the maximum number of most similar chunks that are retrieved from the Vector Store in response to a query.

<figure><img src="/.gitbook/assets/UD_04.png" alt="" width="375" /><figcaption></figcaption></figure>

:::info
**Tip:** A lower top K value will yield fewer but potentially more relevant results, while a higher value will return a broader range of results, potentially capturing more information.
:::

## 5. Record Manager

The [Record Manager node](../../sidekick-studio/documents/record-manager.md) is an optional but incredibly useful addition to our upserting flow. It allows us to maintain records of all the chunks that have been upserted to our Vector Store, enabling us to efficiently add or delete chunks as needed.

For a more in-depth guide, we refer you to [this guide](../../sidekick-studio/documents/record-manager.md).

<figure><img src="/.gitbook/assets/UD_05.png" alt="" width="375" /><figcaption></figcaption></figure>

## 6. Full Overview

Finally, let's examine each stage, from initial document loading to the final vector representation, highlighting the key components and their roles in the upserting process.

<figure><img src="/.gitbook/assets/UD_06.png" alt="" /><figcaption></figcaption></figure>

1. **Document Ingestion**:
    - We begin by feeding our raw data into AnswerAgentAI using the appropriate **Document Loader node** for your data format.
2. **Strategic Splitting**
    - Next, the **Text Splitter node** divides our document into smaller, more manageable chunks. This is crucial for efficient retrieval and cost control.
    - We have flexibility in how this splitting happens by selecting the appropriate text splitter node and, importantly, by fine-tuning chunk size and chunk overlap to balance context preservation with efficiency.
3. **Meaningful Embeddings**
    - Now, just before our data is going to be recorded in the Vector Store, the **Embedding node** steps in. It transforms each text chunk and its meaning into a numerical representation that our LLM can understand.
4. **Vector Store Index**
    - Finally, the **Vector Store node** acts as the bridge between AnswerAgentAI and our database. It sends our embeddings, along with any associated metadata, to the designated Vector Store index.
    - Here, in this node, we can control the retrieval behavior by setting the **top K** parameter, which influences how many chunks are considered when answering a query.
5. **Data Ready**
    - Once upserted, our data is now represented as vectors within the Vector Store, ready for similarity search and retrieval.
6. **Record Keeping (Optional)**
    - For enhanced control and management data, the **Record Manager** node keeps track of all upserted chunks. This facilitates easy updates or removals as your data or needs evolve.

In essence, the upserting process transforms our raw data into an LLM-ready format, optimized for fast and cost-effective retrieval.
