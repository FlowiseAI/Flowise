---
description: Learn how to use the Flowise Document Stores
---

# Document Stores

---

Flowise's Document Stores offer a versatile approach to data management, enabling you to upload, split, and prepare your data for upserting your datasets in a single location.

This centralized approach simplifies data handling and allows for efficient management of various data formats, making it easier to organize and access your data within the Flowise app.

## Setup

In this tutorial, we will set up a [Retrieval Augmented Generation (RAG)](../../developers/use-cases/multiple-documents-qna.md) system to retrieve information about the _LibertyGuard Deluxe Homeowners Policy_, a topic that LLMs are likely not extensively trained on.

Using the **Flowise Document Stores**, we'll prepare and upsert data about LibertyGuard and its set of home insurance policies. This will enable our RAG system to accurately answer user queries about LibertyGuard's home insurance offerings.

## 1. Add a Document Store

-   Start by adding a Document Store and naming it. In our case, "LibertyGuard Deluxe Homeowners Policy".

<figure><img src="/.gitbook/assets/ds01.png" alt="" /><figcaption></figcaption></figure>

## 2. Select a Document Loader

-   Enter the Document Store we just created and select the [Document Loader](../../sidekick-studio/chatflows/document-loaders/) you want to use. In our case, since our dataset is in PDF format, we'll use the [PDF Loader](../../sidekick-studio/chatflows/document-loaders/pdf-file.md).

<figure><img src="/.gitbook/assets/ds02.png" alt="" /><figcaption></figcaption></figure>

<figure><img src="/.gitbook/assets/ds03.png" alt="" /><figcaption></figcaption></figure>

## 3. Preparing your data

-   First, we start by uploading our PDF file.
-   Then, we add a **unique metadata key**. This is optional, but a good practice as it allows us to target and filter down this same dataset later on if we need to.

<figure><img src="/.gitbook/assets/ds04.png" alt="" /><figcaption></figcaption></figure>

-   Finally, select the [Text Splitter](../../sidekick-studio/chatflows/text-splitters/) you want to use to chunk your data. In our particular case, we will use the [Recursive Character Text Splitter](../../sidekick-studio/chatflows/text-splitters/recursive-character-text-splitter.md).

:::info
In this guide, we've added a generous **Chunk Overlap** size to ensure no relevant data gets missed between chunks. However, the optimal overlap size is dependent on the complexity of your data. You may need to adjust this value based on your specific dataset and the nature of the information you want to extract.
:::

<figure><img src="/.gitbook/assets/ds05.png" alt="" /><figcaption></figcaption></figure>

## 4. Preview your data

-   We can now preview how our data will be chunked using our current [Text Splitter](../../sidekick-studio/chatflows/text-splitters/) configuration; `chunk_size=1500`and `chunk_overlap=750`.

<figure><img src="/.gitbook/assets/ds06.png" alt="" /><figcaption></figcaption></figure>

-   It's important to experiment with different [Text Splitters](../../sidekick-studio/chatflows/text-splitters/), Chunk Sizes, and Overlap values to find the optimal configuration for your specific dataset. This preview allows you to refine the chunking process and ensure that the resulting chunks are suitable for your RAG system.

<figure><img src="/.gitbook/assets/ds07.png" alt="" /><figcaption></figcaption></figure>

:::info
Note that our custom metadata `company: "liberty"` has been inserted into each chunk. This metadata allows us to easily filter and retrieve information from this specific dataset later on, even if we use the same vector store index for other datasets.
:::

## 5. Process your data

-   Once you are satisfied with the chunking process, it's time to process your data.

<figure><img src="/.gitbook/assets/ds08.png" alt="" /><figcaption></figcaption></figure>

<figure><img src="/.gitbook/assets/ds09%20(1).png" alt="" /><figcaption></figcaption></figure>

Note that once you have processed your data, you will be able to **edit your chunks** by deleting or adding data to them. This is beneficial if:

-   **You discover inaccuracies or inconsistencies in the original data:** Editing chunks allows you to correct errors and ensure the information is accurate.
-   **You want to refine the content for better relevance:** You can adjust chunks to emphasize specific information or remove irrelevant sections.
-   **You need to tailor chunks for specific queries:** By editing chunks, you can make them more targeted to the types of questions you expect to receive.

<figure><img src="/.gitbook/assets/ds10.png" alt="" /><figcaption></figcaption></figure>

## 6. Add your Document Store node to your flow

-   Now that our dataset is ready to be upserted, it's time to go to your RAG chatflow / agentflow and add the [Document Store node](../../sidekick-studio/chatflows/document-loaders/document-store.md) under the **LangChain > Document Loader** section.

<figure><img src="/.gitbook/assets/ds11.png" alt="" /><figcaption></figcaption></figure>

## 7. Upsert your data to a Vector Store

-   Upsert your dataset to your [Vector Store](../../sidekick-studio/chatflows/vector-stores/) by clicking the green button in the right corner of your flow. We used the [Upstash Vector Store](../../sidekick-studio/chatflows/vector-stores/upstash-vector.md) in our implementation.

<figure><img src="/.gitbook/assets/ds12.png" alt="" /><figcaption></figcaption></figure>

<figure><img src="/.gitbook/assets/ds13.png" alt="" /><figcaption></figcaption></figure>

## 8. Test your RAG

-   Finally, our Retrieval-Augmented Generation (RAG) system is operational. It's noteworthy how the LLM effectively interprets the query and successfully leverages relevant information from the chunked data to construct a comprehensive response.

<figure><img src="/.gitbook/assets/ds15.png" alt="" /><figcaption></figcaption></figure>

## 9. Summary

We started by creating a Document Store to organize the LibertyGuard Deluxe Homeowners Policy data. This data was then prepared by uploading, chunking, processing, and upserting it, making it ready for our RAG system.

### Key benefits of using the Document Stores

-   **Organization and Management:** The Document Store provides a centralized location for storing, managing, and preparing our data.
-   **Data Quality:** The chunking process helps ensure that our data is structured in a way that facilitates accurate retrieval and analysis.
-   **Flexibility:** The Document Store allows us to refine and adjust our data as needed, improving the accuracy and relevance of our RAG system.
