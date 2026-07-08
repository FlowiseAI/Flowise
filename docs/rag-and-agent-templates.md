# RAG & Agent Templates

Flowise ships ready-made flows in `packages/server/marketplaces/`. Use them from **Marketplace** in the UI to avoid building common patterns from scratch.

This guide maps templates to use cases and shows how to adapt them for local LLM providers.

## Accessing templates

1. Open Flowise at `http://localhost:3000`.
2. Navigate to **Marketplace** in the sidebar.
3. Browse **Chatflows**, **Agentflows v2**, or **Tools**.
4. Click a template → **Use Template** to open it in the canvas.

Templates are JSON files loaded at server startup from:

```
packages/server/marketplaces/
├── chatflows/        # LangChain chatflow templates
├── agentflowsv2/     # AgentFlow v2 templates
├── agentflows/       # Legacy agentflow templates
└── tools/            # Reusable tool templates
```

---

## Chatflow templates for RAG

| Template | File | Use case |
| -------- | ---- | -------- |
| **Local QnA** | `chatflows/Local QnA.json` | Fully local RAG: Ollama + LocalAI embeddings + Faiss |
| **Conversational Retrieval QA Chain** | `chatflows/Conversational Retrieval QA Chain.json` | Classic RAG with conversational memory |
| **Multiple Documents QnA** | `chatflows/Multiple Documents QnA.json` | Q&A across several uploaded files |
| **Github Docs QnA** | `chatflows/Github Docs QnA.json` | Ingest GitHub repository documentation |
| **Query Engine** | `chatflows/Query Engine.json` | LlamaIndex-style query engine |
| **SubQuestion Query Engine** | `chatflows/SubQuestion Query Engine.json` | Decompose complex questions into sub-queries |

### Local QnA — recommended starting point

Description: _"QnA chain using Ollama local LLM, LocalAI embedding model, and Faiss local vector store"_

**Before running:**

1. Start Ollama and pull a chat model (`ollama pull llama3.2`).
2. Start LocalAI with an embedding model, or swap the embedding node to **Ollama Embedding**.
3. Open the template and update model name fields to match your local models.
4. Upload a PDF via the **PDF Loader** node or replace it with your preferred document loader.

**Core flow:**

```
Document Loader → Text Splitter → Embeddings → Faiss (upsert)
                                                    ↓
User question → Conversational Retrieval QA Chain ← Chat Model
```

See [Local LLM Providers](./local-providers.md) for provider-specific base URLs.

### Conversational Retrieval QA Chain

Best when you already have a cloud or local chat model configured. Provides:

- Follow-up question handling with chat history
- Source document return (enable in chain settings)

Swap the default chat model node for **ChatOllama** or **ChatOpenAI Custom (LM Studio)** to run locally.

---

## AgentFlow v2 templates

AgentFlow v2 templates live under `agentflowsv2/` and use the visual agent editor.

| Template | File | Use case |
| -------- | ---- | -------- |
| **Simple RAG** | `agentflowsv2/Simple RAG.json` | Basic retrieve-then-answer agent |
| **Agentic RAG** | `agentflowsv2/Agentic RAG.json` | Agent decides when/how to retrieve |
| **Supervisor Worker** | `agentflowsv2/Supervisor Worker.json` | Multi-agent task delegation |
| **Deep Research With Subagents** | `agentflowsv2/Deep Research With Subagents.json` | Research workflow with sub-agents |
| **SQL Agent** | `agentflowsv2/SQL Agent.json` | Natural language to SQL |
| **Human In The Loop** | `agentflowsv2/Human In The Loop.json` | Pause for human approval |
| **Structured Output** | `agentflowsv2/Structured Output.json` | JSON/schema-constrained responses |
| **Agents Handoff** | `agentflowsv2/Agents Handoff.json` | Transfer between specialized agents |

### Simple RAG

Description: _"A basic RAG agent that can retrieve documents from document store and answer questions"_

**Adaptation checklist:**

1. Open template from Marketplace.
2. Select the **LLM** node → replace with ChatOllama or your preferred local model.
3. Open the **Retriever** node → point to your vector store (Document Store or in-flow Faiss/Chroma).
4. If using a Document Store, create one under **Document Stores** and upsert files first.
5. Test with a question whose answer exists in your indexed content.

### Agentic RAG

Use when simple retrieval is insufficient — the agent can reformulate queries or choose whether to retrieve. Requires a capable local model (larger context helps).

---

## Tool templates

Reusable tools under `marketplaces/tools/` include:

| Template | Purpose |
| -------- | ------- |
| Perplexity AI Search | Web search via Perplexity |
| Spider Web Scraper | Scrape and search web content |
| Send Slack/Discord/Teams Message | Notification integrations |
| Get Current DateTime | Utility for agent date awareness |

Import tools into Agent or Tool Agent nodes from the Marketplace **Tools** tab.

---

## Swapping cloud models for local providers

When adapting any template:

| Template default | Local replacement | Key settings |
| ---------------- | ----------------- | ------------ |
| ChatOpenAI | ChatOllama | Base URL `http://localhost:11434`, model tag |
| ChatOpenAI | ChatOpenAI Custom (LM Studio) | Base Path `http://localhost:1234/v1` |
| OpenAI Embeddings | Ollama Embedding | `nomic-embed-text` or similar |
| OpenAI Embeddings | LocalAI Embedding | Base Path `http://localhost:8080/v1` |
| Pinecone / cloud VS | Faiss / Chroma / In-Memory | Local path or Chroma URL |

After swapping nodes, re-run **Upsert** on vector store nodes before querying.

---

## Performance tips for RAG templates

1. **Add embedding cache** — wire [InMemory Embedding Cache](./llm-caching.md) between embeddings and vector store during development.
2. **Tune chunk size** — start with 1000 tokens chunk / 200 overlap; reduce if answers miss fine details.
3. **Set Top K** — retriever default is often 4; increase for broader context, decrease for precision.
4. **Enable return source documents** — helps debug retrieval quality.

---

## Exporting and sharing your own templates

To contribute a flow back to the community:

1. Open your chatflow → **Settings** → **Export**.
2. Share JSON + screenshot in [GitHub Discussions → Show and Tell](https://github.com/FlowiseAI/Flowise/discussions/categories/show-and-tell).

Enterprise users can save **Custom Templates** from the Marketplace tab (requires `templates:custom` permission).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Template opens empty | Version mismatch | Update Flowise; check server logs for missing nodes |
| No documents retrieved | Vector store not upserted | Run upsert/load flow before Q&A |
| Agent ignores retriever | Wrong tool/retriever wiring | Compare connections to original template JSON |
| Local model timeout | Model too large for hardware | Use a smaller quant; increase timeout in model settings |

## Related documentation

- [Local LLM Providers](./local-providers.md)
- [LLM & Embedding Caching](./llm-caching.md)
- [Official Flowise Docs — Agentflows](https://docs.flowiseai.com/using-flowise/agentflowv2)