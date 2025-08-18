---
description: Summarizes the conversation and stores the memory in Zep server
---

# Zep Memory

## Feature Title: Zep Memory - Open Source

## Overview

Zep Memory is a powerful long-term memory store for LLM applications in AnswerAgentAI. It stores, summarizes, embeds, indexes, and enriches chatbot histories, making them accessible through simple, low-latency APIs. This feature allows your AnswerAgentAI workflows to maintain context and remember previous conversations efficiently.

## Key Benefits

-   Long-term memory storage for chatbots and LLM applications
-   Efficient summarization and indexing of conversation histories
-   Easy integration with AnswerAgentAI workflows

## How to Use (Zep Cloud Node)

1. Add the Zep Memory - Cloud node to your AnswerAgentAI workflow canvas.
2. Configure the node settings:
    - Connect your Zep Memory API credential (optional)
    - Set a Session ID (optional)
    - Choose the Memory Type (perpetual or message_window)
    - Customize prefixes and keys as needed

<!-- TODO: Add a screenshot of the Zep Memory - Cloud node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/zepmemory.png" alt="" /><figcaption><p> Zep Memory Cloud Node Configuration Panel &#x26; Drop UI</p></figcaption></figure>

3. Connect the Zep Memory - Cloud node to your conversation flow.
4. Run your workflow to utilize Zep's cloud-based memory storage.

## Tips and Best Practices

1. Use a consistent Session ID for related conversations to maintain context over time.
2. Choose the appropriate Memory Type based on your use case:
    - "perpetual" for ongoing, long-term conversations
    - "message_window" for conversations with a limited context window
3. Customize the AI and Human prefixes to match your conversation style.
4. Utilize the Memory Key, Input Key, and Output Key to organize your data effectively.

## Troubleshooting

1. **Authentication Issues**: Ensure your Zep Memory API credential is correctly configured in AnswerAgentAI.
2. **Missing Context**: Verify that the Session ID is consistent across related conversations.
3. **Unexpected Behavior**: Double-check the Memory Type setting to ensure it aligns with your intended use case.

### Advanced Configuration

The Zep Memory - Cloud node offers several advanced configuration options:

-   **Session ID**: A unique identifier for the conversation. If not specified, a random ID will be generated.
-   **Memory Type**: Choose between "perpetual" (default) or "message_window" to control how memory is managed.
-   **AI Prefix**: The prefix used to identify AI-generated messages (default: "ai").
-   **Human Prefix**: The prefix used to identify human-generated messages (default: "human").
-   **Memory Key**: The key used to store and retrieve memory data (default: "chat_history").
-   **Input Key**: The key used for input data (default: "input").
-   **Output Key**: The key used for output data (default: "text").

<!-- TODO: Add a screenshot highlighting the advanced configuration options -->
<figure><img src="/.gitbook/assets/screenshots/zepmemoryadvanced.png" alt="" /><figcaption><p> Zep Memory Cloud Node Configuration Panel &#x26; Drop UI</p></figcaption></figure>

By leveraging these options, you can fine-tune the Zep Memory - Cloud node to best suit your specific use case and integration requirements.

## How to Use (Custom Server)

1. Deploy a Zep server (see deployment guides below)
2. In your AnswerAgentAI canvas, add the Zep Memory node to your workflow
3. Configure the Zep Memory node with your Zep server's base URL
4. Connect the Zep Memory node to your conversation flow
5. Save and run your workflow

### Configuring the Zep Memory Node

1. Base URL: Enter the URL of your deployed Zep server (e.g., `http://127.0.0.1:8000`)
2. Session ID: (Optional) Specify a custom session ID or leave blank for a random ID
3. Size: Set the number of recent messages to use as context (default: 10)
4. AI Prefix: Set the prefix for AI messages (default: 'ai')
5. Human Prefix: Set the prefix for human messages (default: 'human')
6. Memory Key: Set the key for storing memory (default: 'chat_history')
7. Input Key: Set the key for input values (default: 'input')
8. Output Key: Set the key for output values (default: 'text')

## Tips and Best Practices

1. Use a consistent Session ID for related conversations to maintain context across multiple interactions
2. Adjust the Size parameter based on your application's needs for balancing context and performance
3. Regularly monitor your Zep server's performance and scale as needed
4. Implement proper security measures, including JWT authentication, for production deployments

## Troubleshooting

1. Connection issues: Ensure your Zep server is running and accessible from your AnswerAgentAI instance
2. Memory not persisting: Verify that the Session ID is consistent across interactions
3. Slow performance: Consider adjusting the Size parameter or scaling your Zep server

## Deployment Guides (Custom Server)

### Deploying Zep to Render

1. Go to the [Zep GitHub repository](https://github.com/getzep/zep#quick-start)
2. Click the "Deploy to Render" button
3. On Render's Blueprint page, click "Create New Resources"
4. Wait for the deployment to complete
5. Copy the deployed URL from the "zep" application in your Render dashboard

<!-- TODO: Screenshot of Render dashboard showing the deployed Zep application -->

### Deploying Zep to Digital Ocean (via Docker)

1. Clone the Zep repository:

    ```
    git clone https://github.com/getzep/zep.git
    cd zep
    ```

2. Create and edit the `.env` file:

    ```
    nano .env
    ```

3. Add your OpenAI API Key to the `.env` file:

    ```
    ZEP_OPENAI_API_KEY=your_api_key_here
    ```

4. Build and run the Docker container:

    ```
    docker compose up -d --build
    ```

5. Allow firewall access to port 8000:

    ```
    sudo ufw allow from any to any port 8000 proto tcp
    ufw status numbered
    ```

    Note: If using Digital Ocean's dashboard firewall, ensure port 8000 is added there as well.

## Zep Authentication

To secure your Zep instance using JWT authentication:

1. Download the `zepcli` utility from the [releases page](https://github.com/getzep/zepcli/releases)

2. Generate a secret and JWT token:

    - On Linux or macOS: `./zepcli -i`
    - On Windows: `zepcli.exe -i`

3. Configure auth environment variables on your Zep server:

    ```
    ZEP_AUTH_REQUIRED=true
    ZEP_AUTH_SECRET=<the secret you generated>
    ```

4. In AnswerAgentAI, create a new credential for Zep:

    - Add a new credential
    - Enter the JWT Token in the API Key field

5. Use the created credential in the Zep Memory node:
    - Select the credential in the "Connect Credential" field of the Zep Memory node

<!-- TODO: Screenshot of the Zep Memory node configuration with the credential selected -->
<figure><img src="/.gitbook/assets/screenshots/zepmemoryapi.png" alt="" /><figcaption><p> Zep Memory Node Credential &#x26; Drop UI</p></figcaption></figure>

By following these steps, you'll have a secure, authenticated connection between your AnswerAgentAI workflow and your Zep memory server.
