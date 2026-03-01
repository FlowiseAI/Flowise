# Parallel Subflows (Flowise Node)

Launch multiple Flowise **subflows in parallel** via `/predict/{id}`, control concurrency, pass branch-specific variables/API keys/timeouts, and return merged results (text/json/full) with optional **timing stats + ASCII timeline** to visualize speedups.

---

## ✨ Features

- **Parallel execution** of subflows with `maxParallel` limit  
- **Flexible “flows” config**: array, map, or strings — the tool normalizes them
- **Per-branch controls**: `timeoutMs`, `vars`, `apiKey`, `questionTemplate`
- **Overall timeout** and **failure policy** (`continue` or `fail-fast`)
- **Return selection**: `text`, `json`, or `full` (text/json/usedTools/sourceDocuments/sessionId)
- **Timing metrics**: total, sum, max, speedup + **ASCII timeline** (1 char = 100ms)
- **Simple templating**: `{{input}}` and `{{var}}` in `questionTemplate`

---

## 📦 Installation

> Assumes a local Flowise monorepo with packages similar to the standard structure.

1. Create these folders (if they don’t exist):

```
packages/components/nodes/tools/ParallelSubflows/
packages/components/nodes/utilities/ParallelSubflows/
```

2. Add the files:

- `ParallelSubflows.ts` → `packages/components/nodes/tools/ParallelSubflows/ParallelSubflows.ts`
- `core.ts` → `packages/components/nodes/utilities/ParallelSubflows/core.ts`
- (Optional) `parallel.svg` in the repo root (used in this README)

3. Build & run Flowise as you normally do (e.g., `pnpm build` then start the app).  
4. In the Flowise UI, add the **Parallel Subflows** node to your flow.
Addional information related to custom nodes in flowise can be found here: https://docs.flowiseai.com/contributing/building-node
---

## ⚙️ Inputs (Node Props)

| Name | Type | Default | Description |
|---|---|---:|---|
| `baseUrl` | string | `http://localhost:3000/api/v1` | Flowise API base URL |
| `defaultApiKey` | string | `''` | API key used if a branch doesn’t specify one |
| `questionTemplate` | string | `{{input}}` | Mustache-like; supports `{{input}}` & variables |
| `flows` | free JSON | — | Rich config of branches (see examples) |
| `maxParallel` | number | `3` | Concurrency limit for parallel calls |
| `overallTimeoutMs` | number | `240000` | Hard ceiling for entire orchestration |
| `failPolicy` | enum | `continue` | `continue` or `fail-fast` |
| `returnSelection` | enum | `full` | `text` \| `json` \| `full` |
| `emitTiming` | boolean | `true` | Appends timing summary + ASCII timeline |

---

## 🧩 “Flows” Config — Flexible Formats

You can paste **any** of the formats below into the **Flows** input (the tool normalizes them):

### 1) Array of objects
```json
[
  { "flowId": "1480...b584", "label": "A", "timeoutMs": 120000, "vars": { "role": "A" } },
  { "flowId": "69a9...5bc4", "label": "B", "timeoutMs": 120000, "vars": { "role": "B" } }
]
```

### 2) Array of flowId strings
```json
["1480...b584", "69a9...5bc4", "d2c1...7aa0"]
```

### 3) Map object (labels → config)
```json
{
  "A": "1480...b584",
  "B": { "flowId": "69a9...5bc4", "vars": { "role": "B" }, "timeoutMs": 90000, "apiKey": "sk-..." }
}
```

> The tool also accepts “JS-like” objects (unquoted keys / single quotes).  
> It will attempt to convert them into valid JSON automatically.

---

## 🧠 Tool Input Patterns

When the tool runs, it expects a **string** or **JSON string** as input:

### A) Plain string input
- Your `questionTemplate` (default `{{input}}`) will inject this text.

Example:
```
"Summarize the latest customer feedback for Product X."
```

### B) JSON string with variables
- Lets you supply both the **prompt** and **branch variables**:

```json
{
  "input": "Create a short sales blurb for Product X.",
  "vars": {
    "tone": "friendly",
    "audience": "retail"
  }
}
```

These variables are available in the template as `{{vars.tone}}`, etc.

---

## 📤 Output

Depends on `returnSelection`:

- `text`: `[{ role, text }]`
- `json`: `[{ role, json }]`
- `full` (default):  
  ```
  [{
    role, text, json, usedTools, sourceDocuments, sessionId,
    ms, tStart, tEnd, relStart, relEnd
  }]
  ```
If `emitTiming` is `true`, the tool appends a final block with:
- **Total wall time**, **sum of branch times**, **max branch time**
- **Speedup** (sum / total)
- **ASCII timeline** (1 char = 100ms), e.g.
```
A |   ######  620ms
B | ####      410ms
S | ######### 1030ms

Timeline (1 char = 100ms):
  A ######
B ####
S #########
```

---

## 🛡️ Failure Policy

- `continue` (default): collect both successes and errors and return all
- `fail-fast`: abort remaining branches on first failure

Each branch also honors its own `timeoutMs`.

---

## 🔐 Authentication

- Use `defaultApiKey` for all branches, **or**
- Set `apiKey` per branch in `flows` to override

Requests are POSTed to:
```
{baseUrl}/predic.../{flowId}
```

---

## 🧪 Tips

- Use **labels** (`A`, `B`, `C`, …) to make timelines and reports readable
- Keep `maxParallel` aligned with your server capacity
- Supply `vars` per branch to tweak prompts/roles without modifying subflows
- Toggle `emitTiming` to measure real-world speedups

---

## 📁 File layout (reference)

```
packages/
  components/
    nodes/
      tools/
        ParallelSubflows/
          ParallelSubflows.ts      # Node definition
          core.ts                  # Execution engine
          parallel.svg             # (optional) image
```

---

## 🙌 Acknowledgements

Built for Flowise to make **multi-agent** and **fan-out/fan-in** patterns easy, observable, and fast.
