# Agent

Dynamically choose and utilize tools during runtime, enabling multi-step reasoning.

## Parameters

| Parameter                      | Description                                                                 | Type           | Required |
| ------------------------------ | --------------------------------------------------------------------------- | -------------- | -------- |
| Model                          | Chat model used by the agent                                                | Async Options  | Yes      |
| Messages                       | System, assistant, developer, or user messages to guide the agent           | Array          | No       |
| OpenAI Built-in Tools          | Built-in OpenAI tools (Web Search, Code Interpreter, Image Generation)      | Multi Options  | No       |
| Gemini Built-in Tools          | Built-in Gemini tools (URL Context, Google Search, Code Execution)          | Multi Options  | No       |
| Anthropic Built-in Tools       | Built-in Anthropic tools (Web Search, Web Fetch)                            | Multi Options  | No       |
| Tools                          | External tools the agent can invoke at runtime                              | Array          | No       |
| Knowledge (Document Stores)    | Document stores for retrieval-augmented generation                          | Array          | No       |
| Knowledge (Vector Embeddings)  | Vector store and embedding pairs for retrieval                              | Array          | No       |
| Enable Memory                  | Enable conversation memory for the thread                                   | Boolean        | No       |
| Memory Type                    | All Messages, Window Size, Conversation Summary, or Summary Buffer          | Options        | No       |
| Input Message                  | Additional user message appended to the conversation                        | String         | No       |
| Return Response As             | Return the response as a User Message or Assistant Message                  | Options        | No       |
| JSON Structured Output         | Instruct the agent to return output in a JSON schema                        | Array          | No       |
| Update Flow State              | Update runtime state during workflow execution                              | Array          | No       |

## Features

- **Tool Calling**: Automatically selects and invokes tools based on the conversation context. Supports recursive tool calls.
- **Knowledge Bases**: Connect document stores or vector store/embedding pairs for retrieval-augmented generation.
- **Built-in Provider Tools**: Native support for OpenAI, Gemini, and Anthropic built-in tools.
- **Memory Management**: Supports multiple memory strategies including windowed, summary, and summary buffer.
- **Structured Output**: Optionally enforce JSON structured output with a defined schema.
- **Human-in-the-Loop**: Tools can be configured to require human approval before execution.
- **Streaming**: Supports streaming responses when used as the last node in a flow.

## License

Source code in this repository is made available under the [Apache License Version 2.0](https://github.com/FlowiseAI/Flowise/blob/master/LICENSE.md).
