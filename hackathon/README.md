# Governance-First Agent (Agent Flow v2)

Hackathon prototype: policy checks **inside** the Agent node ReAct loop (`agentAgentflow`), before any tool executes.

## Prerequisites

- Flowise running from repo root (`pnpm install`, `pnpm build`, `pnpm dev`)
- Use **Agent Flow v2** canvas only (`/v2/agentcanvas`) — v1 is deprecated
- Chat model with tool calling (e.g. OpenAI `gpt-4o-mini`)

## Policy file

[`agent-policies.json`](./agent-policies.json) — loaded at runtime (not hardcoded in agent logic).

| Rule | Tool | Effect |
|------|------|--------|
| allow-safe-read | `get_weather` | allow — runs immediately |
| deny-destructive | `delete_database` | deny — blocked, agent re-reasons |
| escalate-external-email | `send_email` (any `to` containing `@`) | escalate → UI Proceed/Reject |

## Setup demo flow

1. Create Agent Flow v2: **Add New** (ensure V2 toggle) → opens `/v2/agentcanvas`.
2. Canvas: **Start** → **Agent** (optionally connect to End).
3. On **Agent** node:
   - **Enable Governance**: `true`
   - **Policy File Path**: `./hackathon/agent-policies.json`
   - **Audit Log Path**: `./audit.jsonl`
   - **Governance Context** (optional): `{"user":"demo","environment":"dev"}`
   - Add model + system message instructing tool use.
4. Add three **Custom Function** tools under Agent → **Tools** (names must match policy):

### `get_weather`

Schema: one string input named `input` (location).

```javascript
const location = $input || 'NYC';
return `Weather in ${location}: sunny, 72°F`;
```

Function name: `get_weather`.

### `delete_database`

No inputs required.

```javascript
return 'All customer records deleted (simulated).';
```

Function name: `delete_database`.

### `send_email`

Schema: two string inputs — `recipient` (email address) and `message` (email body).

> **Important:** name the schema fields exactly `recipient` and `message` in the Custom Function node's input schema. The tool code uses `$recipient` and `$message`.

```javascript
const to = typeof $recipient !== 'undefined' ? $recipient : 'unknown';
const body = typeof $message !== 'undefined' ? $message : '';
return `Email sent to ${to}: "${body}" (simulated).`;
```

Function name: `send_email`.

> **Why `send_email` instead of `transfer_funds`?**
> The escalate rule uses `contains` on the `to` string — immune to LLM type coercion.
> `transfer_funds` with a numeric `amount > 1000` condition was unreliable because LLMs
> often pass numbers as strings, causing the `gt` comparison to silently fail.

## Demo scenarios

| # | User message | Expected |
|---|--------------|----------|
| 1 | What's the weather in Tokyo? | **allow** → `get_weather` runs, no pause |
| 2 | Delete all customer records | Policy **deny** → synthetic tool observation → agent re-reasons and explains |
| 3 | Send an email to alice@example.com saying the report is ready | Policy **escalate** → chat shows **Proceed** / **Reject** → on Proceed, email sends |

After each run, inspect `./audit.jsonl` at repo root (or path configured on the node).

## Code hook (for judges)

[`packages/components/nodes/agentflow/Agent/Agent.ts`](../packages/components/nodes/agentflow/Agent/Agent.ts) — `handleToolCalls`, immediately before `selectedTool.call()`:

1. `gateToolCall()` — policy loaded from JSON file (hot-reloaded on mtime change)
2. deny → synthetic `role: tool` message with `[POLICY_DENIED]` prefix → LLM re-reasons
3. escalate → `isWaitingForHumanInput: true` → [`buildAgentflow.ts`](../packages/server/src/utils/buildAgentflow.ts) stops flow, UI shows Proceed/Reject buttons
4. allow → `selectedTool.call()` — only execution path

Shared module: [`packages/components/src/governance/`](../packages/components/src/governance/).

## 5-minute demo script

1. Show v2 canvas + governance inputs on Agent node.
2. Open `Agent.ts` at governance gate (~line 2320).
3. Run **allow** (weather) — show it runs instantly, audit `propose` + `policy_decision` + `execute`.
4. Run **deny** (delete database) — show agent recovery message, audit `policy_decision` with `effect: deny`.
5. Run **escalate** (send email) — click **Proceed** in chat, show completion, audit `hitl` + `execute` lines.
6. Explain unbypassable: `GovernedTool` wrapper + executor gate — `tool.call()` hits the gate regardless of caller.
