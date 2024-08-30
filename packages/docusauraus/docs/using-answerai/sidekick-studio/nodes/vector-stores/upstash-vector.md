---
description: Store and retrieve vector embeddings using Upstash Vector
---

# Upstash Vector Store

## Overview

The Upstash Vector Store node allows you to store and retrieve vector embeddings using Upstash, a serverless data platform. This feature enables efficient similarity searches and management of high-dimensional numerical vectors.

## Key Benefits

-   Serverless vector database for easy scalability
-   Fast similarity searches for improved query performance
-   Seamless integration with AnswerAI workflows

## How to Use

### Prerequisites

1.  Sign up or sign in to the [Upstash Console](https://console.upstash.com)
2.  Navigate to the Vector page and click **Create Index**
    <!-- TODO: Screenshot of Upstash Console Vector page -->
    <figure><img src="/.gitbook/assets/screenshots/upstashpage.png" alt="" /><figcaption><p> Upstash Console Vector page   &#x26; Drop UI</p></figcaption></figure>

3.  Configure and create the index:
    -   **Index Name**: Choose a name for your index (e.g., "answerai-upstash-demo")
    -   **Dimensions**: Set the size of the vectors to be inserted (e.g., 1536)
    -   **Embedding Model**: (Optional) Select a model from [Upstash Embeddings](https://upstash.com/docs/vector/features/embeddingmodels)
        <!-- TODO: Screenshot of Create Index form -->
            <figure><img src="/.gitbook/assets/screenshots/upstashindex.png" alt="" /><figcaption><p> Upstash Console Index form   &#x26; Drop UI</p></figcaption></figure>

### Setup in AnswerAI

1. Obtain your index credentials from the Upstash Console
       <!-- TODO: Screenshot of Upstash credentials page -->
    <figure><img src="/.gitbook/assets/screenshots/upstashvectorapi.png" alt="" /><figcaption><p> Upstash Console Index form   &#x26; Drop UI</p></figcaption></figure>

2. In AnswerAI, create a new Upstash Vector credential:
    - Enter the Upstash Vector REST URL (UPSTASH_VECTOR_REST_URL)
    - Enter the Upstash Vector REST Token (UPSTASH_VECTOR_REST_TOKEN)
      <!-- TODO: Screenshot of AnswerAI credential creation form -->

<figure><img src="/.gitbook/assets/screenshots/upstashapipage.png" alt="" /><figcaption><p> Upstash Console Index form   &#x26; Drop UI</p></figcaption></figure>

3.  Add a new **Upstash Vector** node to your canvas
       <!-- TODO: Screenshot of Upstash Vector node in AnswerAI canvas -->
    <figure><img src="/.gitbook/assets/screenshots/upstashvectorstore.png" alt="" /><figcaption><p> Upstash Vector Store node   &#x26; Drop UI</p></figcaption></figure>

4.  Connect additional nodes to the Upstash Vector node:

    -   Connect a **Document Loader** node to provide input documents
    -   Connect an **Embeddings** node to generate vector embeddings
        <!-- TODO: Screenshot of connected nodes in AnswerAI canvas -->
            <figure><img src="/.gitbook/assets/screenshots/upstashvectorinaworkflow.png" alt="" /><figcaption><p> Upstash Vector Store node in a workflow &#x26; Drop UI</p></figcaption></figure>

5.  Configure the Upstash Vector node:

    -   Select the Upstash Vector credential you created earlier
    -   (Optional) Set a metadata filter to refine your searches
    -   (Optional) Adjust the Top K value to specify the number of results to retrieve

6.  Run your workflow to start the upsert process and store your vectors

7.  Verify data storage in the [Upstash dashboard](https://console.upstash.com)
       <!-- TODO: Screenshot of Upstash dashboard showing stored data -->
    <figure><img src="/.gitbook/assets/screenshots/upstashpage.png" alt="" /><figcaption><p> Upstash Dashboard &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose an appropriate dimension size for your vectors based on your embedding model and use case
2. Use metadata filters to organize and retrieve specific subsets of your data
3. Regularly monitor your Upstash usage to optimize performance and costs
4. Consider using the optional Embedding Model feature in Upstash for simplified vector generation

## Troubleshooting

1. **Connection issues**: Ensure your Upstash Vector REST URL and Token are correctly entered in the AnswerAI credential
2. **Indexing errors**: Verify that your document format and embedding dimensions match the Upstash index configuration
3. **Slow performance**: Check your network connection and consider optimizing your vector dimensions or index size

If problems persist, consult the Upstash documentation or contact AnswerAI support for assistance.
