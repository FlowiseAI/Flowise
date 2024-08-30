---
description: Upsert embedded data and perform similarity search using SingleStore
---

# SingleStore Vector Store

## Overview

The SingleStore Vector Store node in AnswerAI allows you to store and retrieve embedded data using SingleStore, a fast and distributed cloud relational database. This node enables efficient similarity searches on your vector data.

## Key Benefits

-   Fast and efficient similarity searches on vector data
-   Seamless integration with SingleStore's distributed cloud database
-   Flexible configuration options for customizing your vector store

## How to Use

1. Add the SingleStore Vector Store node to your AnswerAI workflow canvas.
2. Configure the node with the following inputs:

    - **Document**: (Optional) The document or list of documents to be stored in the vector store.
    - **Embeddings**: The embedding model to use for converting text into vector representations.
    - **Host**: The hostname of your SingleStore database.
    - **Database**: The name of the database to use.
    - **Table Name**: (Optional) The name of the table to store the vectors (default: "embeddings").
    - **Content Column Name**: (Optional) The name of the column to store the document content (default: "content").
    - **Vector Column Name**: (Optional) The name of the column to store the vector data (default: "vector").
    - **Metadata Column Name**: (Optional) The name of the column to store metadata (default: "metadata").
    - **Top K**: (Optional) The number of top results to retrieve in similarity searches (default: 4).

3. Connect the SingleStore Vector Store node to other nodes in your workflow as needed.

<!-- TODO: Add a screenshot showing the SingleStore Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/singlestore.png" alt="" /><figcaption><p> Singlestore Vector Store node   &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure that you have the necessary credentials to connect to your SingleStore database. You can set up a credential in AnswerAI for secure access.
2. When using the SingleStore Vector Store for the first time, make sure to upsert documents to populate the database before performing similarity searches.
3. Experiment with different "Top K" values to find the optimal number of results for your specific use case.
4. Use meaningful names for your table and column names to make your database structure more organized and easier to understand.

## Troubleshooting

1. **Connection issues**: If you're having trouble connecting to your SingleStore database, double-check your host, database name, and credentials. Ensure that your firewall settings allow connections to the database.

2. **Slow performance**: If queries are running slowly, consider optimizing your SingleStore database configuration or increasing the resources allocated to your database instance.

3. **Unexpected results**: If you're not getting the expected results from similarity searches, verify that your documents were properly upserted and that the embedding model used for querying matches the one used for document insertion.

<!-- TODO: Add a screenshot showing a successful SingleStore Vector Store connection and query result -->
