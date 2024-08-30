---
description: Upsert embedded data and perform similarity search using pgvector on Postgres
---

# Postgres Vector Store

## Overview

The Postgres Vector Store node in AnswerAI allows you to store and retrieve embedded data using pgvector on a PostgreSQL database. This feature enables efficient similarity searches on high-dimensional vectors, making it ideal for various AI and machine learning applications.

## Key Benefits

-   Efficient storage and retrieval of vector embeddings
-   Seamless integration with PostgreSQL databases
-   Supports similarity search for advanced querying capabilities

## How to Use

1. Add the Postgres Vector Store node to your AnswerAI workflow canvas.
2. Configure the node with the following parameters:

    - Connect Credential: Select or create a PostgresAPI credential
    - Document: (Optional) Input the documents to be stored
    - Embeddings: Select the embeddings model to use
    - Record Manager: (Optional) Select a record manager to prevent duplication
    - Host: Enter the PostgreSQL server host
    - Database: Specify the database name
    - Port: (Optional) Enter the PostgreSQL server port (default: 6432)
    - Table Name: (Optional) Specify the table name for storing vectors (default: "documents")
    - Additional Configuration: (Optional) Add any extra configuration in JSON format
    - Top K: (Optional) Set the number of top results to fetch (default: 4)

3. Connect the node to other components in your workflow as needed.

<!-- TODO: Add a screenshot of the Postgres Vector Store node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/postgress.png" alt="" /><figcaption><p> Postgres Vector Store node configuration  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure that your PostgreSQL database has the pgvector extension installed and enabled.
2. Use appropriate indexing strategies for optimal performance, especially for large datasets.
3. Consider using a Record Manager to prevent duplicate entries when upserting documents.
4. Adjust the "Top K" value based on your specific use case and desired number of results.

## Troubleshooting

1. Connection issues:

    - Verify that the host, port, database name, and credentials are correct.
    - Ensure that the PostgreSQL server is accessible from your AnswerAI instance.

2. Performance problems:

    - Check if appropriate indexes are in place for the vector columns.
    - Consider increasing the "Top K" value if you're not getting enough results.

3. Errors related to pgvector:
    - Confirm that the pgvector extension is properly installed and enabled in your PostgreSQL database.

<!-- TODO: Add a screenshot showing common error messages and their solutions -->

If you encounter persistent issues, consult the AnswerAI documentation or reach out to support for further assistance.
