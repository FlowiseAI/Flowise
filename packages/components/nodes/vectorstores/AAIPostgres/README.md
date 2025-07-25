# AAI Vector (Postgres)

Answer Agent Postgres Vector Store integration for Flowise

## 🌱 Environment Variables

This node automatically uses your Answer Agent Postgres database configuration. Set these environment variables for automatic connection:

| Variable                                             | Description                                               | Type    | Default     |
| ---------------------------------------------------- | --------------------------------------------------------- | ------- | ----------- |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_HOST                | Default `host` for AAI Postgres Vector Store              | String  | localhost   |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_PORT                | Default `port` for AAI Postgres Vector Store              | Number  | 5432        |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_USER                | Default `user` for AAI Postgres Vector Store              | String  | postgres    |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_PASSWORD            | Default `password` for AAI Postgres Vector Store          | String  | postgres    |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_DATABASE            | Default `database` for AAI Postgres Vector Store          | String  | postgres    |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_TABLE_NAME          | Default `tableName` for AAI Postgres Vector Store         | String  | documents   |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_CONTENT_COLUMN_NAME | Default `contentColumnName` for AAI Postgres Vector Store | String  | pageContent |
| AAI_DEFAULT_POSTGRES_VECTORSTORE_SSL                 | Default `ssl` for AAI Postgres Vector Store               | Boolean | false       |

## Features

-   🚀 **Zero Configuration**: Works out of the box with AAI environment variables
-   🔐 **No Credentials Required**: Uses your existing AAI Postgres setup
-   📊 **Automatic Table Management**: Creates and manages vector tables automatically
-   🎯 **Multiple Distance Strategies**: Cosine, Euclidean, and Inner Product
-   📁 **File Upload Support**: Handles file uploads with proper metadata filtering
-   🔄 **Record Management**: Optional integration with AAI Record Manager for deduplication

## Usage

1. **Drag and Drop**: Simply drag the "AAI Vector (Postgres)" node into your canvas
2. **Connect Embeddings**: Connect any embeddings node (AAI Embeddings recommended)
3. **Connect Documents**: Connect document loaders or other document sources
4. **Optional Record Manager**: Connect AAI Record Manager for deduplication
5. **Ready to Use**: No additional configuration needed!

## Fallback Environment Variables

If AAI-specific environment variables are not set, the node falls back to standard Postgres environment variables:

-   `POSTGRES_VECTORSTORE_HOST`
-   `POSTGRES_VECTORSTORE_PORT`
-   `POSTGRES_VECTORSTORE_USER`
-   `POSTGRES_VECTORSTORE_PASSWORD`
-   `POSTGRES_VECTORSTORE_DATABASE`
-   `POSTGRES_VECTORSTORE_TABLE_NAME`
-   `POSTGRES_VECTORSTORE_CONTENT_COLUMN_NAME`
-   `POSTGRES_VECTORSTORE_SSL`

## License

Source code in this repository is made available under the [Apache License Version 2.0](https://github.com/FlowiseAI/Flowise/blob/master/LICENSE.md).
