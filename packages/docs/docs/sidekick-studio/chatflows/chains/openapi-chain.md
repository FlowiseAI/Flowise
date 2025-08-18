---
description: Learn about the OpenAPI Chain, a powerful tool for automatic API selection and calling in AnswerAgentAI
---

# OpenAPI Chain

## Overview

The OpenAPI Chain in AnswerAgentAI is an advanced chain type that automatically selects and calls APIs based solely on an OpenAPI specification. This chain is particularly useful when you need to interact with external APIs dynamically, without hardcoding specific API calls in your application.

## Key Benefits

-   Automatic API Selection: Chooses the appropriate API endpoint based on the user's query.
-   Dynamic Interaction: Allows interaction with APIs without prior knowledge of their specific endpoints.
-   Flexibility: Can work with any API that provides an OpenAPI (formerly Swagger) specification.
-   Simplicity: Reduces the complexity of integrating multiple APIs into your application.

## When to Use OpenAPI Chain

The OpenAPI Chain is ideal for:

1. Multi-API Integration: When your application needs to interact with multiple APIs.
2. Chatbots and Virtual Assistants: To provide responses that require real-time data from external sources.
3. Dynamic Data Retrieval: When the required data source may vary based on user queries.
4. API Testing and Exploration: For quickly testing or exploring new APIs without writing custom integration code.
5. Workflow Automation: In scenarios where different API calls need to be made based on varying conditions.

## How It Works

1. Input Processing: The chain receives a user query via the AnswerAgentAI API.
2. OpenAPI Spec Analysis: The system analyzes the provided OpenAPI specification.
3. API Selection: Based on the user's query, the appropriate API endpoint is selected.
4. API Call Execution: The selected API is called with the necessary parameters.
5. Response Processing: The API response is processed and formatted.
6. Answer Generation: A human-readable answer is generated based on the API response.

## Key Components

1. ChatOpenAI Model: The language model used for understanding queries and generating responses.
2. OpenAPI Specification: Provided either as a YAML link or a YAML file.
3. Headers: Optional HTTP headers for API calls.
4. Input Moderation: Optional filters to ensure safe and appropriate inputs.

## Using the OpenAPI Chain with AnswerAgentAI API

### Basic Usage

Here's how to use the OpenAPI Chain via the AnswerAgentAI API:

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "question": "What's the weather like in New York?",
    "overrideConfig": {
        "yamlLink": "https://api.openweathermap.org/data/2.5/weather.yaml",
        "headers": {
            "api-key": "your-openweathermap-api-key"
        }
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### Using a YAML File Instead of a Link

If you have a local YAML file, you can use it instead of a link:

```python
import base64

# Read and encode the YAML file
with open("openweathermap.yaml", "rb") as file:
    yaml_content = base64.b64encode(file.read()).decode()

data = {
    "question": "What's the weather like in London?",
    "overrideConfig": {
        "yamlFile": f"data:application/x-yaml;base64,{yaml_content}",
        "headers": {
            "api-key": "your-openweathermap-api-key"
        }
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### Adding Input Moderation

To include input moderation:

```python
data = {
    "question": "What's the weather like in Paris?",
    "overrideConfig": {
        "yamlLink": "https://api.openweathermap.org/data/2.5/weather.yaml",
        "headers": {
            "api-key": "your-openweathermap-api-key"
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

## Use Case Examples

### 1. Multi-Service Travel Assistant

```python
import requests

API_URL = "http://localhost:3000/api/v1/prediction/<your-chatflowid>"
API_KEY = "your-api-key"

def travel_assistant(query):
    data = {
        "question": query,
        "overrideConfig": {
            "yamlLink": "https://api.travelservices.com/openapi.yaml",
            "headers": {
                "Authorization": "Bearer your-travel-api-key"
            }
        }
    }

    response = requests.post(API_URL, json=data, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    return response.json()['text']

# Usage
print(travel_assistant("Find flights from New York to London next week"))
print(travel_assistant("What are the top-rated hotels in Paris?"))
print(travel_assistant("Is a visa required for a US citizen to visit Japan?"))
```

### 2. Financial Information Aggregator

```javascript
const API_URL = 'http://localhost:3000/api/v1/prediction/<your-chatflowid>'
const API_KEY = 'your-api-key'

async function financialInfo(query) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: query,
            overrideConfig: {
                yamlLink: 'https://api.financialdata.com/openapi.yaml',
                headers: {
                    'X-API-Key': 'your-financial-api-key'
                }
            }
        })
    })

    const result = await response.json()
    return result.text
}

// Usage
financialInfo("What's the current stock price of Apple?").then(console.log).catch(console.error)

financialInfo('Give me a summary of the latest market trends').then(console.log).catch(console.error)
```

## Best Practices

1. Secure API Keys: Always keep API keys secure and never expose them in client-side code.
2. Validate OpenAPI Specs: Ensure the OpenAPI specifications you're using are up-to-date and valid.
3. Handle Rate Limits: Be aware of and respect the rate limits of the APIs you're interacting with.
4. Error Handling: Implement robust error handling to manage potential API failures or unexpected responses.
5. Use Input Moderation: Implement input moderation to prevent misuse and ensure appropriate queries.
6. Keep OpenAPI Specs Updated: Regularly update the OpenAPI specifications to ensure you're working with the latest API versions.
7. Monitor Usage: Keep track of API usage to optimize performance and manage costs.

By leveraging the OpenAPI Chain in AnswerAgentAI, you can create flexible and powerful applications that dynamically interact with a wide range of APIs, providing rich and varied functionalities without the need for extensive custom integration code.
