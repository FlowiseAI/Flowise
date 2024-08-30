---
description: Learn about the Retrieval QA Chain in AnswerAI and how it differs from the Conversational Retrival QA Chain
---

# Retrieval QA Chain

## Overview

The Retrieval QA Chain in AnswerAI is a specialized chain designed to answer questions based on retrieved documents. Unlike the [Conversational Retrival QA Chain](./conversational-retrieval-qa-chain.md), this chain focuses on providing accurate answers from a knowledge base without maintaining conversation history.

## Key Differences from Conversational Chain

1. **No Memory**: The Retrieval QA Chain does not maintain memory of previous interactions. Each query is treated independently.

2. **Document Retrieval**: This chain actively retrieves relevant documents for each query, whereas the [Conversational Retrival QA Chain](./conversational-retrieval-qa-chain.md) relies on its conversation history.

3. **Single-Turn Interactions**: Optimized for standalone questions rather than multi-turn conversations.

4. **Knowledge-Base Focused**: Answers are derived from a specific knowledge base rather than general knowledge or conversation context.

## Key Benefits

-   Accuracy: Provides answers based on specific, retrieved information.
-   Scalability: Can handle a large knowledge base efficiently.
-   Consistency: Gives consistent answers to similar questions, regardless of conversation history.
-   Flexibility: Can be easily updated with new information by updating the underlying vector store.

## When to Use Retrieval QA Chain

Use this chain when:

1. You need to answer questions based on a specific knowledge base or dataset.
2. Conversation history is not important or relevant.
3. You want to provide factual, consistent answers across different user sessions.
4. Dealing with domain-specific queries that require accurate, up-to-date information.

## How It Works

1. Query Reception: The chain receives a question via the AnswerAI API.
2. Document Retrieval: Relevant documents are fetched from the vector store.
3. Context Preparation: Retrieved documents are prepared as context for the language model.
4. Answer Generation: The language model generates an answer based on the question and retrieved context.
5. Response Delivery: The answer is returned through the API.

## Key Components

1. Language Model: Processes the query and generates answers.
2. Vector Store Retriever: Fetches relevant documents based on the query.
3. Input Moderation (Optional): Ensures safe and appropriate inputs.

## Using the Retrieval QA Chain with AnswerAI API

### Basic Usage

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "question": "What are the main features of quantum computing?",
    "overrideConfig": {
        "vectorStoreRetriever": {
            "type": "pinecone",
            "indexName": "quantum-computing-index"
        }
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### Adding Input Moderation

```python
data = {
    "question": "What are the main features of quantum computing?",
    "overrideConfig": {
        "vectorStoreRetriever": {
            "type": "pinecone",
            "indexName": "quantum-computing-index"
        },
        "inputModeration": [
            {
                "type": "toxicity",
                "threshold": 0.8
            }
        ]
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

## Use Case Example: Technical Support System

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

def technical_support(query):
    data = {
        "question": query,
        "overrideConfig": {
            "vectorStoreRetriever": {
                "type": "pinecone",
                "indexName": "technical-support-docs"
            }
        }
    }

    response = requests.post(API_URL, json=data, headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    })
    return response.json()['text']

# Usage
print(technical_support("How do I reset my router?"))
print(technical_support("What are the system requirements for the latest software update?"))
```

## Best Practices

1. Quality of Vector Store: Ensure your vector store contains high-quality, relevant documents.
2. Regular Updates: Keep your knowledge base up-to-date for accurate answers.
3. Clear Queries: Encourage users to ask clear, specific questions for better retrieval.
4. Fallback Mechanisms: Implement fallbacks for when the chain can't find relevant information.
5. Monitoring: Regularly review the chain's performance and the relevance of retrieved documents.

## Limitations and Considerations

-   No Conversation Context: Unlike the Conversational Chain, this chain doesn't consider previous interactions.
-   Retrieval Dependence: The quality of answers heavily depends on the quality and relevance of retrieved documents.
-   Single-Query Focus: May not perform as well for complex queries that require multi-step reasoning.

By leveraging the Retrieval QA Chain in AnswerAI, you can create powerful question-answering systems that provide accurate, knowledge-based responses without the need for maintaining conversation history. This makes it ideal for scenarios where factual, consistent information retrieval is more important than contextual conversation.
