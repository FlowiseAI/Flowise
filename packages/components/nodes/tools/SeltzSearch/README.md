# Seltz Search Tool

A wrapper around the [Seltz](https://seltz.ai) Web Knowledge API. Returns web search results with source URLs, suitable for use in LLM tool-calling, agents, and RAG pipelines.

## Setup

1. Get your API key from the [Seltz Console](https://console.seltz.ai)
2. In Flowise, add the **Seltz Search** tool node to your flow
3. Create a new **Seltz API** credential with your API key
4. Connect the credential to the tool node

## Configuration

| Parameter            | Description                                                        | Required |
| -------------------- | ------------------------------------------------------------------ | -------- |
| **API Key**          | Your Seltz API key (via credential)                                | Yes      |
| **Tool Description** | Custom description for the LLM to understand when to use this tool | No       |
| **Max Documents**    | Maximum number of documents to return                              | No       |
| **Context**          | Additional context to refine the search                            | No       |
| **Profile**          | Search profile to use                                              | No       |

## Output Format

The tool returns a JSON array of documents:

```json
[
    {
        "url": "https://example.com/article",
        "content": "The relevant content from the web page..."
    }
]
```

## Resources

-   [Seltz Documentation](https://docs.seltz.ai)
-   [Seltz Console](https://console.seltz.ai)
-   [npm Package](https://www.npmjs.com/package/seltz)
