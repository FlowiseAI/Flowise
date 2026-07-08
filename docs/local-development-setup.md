# Local Development Setup

A concise checklist for running Flowise from source. For npm/Docker quick start, see the [main README](../README.md).

## Prerequisites

| Requirement | Version | Notes |
| ----------- | ------- | ----- |
| Node.js | >= 20 | Required for build and runtime |
| pnpm | v10 | Monorepo package manager (`npm i -g pnpm`) |
| Git | any | Clone and branch for contributions |

Optional for local LLM testing:

- [Ollama](https://ollama.com) on port 11434
- [LM Studio](https://lmstudio.ai) on port 1234
- [LocalAI](https://localai.io) on port 8080

## First-time setup

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise
pnpm install
pnpm build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000).

### Environment files (development mode)

For hot reload during UI/server development:

**`packages/server/.env`** (copy from `.env.example`):

```env
PORT=3000
# DATABASE_PATH=~/.flowise   # optional; defaults to ~/.flowise
```

**`packages/ui/.env`** (copy from `.env.example`):

```env
VITE_PORT=8080
```

Then run:

```bash
pnpm dev
```

The UI dev server runs at [http://localhost:8080](http://localhost:8080) with API proxy to the server.

> Changes in `packages/components` require `pnpm build` to appear in the running app.

## Build memory issues

If `pnpm build` fails with exit code 134 (heap out of memory):

```powershell
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

```bash
# macOS / Linux / Git Bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

## Project layout

| Package | Path | Role |
| ------- | ---- | ---- |
| Server | `packages/server` | Express API, marketplace templates, persistence |
| UI | `packages/ui` | React frontend |
| Components | `packages/components` | LangChain nodes and credentials |
| AgentFlow | `packages/agentflow` | AgentFlow v2 canvas SDK |
| API Docs | `packages/api-documentation` | Swagger UI |

## Running tests

Tests are co-located with source files (`Foo.test.ts` next to `Foo.ts`).

```bash
# All packages
pnpm test

# Individual packages
pnpm --filter flowise-components test
pnpm --filter "./packages/server" test
pnpm --filter @flowiseai/agentflow test
```

## Docker development

See [`docker/README.md`](../docker/README.md) for Compose setup.

Persist data across restarts by setting in `docker/.env`:

```env
DATABASE_PATH=/root/.flowise
LOG_PATH=/root/.flowise/logs
SECRETKEY_PATH=/root/.flowise
BLOB_STORAGE_PATH=/root/.flowise/storage
```

When combining Docker Flowise with local LLM services on the host, use `host.docker.internal` in model base URLs. See [Local LLM Providers](./local-providers.md).

## Useful environment variables

| Variable | Purpose |
| -------- | ------- |
| `DEBUG` | Verbose component logging |
| `DISABLED_NODES` | Comma-separated node names to hide from UI |
| `MODEL_LIST_CONFIG_JSON` | Path or URL to custom model list JSON |
| `FLOWISE_FILE_SIZE_LIMIT` | Upload size cap (default `50mb`) |
| `DATABASE_TYPE` | `sqlite` (default), `postgres`, or `mysql` |

Full list: [CONTRIBUTING.md — Env Variables](../CONTRIBUTING.md#-env-variables) or [docs.flowiseai.com](https://docs.flowiseai.com/configuration/environment-variables).

## Common issues

| Issue | Fix |
| ----- | --- |
| Port 3000 in use | Set `PORT=3001` in `packages/server/.env` |
| Blank UI after component change | Run `pnpm build` from repo root |
| `pnpm install` peer dependency warnings | Expected in monorepo; use pnpm v10 |
| SQLite locked | Only one server instance per `DATABASE_PATH` |
| Cannot reach Ollama from Docker | Use `http://host.docker.internal:11434` |

## Next steps

- [Local LLM Providers](./local-providers.md) — connect Ollama, LM Studio, or LocalAI
- [RAG & Agent Templates](./rag-and-agent-templates.md) — start from marketplace flows
- [Contributing Guide](../CONTRIBUTING.md) — PR process and code standards