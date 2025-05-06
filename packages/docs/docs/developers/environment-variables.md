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
