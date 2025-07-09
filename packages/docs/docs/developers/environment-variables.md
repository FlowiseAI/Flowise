---
description: Environment variables for AnswerAI
---

# Environment Variables

:::info
Before you begin, ensure you have [NodeJS](https://nodejs.org/en/download) installed on your computer. AnswerAI supports Node `v18.15.0` or `v20` and above.
:::

There are three different .env files you can set environment variables for AnswerAI.

-   Root (.env)
-   Server (packages/server/.env)
-   UI (packages/ui/.env)

| Variable                      | Description                                              | File Location          |
| ----------------------------- | -------------------------------------------------------- | ---------------------- |
| PORT                          | The port number for the server to run on                 | Root, Server, UI       |
| API_PORT                      | The port number for the API server                       | UI                     |
| APIKEY_PATH                   | Path to the API key file                                 | Root, Server           |
| SECRETKEY_PATH                | Path to the secret key file                              | Root, Server           |
| LOG_PATH                      | Path to store log files                                  | Root, Server           |
| DISABLE_FLOWISE_TELEMETRY     | Disable Flowise telemetry when set to true               | Root                   |
| IFRAME_ORIGINS                | Allowed origins for iframes                              | Root                   |
| CHATFLOW_DOMAIN_OVERRIDE      | Overrides the chatflowDomain with a specified URL        | Root, Web              |
| VITE_AUTH_DOMAIN              | Auth0 domain for authentication                          | Root, UI               |
| VITE_AUTH_CLIENT_ID           | Auth0 client ID for authentication                       | Root, UI               |
| VITE_AUTH_AUDIENCE            | Auth0 audience for authentication                        | Root, UI               |
| VITE_AUTH_ORGANIZATION_ID     | Auth0 organization ID for authentication                 | Root, UI               |
| DOMAIN                        | Domain for the staging environment                       | Root                   |
| ANSWERAI_DOMAIN               | Domain for the beta environment                          | Root                   |
| DATABASE_TYPE                 | Type of database (e.g., postgres)                        | Root, Server           |
| DATABASE_USER                 | Database username                                        | Root, Server           |
| DATABASE_PASSWORD             | Database password                                        | Root, Server           |
| DATABASE_HOST                 | Database host address                                    | Root, Server           |
| DATABASE_PORT                 | Database port number                                     | Root, Server, AnswerAI |
| AUTH0_JWKS_URI                | Auth0 JSON Web Key Set URI                               | Root                   |
| AUTH0_ISSUER_BASE_URL         | Auth0 issuer base URL                                    | Root                   |
| AUTH0_BASE_URL                | Base URL for Auth0 authentication                        | Root                   |
| AUTH0_CLIENT_ID               | Auth0 client ID                                          | Root                   |
| AUTH0_CLIENT_SECRET           | Auth0 client secret                                      | Root                   |
| AUTH0_AUDIENCE                | Auth0 audience                                           | Root                   |
| AUTH0_SCOPE                   | Auth0 scope for authentication                           | Root                   |
| AUTH0_TOKEN_SIGN_ALG          | Auth0 token signing algorithm                            | Root                   |
| AUTH0_ORGANIZATION_ID         | Auth0 organization ID                                    | Root                   |
| LANGFUSE_RELEASE              | Langfuse release identifier                              | Root                   |
| LANGFUSE_SECRET_KEY           | Langfuse secret key                                      | Root                   |
| LANGFUSE_PUBLIC_KEY           | Langfuse public key                                      | Root                   |
| LANGFUSE_HOST                 | Langfuse host URL                                        | Root                   |
| AUTH_AUTH0_CLIENT_ID          | Auth0 client ID for authentication                       | Root                   |
| AUTH_AUTH0_CLIENT_SECRET      | Auth0 client secret for authentication                   | Root                   |
| AUTH_AUTH0_ISSUER             | Auth0 issuer URL for authentication                      | Root                   |
| DATABASE_URL                  | Full database connection URL                             | AnswerAI               |
| VITE_FLAGSMITH_ENVIRONMENT_ID | Flagsmith environment ID                                 | UI                     |
| NUMBER_OF_PROXIES             | Number of proxies (commented out)                        | Server                 |
| CORS_ORIGINS                  | Allowed CORS origins (commented out)                     | Server                 |
| DATABASE_NAME                 | Database name (commented out)                            | Server                 |
| DATABASE_SSL                  | Enable SSL for database connection (commented out)       | Server                 |
| DATABASE_SSL_KEY_BASE64       | Base64 encoded SSL key for database (commented out)      | Server                 |
| FLOWISE_USERNAME              | Flowise username (commented out)                         | Server                 |
| FLOWISE_PASSWORD              | Flowise password (commented out)                         | Server                 |
| FLOWISE_SECRETKEY_OVERWRITE   | Encryption key for Flowise (commented out)               | Server                 |
| FLOWISE_FILE_SIZE_LIMIT       | File size limit for Flowise (commented out)              | Server                 |
| DISABLE_CHATFLOW_REUSE        | Disable chatflow reuse when set to true (commented out)  | Server                 |
| DEBUG                         | Enable debug mode when set to true (commented out)       | Server                 |
| LOG_LEVEL                     | Logging level (commented out)                            | Server                 |
| TOOL_FUNCTION_BUILTIN_DEP     | Built-in dependencies for tool functions (commented out) | Server                 |
| TOOL_FUNCTION_EXTERNAL_DEP    | External dependencies for tool functions (commented out) | Server                 |
| LANGCHAIN_TRACING_V2          | Enable LangChain tracing v2 (commented out)              | Server                 |
| LANGCHAIN_ENDPOINT            | LangChain API endpoint (commented out)                   | Server                 |
| LANGCHAIN_API_KEY             | LangChain API key (commented out)                        | Server                 |
| LANGCHAIN_PROJECT             | LangChain project name (commented out)                   | Server                 |
| MODEL_LIST_CONFIG_JSON        | Path to model list configuration JSON (commented out)    | Server                 |
| STORAGE_TYPE                  | Storage type (local or s3) (commented out)               | Server                 |
| BLOB_STORAGE_PATH             | Path for local blob storage (commented out)              | Server                 |
| S3_STORAGE_BUCKET_NAME        | S3 storage bucket name (commented out)                   | Server                 |
| S3_STORAGE_ACCESS_KEY_ID      | S3 storage access key ID (commented out)                 | Server                 |
| S3_STORAGE_SECRET_ACCESS_KEY  | S3 storage secret access key (commented out)             | Server                 |
| S3_STORAGE_REGION             | S3 storage region (commented out)                        | Server                 |
| S3_ENDPOINT_URL               | Custom S3 endpoint URL (commented out)                   | Server                 |
| APIKEY_STORAGE_TYPE           | API key storage type (json or db) (commented out)        | Server                 |
| SHOW_COMMUNITY_NODES          | Show community nodes when set to true (commented out)    | Server                 |

This table provides a comprehensive overview of all the environment variables used across the different files in your project. The "File Location" column indicates which file(s) each variable is found in (Root, Server, UI, or AnswerAI).

## AAI Default Environment Variables

AAI-branded nodes use environment variables with the `AAI_DEFAULT_` prefix to provide automatic credential configuration without requiring users to manually set up credentials. This enables zero-configuration deployment for common AI services.

### Core AI Model Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `AAI_DEFAULT_OPENAI_API_KEY` | OpenAI API key for GPT models | AAIChatOpenAI, AAIConversationChain, AAIAssistant |
| `AAI_DEFAULT_ANTHROPHIC` | Anthropic API key for Claude models | AAIChatAnthropic |
| `AAI_DEFAULT_GROQ` | Groq API key for fast inference models | AAIGroq |
| `AAI_DEFAULT_DEEPSEEK` | Deepseek API key | AAIDeepseek |
| `AAI_DEFAULT_GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio API key | AAIChatGoogleGenerativeAI |
| `AAI_DEFAULT_GOOGLE_VERTEX_AI_API_KEY` | Google Cloud Vertex AI API key | Various Google AI nodes |
| `AAI_DEFAULT_REPLICATE` | Replicate API key for open-source models | Various Replicate nodes |

### AWS Bedrock Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY` | AWS access key for Bedrock service | AAIAWSChatBedrock |
| `AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY` | AWS secret key for Bedrock service | AAIAWSChatBedrock |
| `AAI_DEFAULT_AWS_BEDROCK_SESSION_TOKEN` | AWS session token (optional, for temporary credentials) | AAIAWSChatBedrock |

**Note**: AWS Bedrock variables are required for AWS Bedrock integration. The session token is optional and only needed when using temporary AWS credentials.

### Vector Database Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `AAI_DEFAULT_PINECONE` | Pinecone API key | AAIVectorStore |
| `AAI_DEFAULT_PINECONE_INDEX` | Pinecone index name | AAIVectorStore |
| `AAI_DEFAULT_SUPABASE_URL` | Supabase project URL | Various Supabase integrations |
| `AAI_DEFAULT_SUPABASE_API` | Supabase API key | Various Supabase integrations |

### Memory and Storage Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `AAI_DEFAULT_REDIS_URL` | Redis connection URL | AAIChatMemory |
| `AAI_DEFAULT_REDIS_HOST` | Redis host (alternative to URL) | AAIChatMemory |
| `AAI_DEFAULT_REDIS_PORT` | Redis port (default: 6379) | AAIChatMemory |
| `AAI_DEFAULT_REDIS_USERNAME` | Redis username (optional) | AAIChatMemory |
| `AAI_DEFAULT_REDIS_PASSWORD` | Redis password (optional) | AAIChatMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_HOST` | PostgreSQL host for agent memory | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_PORT` | PostgreSQL port (default: 5432) | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_DATABASE` | Database name for agent memory | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_USER` | PostgreSQL username | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_PASSWORD` | PostgreSQL password | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_AGENTMEMORY_TABLE_NAME` | Table name (default: aai_agent_memory) | AAIAgentMemory |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_HOST` | PostgreSQL host for record manager | AAIRecordManager |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_PORT` | PostgreSQL port (default: 5432) | AAIRecordManager |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_DATABASE` | Database name for record manager | AAIRecordManager |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_USER` | PostgreSQL username | AAIRecordManager |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_PASSWORD` | PostgreSQL password | AAIRecordManager |
| `AAI_DEFAULT_POSTGRES_RECORDMANAGER_TABLE_NAME` | Table name (default: aai_upsertion_records) | AAIRecordManager |

### Search and API Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `AAI_DEFAULT_EXA_SEARCH_API_KEY` | Exa search API key | AAIExaSearch |
| `AAI_DEFAULT_SERPAPI` | SerpAPI key for web search | Various search nodes |
| `AAI_DEFAULT_GOOGLE_SEARCH_API` | Google Custom Search API key | Google search integrations |
| `AAI_DEFAULT_GOOGLE_SEARCH_API_ENGINE_ID` | Google Custom Search Engine ID | Google search integrations |
| `AAI_DEFAULT_GITHUB_TOKEN` | GitHub personal access token | GitHub integrations |

### Security Considerations

1. **Environment Variable Security**: These variables contain sensitive credentials and should be:
   - Never committed to version control
   - Stored securely in production environments
   - Rotated regularly

2. **Access Control**: Ensure that only authorized services and users have access to these environment variables.

3. **Default Credentials**: These are intended for development and testing. In production, consider using more secure credential management systems.

### Usage Examples

#### Development Environment
```bash
# .env.local
AAI_DEFAULT_OPENAI_API_KEY=sk-your-openai-key
AAI_DEFAULT_ANTHROPHIC=sk-ant-your-anthropic-key
AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY=AKIA...
AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY=your-secret-key
```

#### Docker Environment
```yaml
# docker-compose.yml
environment:
  - AAI_DEFAULT_OPENAI_API_KEY=${OPENAI_API_KEY}
  - AAI_DEFAULT_ANTHROPHIC=${ANTHROPHIC_API_KEY}
  - AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY=${AWS_ACCESS_KEY}
  - AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY=${AWS_SECRET_KEY}
```

### Troubleshooting

#### Common Issues

1. **Missing Variables**: If a required variable is not set, the corresponding AAI node will throw an error with a descriptive message.

2. **Invalid Credentials**: Ensure that the API keys and credentials are valid and have the necessary permissions.

3. **Network Issues**: Some services may require specific network configurations or firewall rules.

#### Error Messages

- `AAI_DEFAULT_OPENAI_API_KEY environment variable is not set`: OpenAI API key is missing
- `AAI_DEFAULT_AWS_BEDROCK_ACCESS_KEY and AAI_DEFAULT_AWS_BEDROCK_SECRET_KEY environment variables are required`: AWS Bedrock credentials are missing
