---
description: Store conversation history in Amazon DynamoDB
---

# DynamoDB Chat Memory

## Overview

The DynamoDB Chat Memory feature allows you to store and retrieve conversation history using Amazon DynamoDB. This powerful integration enables long-term persistence of chat messages, making it ideal for applications that require durable and scalable conversation storage.

## Key Benefits

-   **Persistent Storage**: Safely store conversation history in a reliable and scalable AWS service.
-   **Seamless Integration**: Easily incorporate long-term memory into your AnswerAgentAI workflows.
-   **Flexible Configuration**: Customize settings to match your specific DynamoDB setup and requirements.

## How to Use

1. Add the "DynamoDB Chat Memory" node to your AnswerAgentAI canvas.
2. Configure the node with the following required parameters:

    - Table Name: The name of your DynamoDB table
    - Partition Key: The primary key for your table
    - Region: The AWS region where your table is located (e.g., "us-east-1")

3. (Optional) Set additional parameters:

    - Session ID: A unique identifier for the conversation (if not specified, a random ID will be generated)
    - Memory Key: The key used to store the chat history (default is "chat_history")

4. Connect your AWS credentials:

    - Click on the "Connect Credential" option
    - Select or create a credential of type "dynamodbMemoryApi"
    - Provide your AWS Access Key ID and Secret Access Key

5. Connect the DynamoDB Chat Memory node to other nodes in your workflow that require access to conversation history.

<!-- TODO: Screenshot of the DynamoDB Chat Memory node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/dynamochatmemory.png" alt="" /><figcaption><p> Dynamo Chat Memory Node Configuration &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Ensure your DynamoDB table is set up with the correct partition key before using this feature.
2. Use a consistent session ID across interactions to maintain continuity in long-running conversations.
3. Implement proper security measures to protect your AWS credentials and access to the DynamoDB table.
4. Monitor your DynamoDB usage to optimize cost and performance.

## Troubleshooting

1. **Connection Issues**:

    - Verify that your AWS credentials are correct and have the necessary permissions to access the DynamoDB table.
    - Check if the specified AWS region matches the location of your DynamoDB table.

2. **Data Not Persisting**:

    - Ensure the table name and partition key are correctly specified.
    - Verify that the session ID is consistent across interactions if you're trying to retrieve previous conversation history.

3. **Performance Concerns**:
    - If you experience slow response times, consider optimizing your DynamoDB table's read and write capacity units.

For more advanced usage and integration details, refer to the AnswerAgentAI API documentation on DynamoDB Chat Memory implementation.

<!-- TODO: Screenshot showing a successful integration of DynamoDB Chat Memory in an AnswerAgentAI workflow -->
<figure><img src="/.gitbook/assets/screenshots/dynamochatmemoryinaworkflow.png" alt="" /><figcaption><p> Dynamo Chat Memory Node Configuration In a Workflow &#x26; Drop UI</p></figcaption></figure>
