# LLM & Embedding Caching

Flowise integrates LangChain cache nodes to avoid redundant LLM calls and embedding computations. Caching is especially useful for:

- Repeated identical prompts in development
- High-traffic chatflows with common questions
- RAG pipelines that re-embed the same document chunks

## Cache types in Flowise

| Node | Category | What it caches | Persistence |
| ---- | -------- | -------------- | ----------- |
| InMemory Cache | Cache | LLM responses | Per chatflow; cleared on restart |
| Redis Cache | Cache | LLM responses | Shared across processes/servers |
| Momento Cache | Cache | LLM responses | Distributed serverless cache |
| Upstash Redis Cache | Cache | LLM responses | Managed Redis (Upstash) |
| InMemory Embedding Cache | Cache | Embedding vectors | Per chatflow; cleared on restart |
| Redis Embeddings Cache | Cache | Embedding vectors | Shared across processes/servers |

Cache nodes output a `BaseCache` (LLM) or wrapped `Embeddings` (embedding cache) that downstream nodes consume.

---

## LLM response caching

Many chat model and LLM nodes expose an optional **Cache** input. Connect a cache node to that input before connecting the model to your chain or agent.

### Supported models (partial list)

Cache input is available on nodes including:

- ChatOllama, ChatLocalAI, ChatOpenAI, ChatOpenAI Custom
- Groq, Mistral, Anthropic, Cohere, TogetherAI
- Ollama (LLM), OpenAI (LLM), Azure OpenAI

Check the node's **Cache** field in the UI — if present, any `BaseCache` output can be wired in.

### InMemory Cache (development)

Best for local testing. Cache is scoped to the chatflow and stored in Flowise's cache pool.

```
[InMemory Cache] ──► [ChatOllama / ChatOpenAI / ...] ──► [Chain or Agent]
```

**Behavior:**

- Identical prompts with the same model configuration return cached text.
- Cache is lost when the Flowise process restarts.
- LangChain skips `handleLLMStart` / token streaming callbacks on cache hits.

### Redis Cache (production)

Use when running multiple Flowise workers or queue mode.

**Setup:**

1. Add **Cache → Redis Cache**.
2. Attach **Redis Cache API** or **Redis Cache URL API** credentials.
3. Optionally set **Time to Live (ms)** — cached entries expire after TTL.
4. Connect the Redis Cache output to your chat model's **Cache** input.

**Credential options:**

| Credential | Fields |
| ---------- | ------ |
| Redis Cache API | Host, port, username, password, SSL |
| Redis Cache URL API | `redis://` or `rediss://` connection URL |

Redis Cache reconnects automatically if the connection drops during lookup/update.

### Momento & Upstash

For managed infrastructure without self-hosting Redis:

- **Momento Cache** — requires Momento API credentials and cache name.
- **Upstash Redis Cache** — requires Upstash REST URL and token.

Both follow the same wiring pattern as Redis Cache.

---

## Embedding caching

Embedding caches wrap an underlying embeddings node so repeated text is not re-vectorized.

### InMemory Embedding Cache

```
[Ollama Embedding] ──► [InMemory Embedding Cache] ──► [Faiss / Chroma / ...]
```

**Fields:**

- **Embeddings** — connect your embeddings node output here.
- **Namespace** (optional) — isolate cache keys when sharing a Flowise instance.

### Redis Embeddings Cache

Same pattern as InMemory, but vectors persist in Redis.

**Additional fields:**

- **Time to Live (ms)** — default `3600000` (1 hour).
- **Namespace** — prefix for cache keys.

Use Redis Embeddings Cache when:

- Multiple workers upsert the same document store
- You re-run ingestion flows against unchanged files

---

## Example: cached local Ollama chat

```
┌─────────────────┐     ┌────────────┐     ┌──────────────────┐
│ InMemory Cache  │────►│ ChatOllama │────►│ Conversation     │
│                 │     │ llama3.2   │     │ Chain            │
└─────────────────┘     └────────────┘     └──────────────────┘
```

1. Add **InMemory Cache** to the canvas.
2. Add **ChatOllama** and connect the cache output to the model's **Cache** input.
3. Connect ChatOllama to your chain.
4. Ask the same question twice — the second response should return without a full model inference (no token stream on cache hit).

---

## Example: cached RAG ingestion

```
┌──────────────┐   ┌─────────────────────────┐   ┌────────┐
│ Ollama       │──►│ InMemory Embedding Cache│──►│ Faiss  │
│ Embedding    │   │                         │   │        │
└──────────────┘   └─────────────────────────┘   └────────┘
```

Re-upserting the same PDF chunks reuses stored vectors instead of calling the embedding model again.

---

## Cache key behavior

LLM caches key on the **prompt text** and an **LLM configuration hash** (model name, temperature, and related parameters). Changing any model parameter misses the cache.

Embedding caches key on the **document text** (with optional namespace prefix).

---

## When caching does not help

- **Streaming UX testing** — cached responses bypass token streaming.
- **Identical prompts, different session context** — chains that inject memory/history change the effective prompt; cache hits decrease.
- **Tool-calling agents** — multi-step tool loops rarely repeat identical full prompts.
- **Provider-side prompt caching** — Anthropic/OpenAI prompt caching is separate from these LangChain cache nodes. Flowise cache nodes store full prior responses, not provider token-cache discounts.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| No cache hit on repeat question | Memory/history alters prompt | Test with a chain that has no memory, or identical full prompt |
| Redis connection errors | Wrong credentials or network | Verify `PING` from Flowise host; check `REDIS_KEEP_ALIVE` env |
| Stale answers after prompt change | Old cache entry | Restart Flowise (InMemory) or flush Redis keys |
| Embeddings still slow | Cache not in path | Ensure embeddings flow _through_ the cache node, not around it |

## Related documentation

- [Local LLM Providers](./local-providers.md) — Ollama and LocalAI setup
- [RAG & Agent Templates](./rag-and-agent-templates.md) — templates that benefit from embedding caches