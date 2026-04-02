# OSOP Workflow Example for Flowise

[OSOP](https://github.com/osopcloud/osop-spec) is a portable YAML format for describing AI workflows. It provides a vendor-neutral way to define nodes, edges, and execution metadata so that workflows can be shared across different platforms.

## Why OSOP + Flowise?

Flowise chatflows are powerful but stored in a platform-specific JSON format. By representing a chatflow in OSOP, you get:

- **Portability** — share workflow structure across tools (n8n, LangFlow, custom agents) without lock-in.
- **Version control friendly** — clean YAML diffs in pull requests.
- **Documentation** — a human-readable description of your chatflow architecture.

## What's included

| File | Description |
|------|-------------|
| `chatflow-example.osop.yaml` | A RAG chatflow represented in OSOP format |

## How to read the example

The `.osop.yaml` file defines:

- **nodes** — each processing step (document loader, text splitter, embedding model, vector store, retriever, chat model, response output).
- **edges** — the data flow between nodes, matching how Flowise wires components together.
- **runtime hints** — optional metadata like model provider and model name.

This is purely additive and does not affect any existing Flowise functionality.

## Learn more

- [OSOP Spec](https://github.com/osopcloud/osop-spec)
- [Flowise Documentation](https://docs.flowiseai.com/)
