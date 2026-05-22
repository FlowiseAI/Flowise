# Governance-First Agent (Agent Flow v2)

Hackathon prototype: policy checks **inside** the Agent node ReAct loop (`agentAgentflow`), before any tool executes.

## Prerequisites

-   Flowise running from repo root (`pnpm install`, `pnpm build`, `pnpm dev`)
-   Use **Agent Flow v2** canvas only (`/v2/agentcanvas`) — v1 is deprecated
-   Chat model with tool calling (e.g. OpenAI `gpt-4o-mini`)

## Policy file

[`agent-policies.json`](./agent-policies.json) — loaded at runtime (not hardcoded in agent logic).

| Rule                    | Tool                                            | Effect                                       |
| ----------------------- | ----------------------------------------------- | -------------------------------------------- |
| allow-safe-read         | `get_weather`                                   | allow — runs immediately, no pause           |
| allow-internal-email    | `send_email` (recipient contains `@aivar.tech`) | allow — internal addresses bypass escalation |
| deny-destructive        | `delete_database`                               | deny — blocked outright, agent re-reasons    |
| escalate-external-email | `send_email` (any other address)                | escalate → UI Proceed/Reject                 |

Rules are evaluated first-match-wins. More specific rules (allow for internal email) must appear before broader rules (escalate catch-all).

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
const location = $input || 'NYC'
return `Weather in ${location}: sunny, 72°F`
```

Function name: `get_weather`.

### `delete_database`

No inputs required.

```javascript
return 'All customer records deleted (simulated).'
```

Function name: `delete_database`.

### `send_email`

Schema: two string inputs — `recipient` (email address) and `message` (email body).

> **Important:** name the schema fields exactly `recipient` and `message` in the Custom Function node's input schema. The tool code uses `$recipient` and `$message`.

```javascript
const to = typeof $recipient !== 'undefined' ? $recipient : 'unknown'
const body = typeof $message !== 'undefined' ? $message : ''
return `Email sent to ${to}: "${body}" (simulated).`
```

Function name: `send_email`.

## Demo scenarios

| #   | User message                                                  | Expected                                                                            |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | What's the weather in Tokyo?                                  | **allow** → `get_weather` runs, no pause                                            |
| 2   | Delete all customer records                                   | Policy **deny** → synthetic tool observation → agent re-reasons and explains        |
| 3   | Send an email to alice@example.com saying the report is ready | Policy **escalate** → chat shows **Proceed** / **Reject** → on Proceed, email sends |

After each run, inspect `./audit.jsonl` at repo root (or path configured on the node).

## Audit log

Each tool invocation produces a chain of entries:

```
propose → policy_decision → [hitl] → execute → observe
```

| Step              | When written                                                |
| ----------------- | ----------------------------------------------------------- |
| `propose`         | Agent decides to call a tool (before policy check)          |
| `policy_decision` | Policy evaluated — effect is `allow`, `deny`, or `escalate` |
| `hitl`            | Human responds (Proceed or Reject) to an escalation         |
| `execute`         | Tool actually runs — includes tool output                   |
| `observe`         | Tool result fed back into the agent loop                    |

A judge can open `audit.jsonl` and reconstruct the full decision history for every run.

## Code hook (for judges)

[`packages/components/nodes/agentflow/Agent/Agent.ts`](../packages/components/nodes/agentflow/Agent/Agent.ts) — `handleToolCalls`, immediately before `selectedTool.call()`:

1. `auditPropose()` — logs the agent's intent (tool name + args)
2. `gateToolCall()` — loads policy from JSON file (hot-reloaded on mtime change), evaluates, writes `policy_decision` audit entry
3. **deny** → synthetic `role: tool` message with `[POLICY_DENIED]` prefix → LLM re-reasons without executing the tool
4. **escalate** → `isWaitingForHumanInput: true` → [`buildAgentflow.ts`](../packages/server/src/utils/buildAgentflow.ts) stops flow, UI shows Proceed/Reject buttons
5. **allow** → `selectedTool.call()` → `auditExecute()` → `auditObserve()` — only execution path

On resume (`handleResumedToolCalls`):

-   **reject** → `auditHitl(..., 'reject', { ruleId })` → tool removed, agent re-reasons
-   **proceed** → `auditHitl(..., 'proceed', { ruleId })` → re-checks for hard deny → executes → `auditExecute()` → `auditObserve()`

Shared module: [`packages/components/src/governance/`](../packages/components/src/governance/).

### Why the hook is at this exact line

The governance gate sits between `response.tool_calls` (the LLM's decision) and `selectedTool.call()` (actual execution). Placing it one line earlier would miss the tool name/args; placing it one line later would have already executed the tool. The `GovernedTool` wrapper provides defense-in-depth — even if `selectedTool.call()` is invoked directly, the gate fires again.

## 5-minute demo script

1. Show v2 canvas + governance inputs on Agent node.
2. Open `Agent.ts` at governance gate (~line 2327).
3. Run **allow** (weather) — show it runs instantly, audit: `propose` → `policy_decision(allow)` → `execute` → `observe`.
4. Run **deny** (delete database) — show agent recovery message, audit: `propose` → `policy_decision(deny)`.
5. Run **escalate** (send email) — click **Proceed** in chat, show completion, audit: `propose` → `policy_decision(escalate)` → `hitl(proceed)` → `execute` → `observe`.
6. Explain unbypassable: `GovernedTool` wrapper + executor gate — `tool.call()` hits the gate regardless of caller.
