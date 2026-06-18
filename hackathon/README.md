# Governance-First Agent (Agent Flow v2)

Hackathon prototype: policy checks **inside** the Agent node ReAct loop (`agentAgentflow`), before any tool executes.

## Quick demo (no UI needed)

```bash
# from repo root — requires pnpm build to have been run
node hackathon/demo.mjs
```

Runs 5 scenarios end-to-end and prints a formatted audit log summary to stdout.
Writes entries to `./audit-demo.jsonl`.

## Prerequisites (full UI demo)

-   Flowise running from repo root (`pnpm install`, `pnpm build`, `pnpm dev`)
-   Use **Agent Flow v2** canvas only (`/v2/agentcanvas`) — v1 is deprecated
-   Chat model with tool calling (e.g. OpenAI `gpt-4o-mini`)

## Policy file

[`agent-policies.json`](./agent-policies.json) — loaded at runtime, hot-reloaded on file change (no restart needed).

Rules are evaluated **first-match-wins**. More specific rules must appear before broader ones.

| Rule                        | Tool                                             | Effect                                                  |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `allow-safe-read`           | `get_weather`                                    | allow — runs immediately, no pause                      |
| `deny-destructive`          | `delete_database`                                | deny — blocked outright, agent re-reasons               |
| `allow-internal-email`      | `send_email` (recipient ends with `@aivar.tech`) | allow — internal addresses bypass escalation            |
| `escalate-external-email`   | `send_email` (any other address)                 | escalate → UI Proceed / Reject                          |
| `escalate-transfer-review`  | `transfer_funds`                                 | escalate → UI Proceed / Reject (reviewer can edit args) |
| `escalate-post-to-external` | `post_message` (channel contains `#external`)    | escalate → UI Proceed / Reject                          |
| `deny-post-to-public`       | `post_message` (channel contains `#public`)      | deny — blocked outright                                 |
| `escalate-all-writes`       | `write_*` (prefix wildcard)                      | escalate — all write-class tools require review         |
| `prod-escalate-all`         | `*` when `context.environment == "production"`   | escalate — every tool requires approval in prod         |

## Setup demo flow (UI)

1. Create Agent Flow v2: **Add New** (ensure V2 toggle) → opens `/v2/agentcanvas`.
2. Canvas: **Start** → **Agent** (optionally connect to End).
3. On **Agent** node:
    - **Enable Governance**: `true`
    - **Policy File Path**: `./hackathon/agent-policies.json`
    - **Audit Log Path**: `./audit.jsonl`
    - **Governance Context** (optional): `{"user":"demo","environment":"dev"}`
    - Add model + system message instructing tool use.
4. Add **Custom Function** tools under Agent → **Tools** (names must match policy):

### `get_weather`

Schema: one string input named `input` (location).

```javascript
const location = $input || 'NYC'
return `Weather in ${location}: sunny, 72°F`
```

### `delete_database`

No inputs required.

```javascript
return 'All customer records deleted (simulated).'
```

### `send_email`

Schema: string inputs `to` (email address) and `body` (email body).

```javascript
const recipient = typeof $to !== 'undefined' ? $to : 'unknown'
const message = typeof $body !== 'undefined' ? $body : ''
return `Email sent to ${recipient}: "${message}" (simulated).`
```

### `transfer_funds`

Schema: number `amount`, string `account`.

```javascript
const amt = typeof $amount !== 'undefined' ? $amount : 0
const acc = typeof $account !== 'undefined' ? $account : 'unknown'
return `Transferred $${amt} to account ${acc} (simulated).`
```

## Demo scenarios

| #   | User message                                                  | Expected                                                                            |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | What's the weather in Tokyo?                                  | **allow** → `get_weather` runs, no pause                                            |
| 2   | Delete all customer records                                   | Policy **deny** → synthetic tool observation → agent re-reasons and explains        |
| 3   | Send an email to alice@example.com saying the report is ready | Policy **escalate** → chat shows **Proceed** / **Reject** → on Proceed, email sends |
| 4   | Transfer $50,000 to account 9988776655                        | Policy **escalate** → reviewer can lower amount before approving                    |
| 5   | Send an email to team@aivar.tech with the status update       | **allow** (internal address) → runs immediately                                     |

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

A `traceId` field correlates all steps for a single tool invocation across the log.

The `hitl` entry captures:

-   `humanDecision`: `"proceed"` or `"reject"`
-   `feedback`: optional reviewer note
-   `originalArgs` / `modifiedArgs`: present when the reviewer edited the tool arguments before approving

## Code hook (for judges)

[`packages/components/nodes/agentflow/Agent/Agent.ts`](../packages/components/nodes/agentflow/Agent/Agent.ts) — `handleToolCalls`, immediately before `selectedTool.call()`:

1. `auditPropose()` — logs the agent's intent (tool name + args)
2. `gateToolCall()` — loads policy from JSON file (hot-reloaded on mtime change), evaluates, writes `policy_decision` audit entry
3. **deny** → synthetic `role: tool` message with `[POLICY_DENIED]` prefix → LLM re-reasons without executing the tool
4. **escalate** → `isWaitingForHumanInput: true` → UI shows Proceed/Reject buttons
5. **allow** → `selectedTool.call()` → `auditExecute()` → `auditObserve()` — only execution path

On resume (`handleResumedToolCalls`):

-   **reject** → `auditHitl(..., 'reject', { ruleId, feedback })` → tool removed, agent re-reasons
-   **proceed** → `auditHitl(..., 'proceed', { ruleId, originalArgs?, modifiedArgs?, feedback })` → re-checks for hard deny → executes → `auditExecute()` → `auditObserve()`

Shared module: [`packages/components/src/governance/`](../packages/components/src/governance/).

### Why the hook is at this exact line

The governance gate sits between `response.tool_calls` (the LLM's decision) and `selectedTool.call()` (actual execution). Placing it one line earlier would miss the tool name/args; placing it one line later would have already executed the tool. The `GovernedTool` wrapper provides defense-in-depth — even if `selectedTool.call()` is invoked directly, the gate fires again.

## 5-minute demo script

1. Show v2 canvas + governance inputs on Agent node.
2. Open `Agent.ts` at governance gate (~line 2327).
3. Run **allow** (weather) — show it runs instantly, audit: `propose` → `policy_decision(allow)` → `execute` → `observe`.
4. Run **deny** (delete database) — show agent recovery message, audit: `propose` → `policy_decision(deny)`.
5. Run **escalate** (send email to external) — click **Proceed** in chat, show completion, audit: `propose` → `policy_decision(escalate)` → `hitl(proceed)` → `execute` → `observe`.
6. Run **escalate with arg edit** (transfer funds) — lower the amount in the Proceed dialog, show modified args in audit.
7. Explain unbypassable: `GovernedTool` wrapper + executor gate — `tool.call()` hits the gate regardless of caller.
