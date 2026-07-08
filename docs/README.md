# Flowise In-Repository Guides

These guides complement the official [Flowise documentation](https://docs.flowiseai.com/). They focus on common self-hosted and local-development workflows that are not always easy to discover from the UI alone.

## Guides

| Guide | Description |
| ----- | ----------- |
| [Local LLM Providers](./local-providers.md) | Run Ollama, LocalAI, and LM Studio with Flowise — including Docker networking and embeddings |
| [LLM & Embedding Caching](./llm-caching.md) | Reduce latency and cost with response and embedding caches |
| [RAG & Agent Templates](./rag-and-agent-templates.md) | Start from built-in marketplace templates for document Q&A and AgentFlow v2 |
| [Local Development Setup](./local-development-setup.md) | Developer setup checklist, env files, and common troubleshooting |

## Contributing to documentation

Official docs live in the [FlowiseDocs](https://github.com/FlowiseAI/FlowiseDocs) repository. In-repo guides here cover setup patterns tied directly to nodes and marketplace templates shipped with this codebase.

When adding a new guide:

1. Keep examples aligned with current node names in `packages/components/nodes/`.
2. Link to [docs.flowiseai.com](https://docs.flowiseai.com/) for node-specific API details where they already exist.
3. Avoid private URLs, internal credentials, or environment-specific references.