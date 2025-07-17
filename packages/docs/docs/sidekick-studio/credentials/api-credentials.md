---
sidebar_position: 1
---

# API Credentials

This page provides information about all available API credentials in Sidekick Studio. Each credential contains fields required to authenticate with external services.

## Table of Contents

-   [AI Service Credentials](#ai-service-credentials)
-   [Database Credentials](#database-credentials)
-   [Search Service Credentials](#search-service-credentials)
-   [Vector Store Credentials](#vector-store-credentials)
-   [Content Service Credentials](#content-service-credentials)
-   [Utility Credentials](#utility-credentials)

## AI Service Credentials

### OpenAI API

Authentication for OpenAI services.

-   **How to obtain**: Get your API key from the [OpenAI API keys page](https://platform.openai.com/api-keys) after creating an account.
-   **Inputs**:
    -   OpenAI Api Key (password)

### Azure OpenAI API

Authentication for Azure OpenAI services.

-   **How to obtain**: Refer to [official guide](https://azure.microsoft.com/en-us/products/cognitive-services/openai-service) on how to use Azure OpenAI service.
-   **Inputs**:
    -   Azure OpenAI Api Key (password)
    -   Azure OpenAI Api Instance Name
    -   Azure OpenAI Api Deployment Name
    -   Azure OpenAI Api Version (e.g., 2023-06-01-preview)

### Anthropic API

Authentication for Anthropic Claude models.

-   **How to obtain**: Sign up at [Anthropic's console](https://console.anthropic.com/) and create an API key from your profile's [API Keys section](https://console.anthropic.com/settings/api-keys).
-   **Inputs**:
    -   Anthropic Api Key (password)

### Google Vertex Auth

Authentication for Google Vertex AI services.

-   **How to obtain**: Create credentials through the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and set up a service account.
-   **Inputs**:
    -   Google Application Credential File Path (optional)
    -   Google Credential JSON Object (optional)
    -   Project ID (optional)

### Google Generative AI

Authentication for Google Generative AI services.

-   **How to obtain**: Get your API key from the [official page](https://ai.google.dev/tutorials/setup).
-   **Inputs**:
    -   Google AI API Key (password)

### Cohere API

Authentication for Cohere AI services.

-   **How to obtain**: Sign up at [Cohere's dashboard](https://dashboard.cohere.com/welcome/login), then navigate to the [API keys section](https://dashboard.cohere.com/api-keys) to create a key.
-   **Inputs**:
    -   Cohere Api Key (password)

### HuggingFace API

Authentication for HuggingFace services.

-   **How to obtain**: Create an account at [HuggingFace](https://huggingface.co/), then go to your profile settings and navigate to the [Access Tokens section](https://huggingface.co/settings/tokens) to create a token.
-   **Inputs**:
    -   HuggingFace Api Key (password)

### Mistral AI API

Authentication for Mistral AI services.

-   **How to obtain**: Get your API key from the [official console](https://console.mistral.ai/).
-   **Inputs**:
    -   MistralAI API Key (password)

### Groq API

Authentication for Groq API services.

-   **How to obtain**: Sign up at [Groq Console](https://console.groq.com/), then visit the [API Keys section](https://console.groq.com/keys) to create a key.
-   **Inputs**:
    -   Groq Api Key (password)

### Fireworks API

Authentication for Fireworks AI services.

-   **How to obtain**: Sign up at [Fireworks AI](https://fireworks.ai/), then get your API key from the account settings.
-   **Inputs**:
    -   Fireworks Api Key (password)

### Together AI API

Authentication for Together AI services.

-   **How to obtain**: Sign up at [Together AI](https://together.ai/), then access your API key from the account settings.
-   **Inputs**:
    -   TogetherAI Api Key (password)

### Alibaba API

Authentication for Alibaba AI services.

-   **How to obtain**: Sign up for [Alibaba Cloud](https://www.alibabacloud.com/), then create an API key through the console.
-   **Inputs**:
    -   Alibaba Api Key (password)

### Baidu Qianfan API

Authentication for Baidu's Qianfan AI platform.

-   **How to obtain**: Register at [Baidu AI Cloud](https://cloud.baidu.com/), then create and access your Qianfan keys.
-   **Inputs**:
    -   Qianfan Access Key
    -   Qianfan Secret Key (password)

### Cerebras API

Authentication for Cerebras AI platform.

-   **How to obtain**: Sign up at [Cerebras AI platform](https://cloud.cerebras.ai/) and obtain your API key from the dashboard.
-   **Inputs**:
    -   Cerebras API Key (password) - API Key from cloud.cerebras.ai

### Deepseek AI API

Authentication for DeepseekAI services.

-   **How to obtain**: Register at [DeepseekAI's platform](https://platform.deepseek.ai/) and get your API key from the account settings.
-   **Inputs**:
    -   DeepseekAI API Key (password)

### IBM Watsonx

Authentication for IBM Watsonx AI services.

-   **How to obtain**: Sign up for [IBM Cloud](https://cloud.ibm.com/), create a Watsonx service, and get your credentials from the service dashboard.
-   **Inputs**:
    -   Version (YYYY-MM-DD)
    -   Service URL
    -   Project ID
    -   Watsonx AI Auth Type (IAM or Bearer Token)
    -   Watsonx AI IAM API Key (optional)
    -   Watsonx AI Bearer Token (optional)

### Jina AI API

Authentication for Jina AI services.

-   **How to obtain**: Get your API key from the [official console](https://jina.ai/).
-   **Inputs**:
    -   JinaAI API Key (password)

### LocalAI API

Authentication for LocalAI services.

-   **How to obtain**: Follow the [LocalAI documentation](https://localai.io/basics/authentication/) to configure your local API key.
-   **Inputs**:
    -   LocalAI Api Key (password)

### OpenRouter API

Authentication for OpenRouter services.

-   **How to obtain**: Sign up at [OpenRouter](https://openrouter.ai/) and generate your API key from the dashboard.
-   **Inputs**:
    -   OpenRouter API Key (password)

### Replicate API

Authentication for Replicate services.

-   **How to obtain**: Create an account at [Replicate](https://replicate.com/), then go to your account settings to find or create an API token.
-   **Inputs**:
    -   Replicate Api Key (password)

### X AI API

Authentication for X AI services.

-   **How to obtain**: Apply for access to X AI (formerly known as Twitter's AI services) and receive an API key.
-   **Inputs**:
    -   X AI API Key (password)

### Nvidia NIM API

Authentication for Nvidia NIM platform.

-   **How to obtain**: Sign up for the [Nvidia NIM developer program](https://developer.nvidia.com/nim) and generate your API key.
-   **Inputs**:
    -   Nvidia NIM API Key (password)

## Database Credentials

### Astra DB API

Authentication for DataStax Astra DB.

-   **How to obtain**: Create an account at [DataStax Astra](https://astra.datastax.com/) and generate an application token from the dashboard.
-   **Inputs**:
    -   Astra DB Application Token (password)
    -   Astra DB Api Endpoint

### MongoDB ATLAS

Authentication for MongoDB Atlas.

-   **How to obtain**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), create a cluster, and get your connection string from the Connect dialog.
-   **Inputs**:
    -   ATLAS Connection URL

### MySQL API

Authentication for MySQL database.

-   **How to obtain**: Set up a MySQL server and create user credentials with appropriate permissions.
-   **Inputs**:
    -   User
    -   Password

### PostgreSQL API

Authentication for PostgreSQL database.

-   **How to obtain**: Install PostgreSQL, create a database, and set up user credentials with appropriate permissions.
-   **Inputs**:
    -   User
    -   Password

### PostgreSQL URL

Authentication for PostgreSQL using connection string.

-   **How to obtain**: Set up a PostgreSQL server and construct a connection URL.
-   **Inputs**:
    -   Postgres URL

### Neo4j API

Authentication for Neo4j graph database.

-   **How to obtain**: Refer to [official guide](https://neo4j.com/docs/operations-manual/current/authentication-authorization/) on Neo4j authentication.
-   **Inputs**:
    -   Neo4j URL (e.g., neo4j://localhost:7687)
    -   Username
    -   Password

### Redis API

Authentication for Redis cache.

-   **How to obtain**: Set up a Redis server and configure authentication following the [Redis documentation](https://redis.io/docs/management/security/).
-   **Inputs**:
    -   Redis Host (default: 127.0.0.1)
    -   Port (default: 6379)
    -   User
    -   Password
    -   Use SSL (boolean)

### Redis URL

Authentication for Redis cache using URL.

-   **How to obtain**: Set up a Redis server and construct a Redis URL.
-   **Inputs**:
    -   Redis URL (default: redis://localhost:6379)

### Couchbase API

Authentication for Couchbase database.

-   **How to obtain**: Install Couchbase Server, create a bucket, and set up authentication following the [Couchbase documentation](https://docs.couchbase.com/server/current/manage/manage-security/manage-users-and-roles.html).
-   **Inputs**:
    -   Couchbase Connection String
    -   Couchbase Username
    -   Couchbase Password

### SingleStore API

Authentication for SingleStore database.

-   **How to obtain**: Sign up for [SingleStore](https://www.singlestore.com/), create a workspace, and set up user credentials.
-   **Inputs**:
    -   User
    -   Password

## Search Service Credentials

### Brave Search API

Authentication for Brave Search.

-   **How to obtain**: Apply for API access at [Brave Search API](https://brave.com/search/api/) and get your API key.
-   **Inputs**:
    -   BraveSearch Api Key (password)

### Google Custom Search API

Authentication for Google Search.

-   **How to obtain**: Refer to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) for API key and [Search Engine Creation page](https://programmablesearchengine.google.com/controlpanel/create) for Search Engine ID.
-   **Inputs**:
    -   Google Custom Search Api Key (password)
    -   Programmable Search Engine ID

### Serp API

Authentication for SERP API.

-   **How to obtain**: Sign up at [SerpAPI](https://serpapi.com/) and get your API key from the dashboard.
-   **Inputs**:
    -   Serp Api Key (password)

### Serper API

Authentication for Serper API.

-   **How to obtain**: Register at [Serper.dev](https://serper.dev/) to obtain your API key.
-   **Inputs**:
    -   Serper Api Key (password)

### Search API

Authentication for Search API.

-   **How to obtain**: Sign in to [SearchApi](https://www.searchapi.io/) to obtain a free API key from the dashboard.
-   **Inputs**:
    -   SearchApi API Key (password)

### Exa Search API

Authentication for Exa Search.

-   **How to obtain**: Refer to [official guide](https://docs.exa.ai/reference/getting-started#getting-access) on how to get an API Key from Exa.
-   **Inputs**:
    -   ExaSearch Api Key (password)

### Tavily API

Authentication for Tavily Search API.

-   **How to obtain**: Sign up at [Tavily AI](https://tavily.com/) and retrieve your API key from the dashboard.
-   **Description**: Tavily API is a real-time API to access Google search results.
-   **Inputs**:
    -   Tavily Api Key (password)

## Vector Store Credentials

### Chroma API

Authentication for Chroma vector database.

-   **How to obtain**: Follow the [Chroma documentation](https://docs.trychroma.com/serverless) to set up your account and get API credentials.
-   **Inputs**:
    -   Chroma Api Key (password)
    -   Chroma Tenant
    -   Chroma Database

### Elasticsearch API

Authentication for Elasticsearch.

-   **How to obtain**: Refer to [official guide](https://www.elastic.co/guide/en/kibana/current/api-keys.html) on how to get an API Key from ElasticSearch.
-   **Inputs**:
    -   Elasticsearch Endpoint
    -   Elasticsearch API Key (password)

### ElasticSearch User Password

Authentication for Elasticsearch using username and password.

-   **How to obtain**: Refer to [official guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/setting-up-authentication.html) on how to get User Password from ElasticSearch.
-   **Inputs**:
    -   Cloud ID (Elastic Cloud ID or server URL)
    -   ElasticSearch User
    -   ElasticSearch Password

### Meilisearch API

Authentication for Meilisearch.

-   **How to obtain**: Refer to [official guide](https://meilisearch.com) on how to get an API Key.
-   **Inputs**:
    -   Meilisearch Search API Key (password)
    -   Meilisearch Admin API Key (password, optional)

### Milvus Auth

Authentication for Milvus vector database.

-   **How to obtain**: You can find the Milvus Authentication [here](https://milvus.io/docs/authenticate.md#Authenticate-User-Access).
-   **Inputs**:
    -   Milvus User
    -   Milvus Password

### OpenSearch

Authentication for OpenSearch.

-   **How to obtain**: Set up OpenSearch following the [official documentation](https://opensearch.org/docs/latest/security/authentication/index/) and create user credentials.
-   **Inputs**:
    -   OpenSearch Url
    -   User (optional)
    -   Password (optional)

### Pinecone API

Authentication for Pinecone vector database.

-   **How to obtain**: Sign up at [Pinecone](https://www.pinecone.io/), create an index, and get your API key from the dashboard.
-   **Inputs**:
    -   Pinecone Api Key (password)

### Qdrant API

Authentication for Qdrant vector database.

-   **How to obtain**: Set up [Qdrant Cloud](https://cloud.qdrant.io/) or a self-hosted instance and generate your API key.
-   **Inputs**:
    -   Qdrant API Key (password)

### Upstash Vector API

Authentication for Upstash Vector.

-   **How to obtain**: Sign up at [Upstash](https://upstash.com/), create a Vector database, and get your access credentials.
-   **Inputs**:
    -   Upstash Vector REST URL
    -   Upstash Vector REST Token (password)

### Vectara API

Authentication for Vectara.

-   **How to obtain**: Register at [Vectara](https://vectara.com/), create a corpus, and obtain your credentials.
-   **Inputs**:
    -   Vectara Customer ID
    -   Vectara Corpus ID
    -   Vectara API Key (password)

### Weaviate API

Authentication for Weaviate.

-   **How to obtain**: Sign up for [Weaviate Cloud](https://weaviate.io/cloud) or set up a self-hosted instance and generate an API key.
-   **Inputs**:
    -   Weaviate API Key (password)

### Voyage AI API

Authentication for Voyage AI embedding services.

-   **How to obtain**: Refer to [official guide](https://docs.voyageai.com/install/#authentication-with-api-keys) on how to get an API Key.
-   **Inputs**:
    -   Voyage AI Endpoint (default: https://api.voyageai.com/v1/embeddings)
    -   Voyage AI API Key (password)

## Content Service Credentials

### Airtable API

Authentication for Airtable.

-   **How to obtain**: Refer to [official guide](https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens) on how to get accessToken on Airtable.
-   **Inputs**:
    -   Access Token (password)

### Contentful Delivery API

Authentication for Contentful's content delivery.

-   **How to obtain**: Refer to [official guide](https://www.contentful.com/developers/docs/references/content-delivery-api/) on how to get your delivery and preview keys in Contentful.
-   **Inputs**:
    -   Delivery Token
    -   Preview Token
    -   Space Id

### Contentful Management API

Authentication for Contentful's content management.

-   **How to obtain**: Refer to [official guide](https://www.contentful.com/developers/docs/references/content-Management-api/) on how to get your Management and preview keys in Contentful.
-   **Inputs**:
    -   Management Token
    -   Space Id

### Confluence Cloud API

Authentication for Confluence Cloud.

-   **How to obtain**: Refer to [official guide](https://support.atlassian.com/confluence-cloud/docs/manage-oauth-access-tokens/) on how to get Access Token or [API Token](https://id.atlassian.com/manage-profile/security/api-tokens) on Confluence.
-   **Inputs**:
    -   Access Token (password)
    -   Username/Email
    -   Base URL

### Confluence Server/Data Center API

Authentication for Confluence Server or Data Center.

-   **How to obtain**: Refer to [official guide](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html/) on how to get Personal Access Token on Confluence.
-   **Inputs**:
    -   Personal Access Token (password)

### Figma API

Authentication for Figma.

-   **How to obtain**: Refer to [official guide](https://www.figma.com/developers/api#access-tokens) on how to get accessToken on Figma.
-   **Inputs**:
    -   Access Token (password)

### Github API

Authentication for GitHub.

-   **How to obtain**: Refer to [official guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) on how to get accessToken on Github.
-   **Inputs**:
    -   Access Token (password)

### Jira API

Authentication for Jira.

-   **How to obtain**: Create an API token by going to [Atlassian API token management page](https://id.atlassian.com/manage-profile/security/api-tokens).
-   **Inputs**:
    -   Jira API Key (password)
    -   Jira API Email
    -   Jira URL

### Notion API

Authentication for Notion.

-   **How to obtain**: You can find integration token [here](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration).
-   **Inputs**:
    -   Notion Integration Token (password)

### Salesforce API

Authentication for Salesforce using client credentials (system-wide access).

-   **How to obtain**: Refer to [official guide](https://developer.salesforce.com/docs/atlas.en-us.api_analytics.meta/api_analytics/sforce_analytics_rest_api_get_started.htm) on how to get your Salesforce API key.
-   **Inputs**:
    -   Salesforce Client ID (password)
    -   Salesforce Client Secret (password)
    -   Salesforce Instance (e.g., https://na1.salesforce.com)

### Salesforce Personal OAuth

Authentication for Salesforce using individual user OAuth credentials (personal access).

-   **How to obtain**: Follow the [Salesforce Personal OAuth Setup Guide](../../developers/authorization/salesforce-oauth.md) to create a Connected App and configure OAuth flow.
-   **Inputs**:
    -   Refresh Token (password) - Automatically populated after OAuth authorization
-   **Setup Requirements**:
    -   Salesforce Connected App configured for OAuth 2.0
    -   Environment variables: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_INSTANCE_URL`
    -   OAuth authorization flow completed by end user

### Slack API

Authentication for Slack.

-   **How to obtain**: Refer to [official guide](https://github.com/modelcontextprotocol/servers/tree/main/src/slack) on how to get botToken and teamId on Slack.
-   **Inputs**:
    -   Bot Token (password)
    -   Team ID

### Stripe API

Authentication for Stripe.

-   **How to obtain**: Sign up at [Stripe](https://stripe.com/), then access your API keys from the [Developer Dashboard](https://dashboard.stripe.com/apikeys).
-   **Inputs**:
    -   Stripe API Token (password)

## Utility Credentials

### Apify API

Authentication for Apify.

-   **How to obtain**: You can find the Apify API token on your [Apify account](https://console.apify.com/account#/integrations) page.
-   **Inputs**:
    -   Apify API (password)

### Arize API

Authentication for Arize observability platform.

-   **How to obtain**: Refer to [official guide](https://docs.arize.com/arize) on how to get API keys on Arize.
-   **Inputs**:
    -   API Key (password)
    -   Space ID
    -   Endpoint (default: https://otlp.arize.com)

### AssemblyAI API

Authentication for AssemblyAI speech-to-text.

-   **How to obtain**: Create an account at [AssemblyAI](https://www.assemblyai.com/) and obtain your API key from the dashboard.
-   **Inputs**:
    -   AssemblyAI Api Key (password)

### AWS security credentials

Authentication for AWS services.

-   **How to obtain**: Your [AWS security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html). When unspecified, credentials will be sourced from the runtime environment according to the default AWS SDK behavior.
-   **Inputs**:
    -   AWS Access Key (optional)
    -   AWS Secret Access Key (password, optional)
    -   AWS Session Key (password, optional)

### Azure Cognitive Services

Authentication for Azure Cognitive Services.

-   **How to obtain**: Create an Azure account, set up a Cognitive Services resource, and obtain your keys from the Azure portal.
-   **Inputs**:
    -   Azure Subscription Key (password)
    -   Service Region (e.g., "westus", "eastus")
    -   API Version (default: 2024-05-15-preview)

### Composio API

Authentication for Composio.

-   **How to obtain**: Sign up at [Composio](https://composio.dev/) and get your API key from the account settings.
-   **Inputs**:
    -   Composio API Key (password)

### Dynamodb Memory API

Authentication for DynamoDB memory storage.

-   **How to obtain**: Set up an AWS account, create a DynamoDB table, and generate access credentials with appropriate permissions.
-   **Inputs**:
    -   Access Key (password)
    -   Secret Access Key (password)

### E2B API

Authentication for E2B.

-   **How to obtain**: Sign up at [E2B](https://e2b.dev/) and get your API key from the dashboard.
-   **Inputs**:
    -   E2B Api Key (password)

### FireCrawl API

Authentication for FireCrawl.

-   **How to obtain**: You can find the FireCrawl API token on your [FireCrawl account](https://www.firecrawl.dev/) page.
-   **Inputs**:
    -   FireCrawl API (password)
    -   FireCrawl API URL (default: https://api.firecrawl.dev)

### Google OAuth

Authentication for Google services using OAuth.

-   **How to obtain**: Set up a project in the [Google Cloud Console](https://console.cloud.google.com/) and configure OAuth credentials.
-   **Inputs**:
    -   Full Name (disabled)
    -   Email (disabled)
    -   Provider (disabled)
    -   Provider ID (disabled)
    -   Google Access Token (disabled)

### Langfuse API

Authentication for Langfuse monitoring.

-   **How to obtain**: Refer to [integration guide](https://langfuse.com/docs/flowise) on how to get API keys on Langfuse.
-   **Inputs**:
    -   Secret Key (password)
    -   Public Key
    -   Endpoint (default: https://cloud.langfuse.com)

### Langsmith API

Authentication for Langsmith.

-   **How to obtain**: Refer to [official guide](https://docs.smith.langchain.com/) on how to get API key on Langsmith.
-   **Inputs**:
    -   API Key (password)
    -   Endpoint (default: https://api.smith.langchain.com)

### LangWatch API

Authentication for LangWatch monitoring.

-   **How to obtain**: Refer to [integration guide](https://docs.langwatch.ai/integration/python/guide) on how to get API keys on LangWatch.
-   **Inputs**:
    -   API Key (password)
    -   Endpoint (default: https://app.langwatch.ai)

### Lunary AI

Authentication for Lunary AI monitoring.

-   **How to obtain**: Refer to the [official guide](https://lunary.ai/docs?utm_source=flowise) to get a public key.
-   **Inputs**:
    -   Public Key / Project ID
    -   Endpoint (default: https://api.lunary.ai)

### Make.Com API

Authentication for Make.com automation platform.

-   **How to obtain**: Sign up at [Make.com](https://www.make.com/), then access your API key from your profile settings.
-   **Inputs**:
    -   Make.com API Endpoint Url
    -   Make.com Api Key (password)
    -   Team ID
    -   Organization ID

### Momento Cache API

Authentication for Momento Cache.

-   **How to obtain**: Refer to [official guide](https://docs.momentohq.com/cache/develop/authentication/api-keys) on how to get API key on Momento.
-   **Inputs**:
    -   Cache
    -   API Key (password)
    -   Endpoint

### N8n API

Authentication for N8n workflow automation.

-   **How to obtain**: Set up an [N8n instance](https://n8n.io/), then create an API key in the N8n settings.
-   **Inputs**:
    -   N8n API URL (e.g., http://localhost:5678)
    -   API Key (password)

### Phoenix API

Authentication for Phoenix monitoring platform.

-   **How to obtain**: Refer to [official guide](https://docs.arize.com/phoenix) on how to get API keys on Phoenix.
-   **Inputs**:
    -   API Key (password)
    -   Endpoint (default: https://app.phoenix.arize.com)

### Spider API

Authentication for Spider web scraping platform.

-   **How to obtain**: Get your API key from the [Spider](https://spider.cloud) dashboard.
-   **Inputs**:
    -   Spider API Key (password)

### Supabase API

Authentication for Supabase.

-   **How to obtain**: Create a [Supabase](https://supabase.com/) project and get your API key from the project settings.
-   **Inputs**:
    -   Supabase API Key (password)

### Unstructured API

Authentication for Unstructured document processing.

-   **How to obtain**: Refer to [official guide](https://unstructured.io/#get-api-key) on how to get api key on Unstructured.
-   **Inputs**:
    -   API Key (password)

### Upstash Redis API

Authentication for Upstash Redis.

-   **How to obtain**: Refer to [official guide](https://upstash.com/docs/redis/overall/getstarted) on how to create redis instance and get redis REST URL and Token.
-   **Inputs**:
    -   Upstash Redis REST URL
    -   Token (password)

### Upstash Redis Memory API

Authentication for Upstash Redis memory storage.

-   **How to obtain**: Refer to [official guide](https://upstash.com/docs/redis/overall/getstarted) on how to create redis instance and get redis REST Token.
-   **Inputs**:
    -   Upstash Redis REST Token (password)

### WolframAlpha App ID

Authentication for WolframAlpha computational engine.

-   **How to obtain**: Get an App Id from [Wolfram Alpha Portal](https://developer.wolframalpha.com).
-   **Inputs**:
    -   App ID (password)

### Zep Memory API

Authentication for Zep memory storage.

-   **How to obtain**: Refer to [official guide](https://docs.getzep.com/deployment/auth/) on how to create API key on Zep.
-   **Inputs**:
    -   API Key (password)
