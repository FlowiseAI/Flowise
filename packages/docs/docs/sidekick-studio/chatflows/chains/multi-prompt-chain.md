---
description: Learn about the Multi Prompt Chain, a powerful tool for automatic prompt selection in AnswerAgentAI
---

# Multi Prompt Chain

## Overview

The Multi Prompt Chain in AnswerAgentAI is an advanced chain type that automatically selects the most appropriate prompt from multiple prompt templates based on the input. This chain is particularly useful when dealing with diverse types of queries that require different specialized prompts.

## Key Benefits

-   Automatic Prompt Selection: Chooses the best prompt for each input, improving response relevance.
-   Versatility: Handles a wide range of query types with a single chain.
-   Efficiency: Reduces the need for manual prompt switching or complex if-else logic.
-   Scalability: Easily expandable by adding new prompt templates.

## When to Use Multi Prompt Chain

The Multi Prompt Chain is ideal for:

1. General-Purpose Chatbots: Handle a variety of user queries efficiently.
2. Customer Support Systems: Address different types of customer inquiries.
3. Educational Platforms: Provide responses tailored to various subjects or question types.
4. Content Generation: Create different types of content based on input specifications.
5. Complex Decision Trees: Simplify logic by letting the chain choose the appropriate path.

## How It Works

1. Input Processing: The chain receives a user query via the AnswerAgentAI API.
2. Prompt Analysis: The system evaluates the input against available prompt descriptions.
3. Prompt Selection: The most suitable prompt is automatically chosen.
4. LLM Interaction: The selected prompt is used with the input to query the language model.
5. Response Generation: The model generates a response based on the chosen prompt and input.

## Key Components

1. Language Model: The underlying AI model used for generating responses.
2. Prompt Retrievers: A collection of prompts, each with a name, description, and template.
3. Input Moderation (Optional): Filters to ensure safe and appropriate inputs.

## Using the Multi Prompt Chain with AnswerAgentAI API

### Basic Usage

Here's how to use the Multi Prompt Chain via the AnswerAgentAI API:

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "question": "What's the capital of France?",
    "overrideConfig": {
        "promptRetriever": [
            {
                "name": "Geography",
                "description": "Answer questions about world geography",
                "systemMessage": "You are a geography expert. Provide accurate information about countries, cities, and landmarks."
            },
            {
                "name": "History",
                "description": "Answer questions about historical events and figures",
                "systemMessage": "You are a history expert. Provide detailed information about historical events, figures, and time periods."
            }
        ]
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### Adding Input Moderation

To include input moderation:

```python
data = {
    "question": "What's the capital of France?",
    "overrideConfig": {
        "promptRetriever": [
            # ... prompt retrievers as before ...
        ],
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

### 1. Multi-Purpose Customer Support Bot

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

def customer_support_bot(query):
    data = {
        "question": query,
        "overrideConfig": {
            "promptRetriever": [
                {
                    "name": "TechnicalSupport",
                    "description": "Handle technical issues and troubleshooting",
                    "systemMessage": "You are a technical support expert. Provide step-by-step solutions for technical problems."
                },
                {
                    "name": "BillingInquiries",
                    "description": "Address questions about billing and payments",
                    "systemMessage": "You are a billing specialist. Provide accurate information about invoices, payments, and subscription details."
                },
                {
                    "name": "ProductInformation",
                    "description": "Provide details about products and services",
                    "systemMessage": "You are a product expert. Offer detailed information about our products, their features, and use cases."
                }
            ]
        }
    }

    response = requests.post(API_URL, json=data, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    return response.json()['text']

# Usage
print(customer_support_bot("How do I reset my password?"))
print(customer_support_bot("What are the features of your premium plan?"))
print(customer_support_bot("I haven't received my latest invoice"))
```

### 2. Educational Content Generator

```javascript
const API_URL = 'http://localhost:3000/api/v1/prediction/<your-chatflowid>'
const API_KEY = 'your-api-key'

async function generateEducationalContent(topic, grade) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: `Create educational content about ${topic} for grade ${grade}`,
            overrideConfig: {
                promptRetriever: [
                    {
                        name: 'ElementaryContent',
                        description: 'Generate content for elementary school students',
                        systemMessage: 'You are an elementary school teacher. Create simple, engaging content suitable for young learners.'
                    },
                    {
                        name: 'MiddleSchoolContent',
                        description: 'Generate content for middle school students',
                        systemMessage:
                            'You are a middle school teacher. Create content that balances depth and accessibility for adolescent learners.'
                    },
                    {
                        name: 'HighSchoolContent',
                        description: 'Generate content for high school students',
                        systemMessage:
                            'You are a high school teacher. Create detailed, challenging content that prepares students for advanced studies.'
                    }
                ]
            }
        })
    })

    const result = await response.json()
    return result.text
}

// Usage
generateEducationalContent('Photosynthesis', '8')
    .then((content) => console.log(content))
    .catch((error) => console.error(error))
```

## Best Practices

1. Diverse Prompts: Create a varied set of prompt templates to cover different types of queries.
2. Clear Descriptions: Write clear, distinctive descriptions for each prompt to aid in selection.
3. Regular Updates: Continuously refine and expand your prompt set based on user interactions.
4. Fallback Option: Include a general-purpose prompt as a fallback for unexpected query types.
5. Monitor Performance: Regularly review which prompts are being selected to optimize your system.

By leveraging the Multi Prompt Chain in AnswerAgentAI, you can create more versatile and intelligent AI applications that adapt to various user inputs and contexts, providing more accurate and relevant responses across a wide range of scenarios.
