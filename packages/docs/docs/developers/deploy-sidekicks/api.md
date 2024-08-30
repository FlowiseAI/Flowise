---
description: Learn how to use the AnswerAI Prediction, Vector Upsert, and Message API
---

# AnswerAI API

## 1. Prediction API

-   POST `/api/v1/prediction/{your-chatflowid}`

### Request Body

| Key            | Description                          | Type   | Required |
| -------------- | ------------------------------------ | ------ | -------- |
| question       | User's question                      | string | Yes      |
| overrideConfig | Override existing flow configuration | object | No       |
| history        | Prepend history messages             | array  | No       |

You can use the chatflow as an API and connect it to frontend applications.

### Override Config

You can override input configuration with the `overrideConfig` property.

```json
{
    "question": "Hey, how are you?",
    "overrideConfig": {
        "sessionId": "123",
        "returnSourceDocuments": true
    }
}
```

### History

You can prepend history messages to provide context to the LLM:

```json
{
    "question": "Hey, how are you?",
    "history": [
        {
            "role": "apiMessage",
            "content": "Hello, how can I help?"
        },
        {
            "role": "userMessage",
            "content": "Hi, my name is Alice"
        },
        {
            "role": "apiMessage",
            "content": "Hi Alice, how can I assist you today?"
        }
    ]
}
```

### Persisting Memory

If the chatflow contains Memory nodes, you can pass a `sessionId` to persist the conversation state:

```json
{
    "question": "Hey, how are you?",
    "overrideConfig": {
        "sessionId": "123"
    }
}
```

### Image Uploads

When image upload is enabled, you can include image data in the request:

```json
{
    "question": "Can you describe this image?",
    "uploads": [
        {
            "data": "data:image/png;base64,iVBORw0KGgdM2uN0",
            "type": "file",
            "name": "example.png",
            "mime": "image/png"
        }
    ]
}
```

### Speech to Text

When speech-to-text is enabled, you can send audio data:

```json
{
    "uploads": [
        {
            "data": "data:audio/webm;codecs=opus;base64,GkXf",
            "type": "audio",
            "name": "speech.webm",
            "mime": "audio/webm"
        }
    ]
}
```

### Authentication

Include an API key in the Authorization header:

```
Authorization: Bearer <your-api-key>
```

## 2. Vector Upsert API

-   POST `/api/v1/vector/upsert/{your-chatflowid}`

### Request Body

| Key            | Description                          | Type   | Required |
| -------------- | ------------------------------------ | ------ | -------- |
| overrideConfig | Override existing flow configuration | object | No       |
| stopNodeId     | Specific vector store node to upsert | array  | No       |

### Document Loaders with Upload

For document loaders that support file uploads, use `multipart/form-data`:

```
POST /api/v1/vector/upsert/{your-chatflowid}
Content-Type: multipart/form-data

files: (binary)
returnSourceDocuments: true
```

### Document Loaders without Upload

For other document loaders, use a JSON body:

```json
{
    "overrideConfig": {
        "returnSourceDocuments": true
    }
}
```

### Authentication

Include an API key in the Authorization header:

```
Authorization: Bearer <your-api-key>
```

## 3. Message API

-   GET `/api/v1/chatmessage/{your-chatflowid}`
-   DELETE `/api/v1/chatmessage/{your-chatflowid}`

### Query Parameters

| Param     | Type   | Description           |
| --------- | ------ | --------------------- |
| sessionId | string | Session identifier    |
| sort      | enum   | ASC or DESC           |
| startDate | string | Start date for filter |
| endDate   | string | End date for filter   |

### Authentication

The Message API is restricted to admin users. Use Basic Authentication:

```
Authorization: Basic <base64-encoded-credentials>
```

## Implementation Examples

Here are some examples of how to use the AnswerAI API in different programming languages:

### Python

```python
import requests

API_URL = "<your-answer-ai-host-domain>/api/v1/prediction/<chatflowid>"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "question": "What is AnswerAI?",
    "overrideConfig": {
        "sessionId": "unique-session-id"
    }
}

response = requests.post(API_URL, json=data, headers=headers)
print(response.json())
```

### JavaScript

```javascript
const API_URL = '<your-answer-ai-host-domain>/api/v1/prediction/<chatflowid>'
const API_KEY = 'your-api-key'

async function query(data) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    return await response.json()
}

query({
    question: 'What is AnswerAI?',
    overrideConfig: {
        sessionId: 'unique-session-id'
    }
}).then((response) => console.log(response))
```

These examples demonstrate how to make basic API calls to AnswerAI. Remember to replace `<chatflowid>` with your actual chatflow ID and use your specific API key for authentication.
