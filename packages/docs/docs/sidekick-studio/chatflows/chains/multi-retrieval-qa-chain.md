---
description: Learn about the Multi Retrieval QA Chain, a powerful tool for automatic vector store selection in AnswerAI
---

# Multi Retrieval QA Chain

## Overview

The Multi Retrieval QA Chain in AnswerAI is an advanced chain type that automatically selects the most appropriate vector store from multiple retrievers based on the input query. This chain is particularly useful when dealing with diverse types of questions that require information from different specialized knowledge bases.

## Key Benefits

-   Automatic Retriever Selection: Chooses the best vector store for each query, improving response relevance.
-   Versatility: Handles a wide range of question types with a single chain.
-   Efficiency: Reduces the need for manual retriever switching or complex routing logic.
-   Scalability: Easily expandable by adding new vector stores and retrievers.

## When to Use Multi Retrieval QA Chain

The Multi Retrieval QA Chain is ideal for:

1. Comprehensive Knowledge Bases: Handle queries across multiple domains or subjects.
2. Enterprise Search Systems: Retrieve information from various departmental databases.
3. Research Platforms: Access and combine data from multiple specialized collections.
4. E-commerce Product Search: Query across different product categories or attributes.
5. Multi-lingual or Multi-regional Systems: Select appropriate language or region-specific retrievers.

## How It Works

1. Input Processing: The chain receives a user query via the AnswerAI API.
2. Retriever Analysis: The system evaluates the input against available retriever descriptions.
3. Retriever Selection: The most suitable vector store retriever is automatically chosen.
4. Information Retrieval: The selected retriever fetches relevant documents from its vector store.
5. LLM Interaction: The retrieved information and the original query are used to generate a response.
6. Response Generation: The model provides an answer based on the retrieved information and the query.

## Key Components

1. Language Model: The underlying AI model used for generating responses.
2. Vector Store Retrievers: A collection of retrievers, each with a name, description, and associated vector store.
3. Return Source Documents Option: Allows including source documents in the response.
4. Input Moderation (Optional): Filters to ensure safe and appropriate inputs.

## Using the Multi Retrieval QA Chain with AnswerAI API

### Basic Usage

Here's how to use the Multi Retrieval QA Chain via the AnswerAI API:

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "question": "What are the key features of quantum computing?",
    "overrideConfig": {
        "vectorStoreRetriever": [
            {
                "name": "ComputerScience",
                "description": "Information about computer science topics",
                "vectorStore": {
                    "k": 4  # Number of documents to retrieve
                }
            },
            {
                "name": "Physics",
                "description": "Information about physics concepts",
                "vectorStore": {
                    "k": 4
                }
            }
        ],
        "returnSourceDocuments": True
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### Adding Input Moderation

To include input moderation:

```python
data = {
    "question": "What are the key features of quantum computing?",
    "overrideConfig": {
        "vectorStoreRetriever": [
            # ... vector store retrievers as before ...
        ],
        "returnSourceDocuments": True,
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

## Use Case Examples

### 1. Multi-Domain Research Assistant

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

def research_assistant(query):
    data = {
        "question": query,
        "overrideConfig": {
            "vectorStoreRetriever": [
                {
                    "name": "ScientificPapers",
                    "description": "Database of scientific research papers across various disciplines",
                    "vectorStore": {"k": 5}
                },
                {
                    "name": "NewsArticles",
                    "description": "Recent news articles on various topics",
                    "vectorStore": {"k": 3}
                },
                {
                    "name": "HistoricalRecords",
                    "description": "Historical documents and records",
                    "vectorStore": {"k": 4}
                }
            ],
            "returnSourceDocuments": True
        }
    }

    response = requests.post(API_URL, json=data, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    return response.json()

# Usage
result = research_assistant("What are the latest developments in renewable energy?")
print(result['text'])  # The answer
print(result['sourceDocuments'])  # The source documents used
```

### 2. E-commerce Product Recommendation System

```javascript
const API_URL = 'http://localhost:3000/api/v1/prediction/<your-chatflowid>'
const API_KEY = 'your-api-key'

async function productRecommendation(query, userPreferences) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: query,
            overrideConfig: {
                vectorStoreRetriever: [
                    {
                        name: 'Electronics',
                        description: 'Database of electronic products',
                        vectorStore: { k: 5 }
                    },
                    {
                        name: 'Clothing',
                        description: 'Database of clothing and fashion items',
                        vectorStore: { k: 5 }
                    },
                    {
                        name: 'HomeGoods',
                        description: 'Database of home and kitchen products',
                        vectorStore: { k: 5 }
                    }
                ],
                returnSourceDocuments: true
            },
            userPreferences: userPreferences
        })
    })

    const result = await response.json()
    return {
        recommendations: result.text,
        products: result.sourceDocuments
    }
}

// Usage
productRecommendation('I need a new laptop for graphic design', { budget: 'high', brand: 'Apple' })
    .then((result) => {
        console.log('Recommendations:', result.recommendations)
        console.log('Product Details:', result.products)
    })
    .catch((error) => console.error(error))
```

## Best Practices

1. Diverse Retrievers: Create a varied set of vector store retrievers to cover different domains or data types.
2. Clear Descriptions: Write clear, distinctive descriptions for each retriever to aid in selection.
3. Optimize Retrieval: Adjust the number of documents retrieved (k) based on the needs of your application.
4. Regular Updates: Keep your vector stores updated with the latest information.
5. Use Source Documents: Enable returnSourceDocuments for transparency and to provide additional context.
6. Monitor Performance: Regularly review which retrievers are being selected to optimize your system.

By leveraging the Multi Retrieval QA Chain in AnswerAI, you can create more sophisticated and intelligent QA systems that adapt to various query types and information sources, providing more accurate and comprehensive responses across a wide range of domains.
