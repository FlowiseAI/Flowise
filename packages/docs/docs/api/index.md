---
title: API Documentation
description: Explore the AnswerAI API documentation
sidebar_position: 1
---

# AnswerAI API Documentation

Welcome to the AnswerAI API documentation. This section provides detailed information about our APIs, including endpoints, request/response formats, and examples.

## Available APIs

AnswerAI offers a comprehensive suite of APIs to help you integrate our AI capabilities into your applications:

-   Assistants API - Create and manage AI assistants
-   Attachments API - Handle file attachments for conversations
-   Chat Message API - Manage conversation messages
-   Leads API - Track and manage potential customer interactions
-   Prediction API - Get AI-powered predictions and responses
-   Chatflows API - Create and manage conversation flows
-   Document Store API - Manage your knowledge base documents
-   Feedback API - Collect and process user feedback
-   Tools API - Extend functionality with custom tools
-   Variables API - Manage dynamic variables in your conversations
-   Vector Upsert API - Update your vector database

## Getting Your API Key

To use the AnswerAI APIs, you'll need an API key. Follow these steps to generate one:

1. Go to the Sidekick Studio at [https://studio.theanswer.ai/sidekick-studio/apikey](https://studio.theanswer.ai/sidekick-studio/apikey)
2. Log in to your account if you haven't already
3. Click on "Generate API Key"
4. Copy your API key and store it securely
5. Use this key in your API requests as shown in the Authentication section below

**Important**: Treat your API keys like passwords. Do not share them in publicly accessible areas such as GitHub, client-side code, or in your application's source code.

## Authentication

Most API endpoints require authentication. To authenticate your requests, you need to include an API key in the header of your requests:

```http
Authorization: Bearer YOUR_API_KEY
```

## Rate Limiting

Our APIs have rate limits to ensure fair usage. The current rate limits are:

-   100 requests per minute
-   5,000 requests per day

If you exceed these limits, you'll receive a `429 Too Many Requests` response.

## Need Help?

If you have any questions or need assistance with our APIs, please contact our [support team](mailto:support@theanswer.ai) or join our [Discord community](https://discord.gg/X54ywt8pzj).
