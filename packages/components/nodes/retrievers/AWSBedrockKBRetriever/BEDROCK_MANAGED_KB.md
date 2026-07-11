# Bedrock Managed Knowledge Base Support

## Overview
Adds a Flowise retriever node that queries Amazon Bedrock Knowledge Bases for managed retrieval in chatflow applications.

## Usage
In Flowise canvas:
1. Drag the **AWS Bedrock KB Retriever** node onto the canvas
2. Configure AWS credentials and Knowledge Base ID in the node properties
3. Connect as a retriever input to a Conversational Retrieval Chain or Agent node

```json
{
  "node": "AWSBedrockKBRetriever",
  "inputs": {
    "knowledgeBaseId": "YOUR_KB_ID",
    "region": "us-east-1",
    "useAgenticRetrieval": true,
    "maxResults": 5
  }
}
```

## Configuration
| Variable | Description | Default |
|---|---|---|
| KNOWLEDGE_BASE_ID | Bedrock Knowledge Base ID | None |
| AWS_REGION | AWS region for the KB | us-east-1 |
| USE_AGENTIC_RETRIEVAL | Enable agentic retrieval | true |
| MAX_RESULTS | Maximum retrieval results | 5 |

## Features
- Managed search (no vector store needed)
- Agentic retrieval with query decomposition + reranking
- Automatic fallback to plain Retrieve if agentic fails
- Multi-source support (S3, Web, Confluence, SharePoint)
- Visual drag-and-drop configuration in Flowise UI

## SDK Requirements
- @aws-sdk/client-bedrock-agent-runtime >= 3.700
- flowise >= 2.0

## Required IAM Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:Retrieve",
    "bedrock:AgenticRetrieveStream"
  ],
  "Resource": "arn:aws:bedrock:<region>:<account-id>:knowledge-base/<kb-id>"
}
```

## References
- [Build a Managed Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-build-managed.html)
- [Retrieve API](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html)
- [Agentic Retrieval](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-agentic.html)
