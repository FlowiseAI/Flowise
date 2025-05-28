# Credentials

Credentials in Sidekick Studio are secure configurations that allow you to authenticate and connect to external services and APIs. They are a crucial component for building integrations with various platforms.

## What are Credentials?

Credentials are encrypted configurations that store authentication information such as:

-   API keys
-   Access tokens
-   Usernames and passwords
-   Connection strings
-   OAuth tokens

Each credential type is designed for a specific service or platform and contains the exact fields required to authenticate with that service.

## How Credentials are Used in Nodes

Nodes in Sidekick Studio are the building blocks of your workflows (chatflows and agentflows). Many nodes require authentication to external services, which is where credentials come in:

1. **Selection**: When configuring a node that requires authentication, you'll see a "Credential" dropdown field.
2. **Reusability**: Once created, credentials can be reused across multiple nodes and workflows.
3. **Abstraction**: Credentials abstract away authentication details, allowing you to focus on building your logic.
4. **Security**: Credential values are encrypted and securely stored, never exposed in the UI or exported configurations.

### Example Node-Credential Relationships

-   **LLM nodes** (like OpenAI, Anthropic, etc.) use their respective API credentials to authenticate with AI services
-   **Vector Database nodes** (like Pinecone, Chroma, etc.) use database credentials to store and retrieve vector data
-   **Search nodes** (like Google Search, Brave Search, etc.) use search API credentials to perform web searches
-   **Integration nodes** (like Slack, Notion, etc.) use platform-specific credentials to interact with these services

## Credential Security

Credentials in Sidekick Studio are:

-   **Encrypted**: All sensitive data is encrypted at rest
-   **Never exposed**: Sensitive values are never returned to the frontend or included in exports
-   **Properly scoped**: Credentials are only accessible to workflows that specifically reference them

## Managing Credentials

You can manage credentials in Sidekick Studio through the Credentials panel:

1. **Create**: Add new credentials for any supported service
2. **Test**: Verify that credentials are valid before using them in workflows
3. **Update**: Modify existing credentials if tokens or passwords change
4. **Delete**: Remove credentials that are no longer needed

## Available Credential Types

Sidekick Studio supports a wide range of credential types across various categories:

-   **AI Services**: OpenAI, Azure OpenAI, Anthropic, Google AI, etc.
-   **Databases**: MongoDB, PostgreSQL, MySQL, Redis, etc.
-   **Vector Stores**: Pinecone, Chroma, Weaviate, etc.
-   **Search Services**: Google Search, Brave Search, etc.
-   **Content Services**: Notion, Confluence, GitHub, etc.
-   **Utility Services**: AWS, Langsmith, Langfuse, etc.

For a complete reference of all available credential types and their configuration details, see the [API Credentials Reference](./api-credentials.md).

## Best Practices

-   Create separate credentials for development and production environments
-   Regularly rotate API keys and tokens for security
-   Use the minimum required permissions when generating API keys
-   Test credentials before using them in production workflows
-   Use environment variables for credential values when possible
