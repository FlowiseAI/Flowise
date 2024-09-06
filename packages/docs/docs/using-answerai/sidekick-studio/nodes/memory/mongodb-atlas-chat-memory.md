---
description: Store conversation history in MongoDB Atlas for AnswerAI workflows
---

# MongoDB Atlas Chat Memory

## Overview

The MongoDB Atlas Chat Memory node allows you to store conversation history in a MongoDB Atlas database. This feature enables long-term memory storage for your AnswerAI workflows, allowing chatbots and AI assistants to maintain context across multiple sessions or interactions.

## Key Benefits

-   Persistent storage of conversation history in a scalable, cloud-based database
-   Ability to maintain context across multiple user sessions
-   Flexible configuration options for database and collection management

## How to Use

1. Add the MongoDB Atlas Chat Memory node to your AnswerAI workflow canvas.
2. Configure the node with the following settings:

    a. Connect Credential: Select or add your MongoDB Atlas connection credentials.
    b. Database: Enter the name of the database you want to use.
    c. Collection Name: Specify the name of the collection to store conversation history.
    d. Session Id (optional): Enter a unique identifier for the conversation session.
    e. Memory Key (optional): Set a custom key for storing the chat history (default is 'chat_history').

3. Connect the MongoDB Atlas Chat Memory node to other nodes in your workflow that require access to conversation history.

<!-- TODO: Add a screenshot of the MongoDB Atlas Chat Memory node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/monogdbchatmemory.png" alt="" /><figcaption><p> MonoDB Atlas Chat Memory Node Configuration In a Workflow &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use unique session IDs for different users or conversation threads to keep histories separate.
2. Implement proper security measures to protect sensitive conversation data stored in MongoDB Atlas.
3. Regularly monitor and manage your MongoDB Atlas database to ensure optimal performance and storage utilization.
4. Consider implementing a data retention policy to manage the growth of your conversation history database.

## Troubleshooting

1. Connection issues:

    - Verify that your MongoDB Atlas connection URL is correct and that your IP address is whitelisted in the Atlas dashboard.
    - Ensure that your MongoDB Atlas cluster is running and accessible.

2. Data not being stored or retrieved:

    - Double-check that the database name and collection name are correctly specified in the node configuration.
    - Verify that the session ID is being properly set and managed in your workflow.

3. Performance concerns:
    - If you experience slow response times, consider indexing frequently queried fields in your MongoDB collection.
    - For large-scale applications, implement database sharding to distribute data across multiple servers.

<!-- TODO: Add a screenshot showing where to find logs or error messages related to the MongoDB Atlas Chat Memory node -->

By utilizing the MongoDB Atlas Chat Memory node, you can enhance your AnswerAI workflows with robust, scalable, and persistent conversation storage, enabling more context-aware and personalized AI interactions.
