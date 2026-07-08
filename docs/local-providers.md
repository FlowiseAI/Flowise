# Local LLM Providers

Flowise supports several ways to run models locally without cloud API keys. This guide covers the three most common setups: **Ollama**, **LocalAI**, and **LM Studio**.

For node-level API reference, see the official docs:

- [ChatOllama](https://docs.flowiseai.com/integrations/langchain/chat-models/chatollama)
- [ChatLocalAI](https://docs.flowiseai.com/integrations/langchain/chat-models/chatlocalai)

## Quick comparison

| Provider | Flowise node(s) | Default base URL | Best for |
| -------- | --------------- | ---------------- | -------- |
| Ollama | ChatOllama, Ollama, Ollama Embedding | `http://localhost:11434` | Easiest local setup; native Ollama models |
| LocalAI | ChatLocalAI, LocalAI Embedding | `http://localhost:8080/v1` | OpenAI-compatible local server; ggml models |
| LM Studio | ChatOpenAI Custom | `http://localhost:1234/v1` | GUI model loader; OpenAI-compatible API |

---

## Ollama

### 1. Install and pull a model

```bash
# Install from https://ollama.com/download
ollama pull llama3.2

# Or run in Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
docker exec -it ollama ollama pull llama3.2
```

Verify the server is running:

```bash
curl http://localhost:11434/api/tags
```

### 2. Configure ChatOllama in Flowise

1. Open the canvas and add **Chat Models → Ollama**.
2. Set **Model Name** to the tag you pulled (e.g. `llama3.2`).
3. Leave **Base URL** as `http://localhost:11434` when Flowise runs on the same machine.

Optional fields worth tuning for RAG workloads:

- **Context Window Size** (`numCtx`) — increase when documents are long (e.g. `8192`).
- **Keep Alive** — keep the model loaded between requests (e.g. `10m`).
- **Number of GPU** (`numGpu`) — set layers to offload; on macOS defaults to Metal.

### 3. Embeddings with Ollama

For local RAG, pair **ChatOllama** with **Embeddings → Ollama Embedding**:

| Field | Example |
| ----- | ------- |
| Base URL | `http://localhost:11434` |
| Model Name | `nomic-embed-text` |

Pull the embedding model first:

```bash
ollama pull nomic-embed-text
```

### 4. Ollama Cloud (optional)

If you use [Ollama Cloud](https://ollama.com) instead of a local daemon:

1. Create an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys).
2. In Flowise, create an **Ollama API** credential with that key.
3. Set **Base URL** to `https://ollama.com`.
4. Use a cloud-available model name.

### 5. Docker networking (Flowise + Ollama both in containers)

When Flowise and Ollama run in separate Docker containers, `localhost` inside the Flowise container does not reach Ollama.

| Host OS | Base URL for ChatOllama |
| ------- | ----------------------- |
| Windows / macOS | `http://host.docker.internal:11434` |
| Linux | `http://172.17.0.1:11434` (default Docker bridge gateway) |

> **Note:** Ollama listens on port **11434**, not 8000.

---

## LocalAI

LocalAI exposes an OpenAI-compatible REST API for ggml-compatible models.

### 1. Start LocalAI

```bash
git clone https://github.com/mudler/LocalAI
cd LocalAI
# Place model files in models/
docker compose up -d --pull always
```

Verify:

```bash
curl http://localhost:8080/v1/models
```

### 2. Configure ChatLocalAI in Flowise

1. Add **Chat Models → LocalAI**.
2. Set **Base Path** to `http://localhost:8080/v1`.
3. Set **Model Name** to the filename in your `models/` directory (e.g. `ggml-gpt4all-j.bin`).

For embeddings, use **Embeddings → LocalAI Embedding** with the same base path and an embedding-capable model name.

### 3. Docker networking

| Host OS | Base Path |
| ------- | --------- |
| Windows / macOS | `http://host.docker.internal:8080/v1` |
| Linux | `http://172.17.0.1:8080/v1` |

LocalAI accepts a placeholder API key. Flowise sends `sk-` by default when no credential is attached.

---

## LM Studio

LM Studio is not a dedicated Flowise node. It works through the **OpenAI-compatible local server** that LM Studio exposes.

### 1. Start the local server in LM Studio

1. Load a model in LM Studio.
2. Open the **Local Server** tab.
3. Start the server (default port **1234**).
4. Note the model identifier shown in the server panel.

### 2. Configure ChatOpenAI Custom in Flowise

1. Add **Chat Models → OpenAI Custom Model**.
2. Set **Model Name** to the identifier from LM Studio (e.g. `meta-llama-3.1-8b-instruct`).
3. Expand **Additional Parameters** and set **Base Path** to:

   ```
   http://localhost:1234/v1
   ```

4. Credentials are optional — LM Studio does not validate the API key. You can create an OpenAI credential with any placeholder value, or leave credentials unset if your Flowise version allows it.

### 3. Embeddings in LM Studio workflows

LM Studio's local server is primarily for chat completions. For RAG with LM Studio chat + local embeddings, use one of:

- **Ollama Embedding** or **LocalAI Embedding** for the vector store pipeline
- **In-memory** or **HuggingFace Inference** embeddings if you already run those services

A typical local stack: **ChatOpenAI Custom (LM Studio)** + **Ollama Embedding** + **Faiss** or **Chroma** vector store.

### 4. Docker networking

If Flowise runs in Docker but LM Studio runs on the host:

| Host OS | Base Path |
| ------- | --------- |
| Windows / macOS | `http://host.docker.internal:1234/v1` |
| Linux | `http://172.17.0.1:1234/v1` |

Ensure LM Studio binds to `0.0.0.0` (not only `127.0.0.1`) when accessed from a container.

---

## End-to-end local RAG stack

The built-in marketplace template **Local QnA** (`packages/server/marketplaces/chatflows/Local QnA.json`) wires:

```
PDF Loader → Text Splitter → Ollama Embedding → Faiss
                                    ↓
              Conversational Retrieval QA Chain ← ChatOllama
```

To use it:

1. Go to **Marketplace → Chatflows → Local QnA**.
2. Click **Use Template**.
3. Replace placeholder model names with models you have pulled locally.
4. Upload a PDF and run the flow.

See [RAG & Agent Templates](./rag-and-agent-templates.md) for more template options.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `ECONNREFUSED` on chat | Wrong base URL or server not running | Confirm `curl` to the base URL; fix Docker host URL |
| Model not found | Name mismatch | Use exact tag from `ollama list` or LocalAI `/v1/models` |
| Slow first response | Model cold start | Set Ollama **Keep Alive**; preload model in LM Studio |
| Empty RAG answers | Embedding/chat model mismatch | Use the same provider family or verify dimensions match |
| Works locally, fails in Docker | `localhost` scope | Switch to `host.docker.internal` or bridge IP |

## Related nodes

| Category | Node | Purpose |
| -------- | ---- | ------- |
| Chat Models | `chatOllama` | Ollama chat |
| Chat Models | `chatLocalAI` | LocalAI chat |
| Chat Models | `chatOpenAICustom` | LM Studio and other OpenAI-compatible servers |
| LLMs | `ollama` | Non-chat Ollama completion |
| Embeddings | `ollamaEmbedding` | Ollama embeddings |
| Embeddings | `localAIEmbeddings` | LocalAI embeddings |
| Vector Stores | `faiss`, `chroma`, `inMemory` | Local vector storage |