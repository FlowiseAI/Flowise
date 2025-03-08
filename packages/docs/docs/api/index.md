---
title: API Documentation
description: Explore the AnswerAI API documentation
sidebar_position: 1
---

# AnswerAI API Documentation

Welcome to the AnswerAI API documentation. This section provides detailed information about our APIs, including endpoints, request/response formats, and examples.

## Available APIs

Currently, we have the following APIs available:

-   [Hello World API](/docs/api/hello-world/hello) - A simple API to demonstrate the OpenAPI documentation setup

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
