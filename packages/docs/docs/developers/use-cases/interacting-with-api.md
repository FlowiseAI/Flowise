---
description: Learn how to use external API integrations with AnswerAgentAI
---

# Interacting with API

---

The OpenAPI Specification (OAS) defines a standard, language-agnostic interface to HTTP APIs. The goal of this use case is to have the LLM automatically figure out which API to call, while still having a stateful conversation with user.

## OpenAPI Chain

1. In this tutorial, we are going to use [Klarna OpenAPI](https://www.klarna.com/us/shopping/public/openai/v0/api-docs/)

```json
{
    "openapi": "3.0.1",
    "info": {
        "version": "v0",
        "title": "Open AI Klarna product Api"
    },
    "servers": [
        {
            "url": "https://www.klarna.com/us/shopping"
        }
    ],
    "tags": [
        {
            "name": "open-ai-product-endpoint",
            "description": "Open AI Product Endpoint. Query for products."
        }
    ],
    "paths": {
        "/public/openai/v0/products": {
            "get": {
                "tags": ["open-ai-product-endpoint"],
                "summary": "API for fetching Klarna product information",
                "operationId": "productsUsingGET",
                "parameters": [
                    {
                        "name": "countryCode",
                        "in": "query",
                        "description": "ISO 3166 country code with 2 characters based on the user location. Currently, only US, GB, DE, SE and DK are supported.",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    },
                    {
                        "name": "q",
                        "in": "query",
                        "description": "A precise query that matches one very small category or product that needs to be searched for to find the products the user is looking for. If the user explicitly stated what they want, use that as a query. The query is as specific as possible to the product name or category mentioned by the user in its singular form, and don't contain any clarifiers like latest, newest, cheapest, budget, premium, expensive or similar. The query is always taken from the latest topic, if there is a new topic a new query is started. If the user speaks another language than English, translate their request into English (example: translate fia med knuff to ludo board game)!",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    },
                    {
                        "name": "size",
                        "in": "query",
                        "description": "number of products returned",
                        "required": false,
                        "schema": {
                            "type": "integer"
                        }
                    },
                    {
                        "name": "min_price",
                        "in": "query",
                        "description": "(Optional) Minimum price in local currency for the product searched for. Either explicitly stated by the user or implicitly inferred from a combination of the user's request and the kind of product searched for.",
                        "required": false,
                        "schema": {
                            "type": "integer"
                        }
                    },
                    {
                        "name": "max_price",
                        "in": "query",
                        "description": "(Optional) Maximum price in local currency for the product searched for. Either explicitly stated by the user or implicitly inferred from a combination of the user's request and the kind of product searched for.",
                        "required": false,
                        "schema": {
                            "type": "integer"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Products found",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ProductResponse"
                                }
                            }
                        }
                    },
                    "503": {
                        "description": "one or more services are unavailable"
                    }
                },
                "deprecated": false
            }
        }
    },
    "components": {
        "schemas": {
            "Product": {
                "type": "object",
                "properties": {
                    "attributes": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "name": {
                        "type": "string"
                    },
                    "price": {
                        "type": "string"
                    },
                    "url": {
                        "type": "string"
                    }
                },
                "title": "Product"
            },
            "ProductResponse": {
                "type": "object",
                "properties": {
                    "products": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/Product"
                        }
                    }
                },
                "title": "ProductResponse"
            }
        }
    }
}
```

<figure><img src="/.gitbook/assets/image (133).png" alt="" /><figcaption></figcaption></figure>

3. However, if you want to have a normal conversation chat, it is not able to do so. You will see the following error:

<figure><img src="/.gitbook/assets/image (134).png" alt="" width="361" /><figcaption></figcaption></figure>

## Tool Agent + OpenAPI Chain

In order to solve the above error, we can use Agent.

1. Connect **OpenAPI Chain** with a **Chain Tool**. This allow the chain to be used as tool. Under the tool, we give an appropriate description as in when should the LLM uses this tool. For example:

```
useful when you need to search and return answer about tshirts
```

<figure><img src="/.gitbook/assets/image (135).png" alt="" /><figcaption></figcaption></figure>

2. Connect the **Chain Tool** with a **Tool Agent**:

<figure><img src="/.gitbook/assets/image (136).png" alt="" /><figcaption></figcaption></figure>

3. Let's try it!

<figure><img src="/.gitbook/assets/image (137).png" alt="" width="563" /><figcaption></figcaption></figure>

## Conclusion

We've successfully created an agent that can interact with API when necessary, and still be able handle stateful conversations with users. Below is the template:

<a href="/.gitbook/assets/OpenAPI Chatflow.json" download>Download /.gitbook/assets/OpenAPI Chatflow.json</a>
