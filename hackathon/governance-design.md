# Flowise Agent Governance — Design Document

> HLD · LLD · Flowcharts (Mermaid)

---

## Table of Contents

1. [High-Level Design (HLD)](#1-high-level-design)
2. [Low-Level Design (LLD)](#2-low-level-design)
3. [Flowcharts](#3-flowcharts)
    - 3.1 System Context
    - 3.2 Happy-path (allow)
    - 3.3 Hard-deny path
    - 3.4 Escalation / HITL pause
    - 3.5 HITL resume — proceed (approve as-is / redirect)
    - 3.6 HITL resume — reject
    - 3.7 Policy evaluation internals
    - 3.8 Audit lifecycle (sequence)
4. [Appendix: Rule Evaluation Examples](#4-appendix-rule-evaluation-examples)

---

## 1. High-Level Design

### 1.1 Purpose

The governance layer sits **between the LLM's tool-call decision and actual tool execution**. It enforces a declarative JSON policy file at runtime, produces a tamper-evident append-only audit log, and surfaces Human-in-the-Loop (HITL) checkpoints to the chat UI via SSE events — all without modifying the underlying tools or the LLM.

### 1.2 System Context Diagram

```mermaid
graph TD
    LLM["LLM\n(OpenAI / Bedrock / etc.)"]
    AgentLoop["Agent Loop\nAgent.ts"]
    GovCore["Governance Core\npolicyLoader · policyEvaluator · gate · auditLogger"]
    GovernedTool["GovernedTool\ndefense-in-depth wrapper"]
    PolicyFile["policy.json\nhot-reload by mtime"]
    AuditLog["audit.jsonl\nappend-only JSONL"]
    SSE["SSE Stream\nGovernanceEvent → UI"]
    Tools["Actual Tools\n(unchanged)"]

    LLM -- "tool_call" --> AgentLoop
    AgentLoop -- "observation" --> LLM
    AgentLoop -- "auditPropose / gateToolCall\nauditExecute / auditObserve" --> GovCore
    AgentLoop -- "selectedTool.call()" --> GovernedTool
    GovernedTool -- "defense-in-depth gateToolCall" --> GovCore
    GovernedTool -- "inner._call()" --> Tools
    GovCore -- "loadPolicyFile" --> PolicyFile
    GovCore -- "appendAuditLog" --> AuditLog
    GovCore -- "streamGovernanceEvent" --> SSE
```

### 1.3 Key Design Principles

| Principle                | How it is achieved                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Non-invasive**         | Tools are wrapped via `GovernedTool`; LLM and tool implementations are unchanged                        |
| **Declarative policy**   | JSON rules file; no code changes needed to add/change rules                                             |
| **Hot-reload**           | `policyLoader` caches by `mtime`; policy changes take effect on the next tool call                      |
| **First-match wins**     | Rules evaluated in file order; specific rules go before wildcards                                       |
| **Defense-in-depth**     | `GovernedTool._call()` re-checks policy even if the agent loop is bypassed                              |
| **Tamper-evident audit** | Append-only JSONL; every step (propose → policy_decision → hitl → execute → observe) is a separate line |
| **UI-first HITL**        | `GovernanceEvent` objects streamed via SSE so the chat UI renders approval widgets natively             |

### 1.4 Three Governance Outcomes

```mermaid
flowchart LR
    Propose["Tool call proposed"]
    Allow["ALLOW\nExecute immediately\naudit execute + observe"]
    Deny["DENY\nReturn POLICY_DENIED\nto LLM — no execution"]
    Escalate["ESCALATE\nPause agent\nstream HITL event to UI\nwait for human"]
    ProceedApprove["proceed (no instruction)\n→ execute tool as-is\nfeedback appended to tool result"]
    ProceedRedirect["proceed (with instruction)\n→ discard tool call\n→ inject instruction as user msg\n→ restart LLM reasoning"]
    Reject["reject\n→ synthetic rejection\nmessage to LLM"]

    Propose --> Allow
    Propose --> Deny
    Propose --> Escalate
    Escalate --> ProceedApprove
    Escalate --> ProceedRedirect
    Escalate --> Reject
```

### 1.5 Module Responsibilities

| Module               | Responsibility                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `types.ts`           | Shared TypeScript interfaces: `PolicyRule`, `PolicyDecision`, `AuditEntry`, `GovernanceEvent`, etc. |
| `policyLoader.ts`    | Reads and hot-reloads the JSON policy file; validates schema                                        |
| `policyEvaluator.ts` | Pure function: evaluates rules against `(toolName, args, context)` → `PolicyDecision`               |
| `gate.ts`            | Orchestrates a single gate check; writes audit entries; builds SSE events                           |
| `auditLogger.ts`     | Appends a timestamped JSONL line to the audit file                                                  |
| `governedTool.ts`    | Wraps a `Tool` with a defense-in-depth gate check on every `.call()`                                |
| `Agent.ts`           | Wires governance into the ReAct loop; owns the HITL pause/resume lifecycle                          |

---

## 2. Low-Level Design

### 2.1 Data Structures

#### PolicyRule

```typescript
interface PolicyRule {
    id: string // unique rule identifier
    effect: 'allow' | 'deny' | 'escalate'
    match: { tool: string } // exact | prefix wildcard ("write_*") | "*"
    when?: PolicyCondition[] // ALL must match (AND)
    anyOf?: PolicyCondition[] // AT LEAST ONE must match (OR)
    message?: string
}

interface PolicyCondition {
    path: string // dot-path into { args, context }  e.g. "args.to", "context.environment"
    op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not-contains' | 'starts-with' | 'regex'
    value: unknown
}
```

#### PolicyDecision (output of evaluator)

```typescript
interface PolicyDecision {
    effect: 'allow' | 'deny' | 'escalate'
    ruleId: string // "default-allow" if no rule matched
    message: string
}
```

#### AuditEntry (one JSONL line)

```typescript
interface AuditEntry {
    ts: string // ISO-8601 timestamp
    traceId?: string // correlates all steps of one tool invocation
    step: AuditStep // see lifecycle below
    tool?: string
    args?: Record<string, unknown>
    ruleId?: string
    effect?: PolicyEffect
    message?: string
    humanDecision?: 'proceed' | 'reject'
    feedback?: string // reviewer instruction (redirect path) or free-text note
    observation?: string // truncated to 500 chars
    sessionId?: string
    chatId?: string
    nodeId?: string
    input?: string // session_start only
    output?: string // session_end only
    toolCallCount?: number // session_end only
}
```

#### GovernanceEvent (SSE payload to UI)

```typescript
interface GovernanceEvent {
    traceId: string
    step: AuditStep
    tool?: string
    args?: Record<string, unknown>
    effect?: PolicyEffect
    ruleId?: string
    message?: string
    humanDecision?: string
    feedback?: string
    ts: string
}
```

#### IHumanInput (HITL resume payload from UI)

```typescript
interface IHumanInput {
    type: 'proceed' | 'reject'
    startNodeId: string
    feedback?: string
    /**
     * Plain-text reviewer instruction (optional).
     * - Empty / absent → approve as-is: tool executes with original args.
     *   Feedback (if any) is appended to the tool result so the LLM sees it.
     * - Non-empty → redirect: pending tool call is discarded, instruction is
     *   injected as a new user message, and the LLM is re-invoked from scratch.
     */
    modifiedArgs?: string
}
```

### 2.2 Audit Step Lifecycle

```mermaid
stateDiagram-v2
    [*] --> session_start
    session_start --> propose
    propose --> policy_decision
    policy_decision --> hitl : effect == escalate
    policy_decision --> execute : effect == allow
    hitl --> execute : humanDecision == proceed\n(no instruction)
    hitl --> propose : humanDecision == proceed\n(with instruction — LLM re-invoked)
    hitl --> [*] : humanDecision == reject\n(synthetic tool msg pushed)
    execute --> observe
    observe --> propose : more tool calls
    observe --> session_end : agent done
    session_end --> [*]
```

### 2.3 Component Interaction (Class Diagram)

```mermaid
classDiagram
    class Agent_Agentflow {
        +run(nodeData, input, options)
        -handleToolCalls(...)
        -handleResumedToolCalls(...)
        -parseGovernanceConfig(nodeData) GovernanceConfig
    }

    class GovernedTool {
        +name: string
        +description: string
        +humanApproved: boolean
        -inner: Tool
        -governance: GovernanceConfig
        -sessionId: string
        -chatId: string
        -nodeId: string
        +call(arg, config, tags, flowConfig) string
        #_call(arg) string
    }

    class gate {
        +gateToolCall(input) PolicyDecision
        +auditPropose(input) string
        +auditHitl(governance, tool, args, decision, meta)
        +auditExecute(governance, tool, args, observation, meta)
        +auditObserve(governance, tool, observation, meta)
        +auditSessionStart(governance, input, meta)
        +auditSessionEnd(governance, output, count, meta)
        +buildGovernanceEvent(...) GovernanceEvent
        +generateTraceId() string
    }

    class policyLoader {
        +loadPolicyFile(path) PolicyFile
        +clearPolicyCache()
        -policyCache: Map
    }

    class policyEvaluator {
        +evaluatePolicy(policy, toolName, args, context) PolicyDecision
        -ruleMatches(rule, toolName, args, context) boolean
        -evaluateCondition(condition, args, context) boolean
        -toolNameMatches(pattern, toolName) boolean
        -flattenJsonInput(args) Record
        -parseTextInput(input) Record or null
    }

    class auditLogger {
        +appendAuditLog(auditPath, entry)
        +truncateObservation(obs, maxLen) string
    }

    Agent_Agentflow --> gate : calls auditPropose\ngateToolCall\nauditExecute\nauditObserve
    Agent_Agentflow --> GovernedTool : wraps tools via\nwrapToolWithGovernance
    GovernedTool --> gate : defense-in-depth\ngateToolCall(skipAudit=true)
    gate --> policyLoader : loadPolicyFile
    gate --> policyEvaluator : evaluatePolicy
    gate --> auditLogger : appendAuditLog
```

### 2.4 Policy Evaluation Algorithm

```mermaid
flowchart TD
    Start(["evaluatePolicy(policy, toolName, args, context)"])
    Flatten["flattenJsonInput(args)\nIf args has only 'input' key:\n1. try JSON.parse\n2. try email-header lines\n3. try key: value lines\n4. try key=value pairs"]
    NextRule["Next rule in policy.rules\n(first-match wins)"]
    NoMore{"No more rules?"}
    DefaultAllow(["return DEFAULT_ALLOW\nruleId: 'default-allow'"])
    ToolMatch{"toolNameMatches\n(rule.match.tool, toolName)?\n'*' = any\n'write_*' = prefix\nexact = exact"}
    HasWhen{"rule.when\nconditions?"}
    WhenAll{"ALL conditions\npass? (AND)"}
    HasAnyOf{"rule.anyOf\nconditions?"}
    AnyOfOne{"AT LEAST ONE\ncondition passes? (OR)"}
    Return(["return PolicyDecision\n{ effect, ruleId, message }"])

    Start --> Flatten
    Flatten --> NextRule
    NextRule --> NoMore
    NoMore -- Yes --> DefaultAllow
    NoMore -- No --> ToolMatch
    ToolMatch -- No --> NextRule
    ToolMatch -- Yes --> HasWhen
    HasWhen -- No --> HasAnyOf
    HasWhen -- Yes --> WhenAll
    WhenAll -- No --> NextRule
    WhenAll -- Yes --> HasAnyOf
    HasAnyOf -- No --> Return
    HasAnyOf -- Yes --> AnyOfOne
    AnyOfOne -- No --> NextRule
    AnyOfOne -- Yes --> Return
```

### 2.5 GovernedTool Defense-in-Depth

```mermaid
flowchart TD
    CallEntry(["GovernedTool.call(arg)"])
    Gate["gateToolCall\nskipAudit=true\n(agent loop already audited)"]
    IsDeny{"effect == deny?"}
    IsEscalate{"effect == escalate\nAND NOT humanApproved?"}
    ReturnDeny(["return POLICY_DENIED + message"])
    ReturnEscalate(["return POLICY_DENIED\n[ESCALATION REQUIRED] message"])
    InnerCall["inner._call(arg)\nor inner.call(arg)"]
    Done(["return toolOutput"])

    CallEntry --> Gate
    Gate --> IsDeny
    IsDeny -- Yes --> ReturnDeny
    IsDeny -- No --> IsEscalate
    IsEscalate -- Yes --> ReturnEscalate
    IsEscalate -- No --> InnerCall
    InnerCall --> Done
```

### 2.6 Configuration (per Agent node)

| Input field              | Type                  | Description                                                                                                                                                                                 |
| ------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentEnableGovernance`  | boolean               | Master switch. If true, both path fields below must be set or governance is disabled with a warning.                                                                                        |
| `agentPolicyFilePath`    | string                | Absolute path to `agent-policies.json`. Required when governance is enabled.                                                                                                                |
| `agentAuditLogPath`      | string                | Absolute path to `audit.jsonl`. Required when governance is enabled.                                                                                                                        |
| `agentGovernanceContext` | JSON string or object | Runtime context injected into every policy evaluation e.g. `{"environment":"production"}`. Accepts a raw JSON string or a pre-resolved object (e.g. from a `{{ $flow.state.* }}` variable). |

> **Validation**: `parseGovernanceConfig` returns `undefined` (governance disabled) if either path is missing or blank, logging a `[Governance]` warning. This prevents a crash from `loadPolicyFile(undefined)` at runtime.

---

## 3. Flowcharts

### 3.1 System Context (C4-style)

```mermaid
graph LR
    subgraph Flowise["Flowise Agentflow Runtime"]
        subgraph AgentNode["Agent Node (Agent.ts)"]
            Loop["ReAct Loop"]
        end
        subgraph GovLayer["Governance Layer"]
            PL["policyLoader\nhot-reload by mtime"]
            PE["policyEvaluator\npure function"]
            GT["gate\norchestrator"]
            AL["auditLogger\nappend-only"]
            GW["GovernedTool\nwrapper"]
        end
        Tools["Actual Tools"]
    end

    LLM["LLM Provider"]
    PolicyJSON["policy.json"]
    AuditJSONL["audit.jsonl"]
    ChatUI["Chat UI\n(SSE consumer)"]

    LLM <-- "tool_call / observation" --> Loop
    Loop --> GT
    Loop --> GW
    GW --> GT
    GW --> Tools
    GT --> PL
    GT --> PE
    GT --> AL
    GT -- "GovernanceEvent" --> ChatUI
    PL --> PolicyJSON
    AL --> AuditJSONL
```

---

### 3.2 Happy-Path (ALLOW)

```mermaid
sequenceDiagram
    participant LLM
    participant AgentLoop as Agent Loop
    participant Gate as gate.ts
    participant PolicyEval as policyEvaluator
    participant AuditLog as audit.jsonl
    participant Tool as GovernedTool / Tool
    participant UI as Chat UI (SSE)

    LLM->>AgentLoop: tool_call { name, args }
    AgentLoop->>Gate: auditPropose(tool, args)
    Gate->>AuditLog: append { step:"propose", traceId, tool, args }
    Gate-->>AgentLoop: traceId

    AgentLoop->>Gate: gateToolCall(tool, args, traceId)
    Gate->>PolicyEval: evaluatePolicy(policy, tool, args, context)
    PolicyEval-->>Gate: { effect:"allow", ruleId, message }
    Gate->>AuditLog: append { step:"policy_decision", effect:"allow" }
    Gate-->>AgentLoop: PolicyDecision

    AgentLoop->>UI: streamGovernanceEvent { step:"policy_decision", effect:"allow" }

    AgentLoop->>Tool: selectedTool.call(args)
    Note over Tool: GovernedTool re-checks (skipAudit=true)\nhumanApproved=true set before call
    Tool-->>AgentLoop: toolOutput

    AgentLoop->>Gate: auditExecute(tool, args, toolOutput)
    Gate->>AuditLog: append { step:"execute", observation }

    AgentLoop->>Gate: auditObserve(tool, toolOutput)
    Gate->>AuditLog: append { step:"observe", observation }

    AgentLoop->>UI: streamGovernanceEvent { step:"execute" }
    AgentLoop->>LLM: tool result message
```

---

### 3.3 Hard-Deny Path

```mermaid
sequenceDiagram
    participant LLM
    participant AgentLoop as Agent Loop
    participant Gate as gate.ts
    participant PolicyEval as policyEvaluator
    participant AuditLog as audit.jsonl
    participant UI as Chat UI (SSE)

    LLM->>AgentLoop: tool_call { name:"delete_database", args }
    AgentLoop->>Gate: auditPropose(tool, args)
    Gate->>AuditLog: append { step:"propose", traceId }
    Gate-->>AgentLoop: traceId

    AgentLoop->>Gate: gateToolCall(tool, args, traceId)
    Gate->>PolicyEval: evaluatePolicy(...)
    PolicyEval-->>Gate: { effect:"deny", ruleId:"deny-destructive" }
    Gate->>AuditLog: append { step:"policy_decision", effect:"deny" }
    Gate-->>AgentLoop: PolicyDecision

    AgentLoop->>UI: streamGovernanceEvent { step:"policy_decision", effect:"deny" }

    Note over AgentLoop: Tool is NEVER called
    AgentLoop->>LLM: tool result "[POLICY_DENIED] Destructive DB mutations are forbidden."
    Note over LLM: Re-reasons / responds to user
```

---

### 3.4 Escalation — HITL Pause

````mermaid
sequenceDiagram
    participant LLM
    participant AgentLoop as Agent Loop
    participant Gate as gate.ts
    participant PolicyEval as policyEvaluator
    participant AuditLog as audit.jsonl
    participant UI as Chat UI (SSE)
    participant Human

    LLM->>AgentLoop: tool_call { name:"send_email", args }
    AgentLoop->>Gate: auditPropose(tool, args)
    Gate->>AuditLog: append { step:"propose", traceId }
    Gate-->>AgentLoop: traceId

    AgentLoop->>Gate: gateToolCall(tool, args, traceId)
    Gate->>PolicyEval: evaluatePolicy(...)
    PolicyEval-->>Gate: { effect:"escalate", ruleId:"escalate-external-email" }
    Gate->>AuditLog: append { step:"policy_decision", effect:"escalate" }
    Gate-->>AgentLoop: PolicyDecision

    AgentLoop->>UI: streamGovernanceEvent { step:"policy_decision", effect:"escalate" }

    Note over AgentLoop: Append escalation block to LLM response content:\n"**Policy escalation** (rule: escalate-external-email): ...\nAttempting to use tool: ```json ... ```"

    AgentLoop->>UI: streamGovernanceEvent { step:"hitl" }
    Note over UI: Renders approval widget with tool args

    AgentLoop-->>AgentLoop: return { isWaitingForHumanInput:true, pendingToolCalls }
    Note over AgentLoop: Checkpoint saved (full message history)

    UI->>Human: Show approval widget
    Note over Human: Reviews tool name, args, policy message
````

---

### 3.5 HITL Resume — Proceed

The proceed path has two branches depending on whether the reviewer typed an instruction.

#### 3.5a Proceed — Approve as-is (no instruction)

```mermaid
flowchart TD
    HumanProceed(["Human clicks Proceed\n(instruction field left empty)"])
    ReGate["gateToolCall(originalArgs, skipAudit=true)\nRe-evaluate policy"]
    IsDeny{"effect == deny?"}
    DenyMsg["Push POLICY_DENIED tool message\nSkip execution"]
    AuditHitl["auditHitl('proceed', feedback)"]
    StreamApprove["streamGovernanceEvent\n{ step:'hitl', humanDecision:'proceed' }"]
    SetApproved["GovernedTool.humanApproved = true"]
    Execute["selectedTool.call(originalArgs)"]
    ResetApproved["GovernedTool.humanApproved = false"]
    AuditExec["auditExecute(tool, args, toolOutput)"]
    InjectFeedback["Append reviewer feedback to tool result:\ntoolOutput + '[Reviewer note: feedback]'"]
    PushResult["Push augmented tool result to messages"]
    LLMContinues(["LLM continues reasoning\n(sees feedback in tool result)"])

    HumanProceed --> ReGate
    ReGate --> IsDeny
    IsDeny -- Yes --> DenyMsg
    IsDeny -- No --> AuditHitl
    AuditHitl --> StreamApprove
    StreamApprove --> SetApproved
    SetApproved --> Execute
    Execute --> ResetApproved
    ResetApproved --> AuditExec
    AuditExec --> InjectFeedback
    InjectFeedback --> PushResult
    PushResult --> LLMContinues
```

#### 3.5b Proceed — Redirect (instruction provided)

```mermaid
flowchart TD
    HumanRedirect(["Human clicks Proceed\nwith a plain-text instruction"])
    PopToolCall["Pop the LLM's pending tool-call message\nfrom history (keeps conversation valid)"]
    AuditHitl["auditHitl('proceed', feedback=instruction)"]
    StreamApprove["streamGovernanceEvent\n{ step:'hitl', humanDecision:'proceed', feedback:instruction }"]
    InjectUser["Push instruction as new user message\n{ role:'user', content: instruction }"]
    BindTools["llm.bindTools(toolsInstance)"]
    InvokeLLM["Re-invoke LLM with updated history\n(streaming or non-streaming)"]
    HasToolCalls{"LLM wants to\ncall tools?"}
    HandleTools["handleToolCalls(...)\n(normal governance path)"]
    ReturnResponse(["Return LLM response"])

    HumanRedirect --> PopToolCall
    PopToolCall --> AuditHitl
    AuditHitl --> StreamApprove
    StreamApprove --> InjectUser
    InjectUser --> BindTools
    BindTools --> InvokeLLM
    InvokeLLM --> HasToolCalls
    HasToolCalls -- Yes --> HandleTools
    HasToolCalls -- No --> ReturnResponse
    HandleTools --> ReturnResponse
```

---

### 3.6 HITL Resume — Reject

```mermaid
flowchart TD
    HumanReject(["Human clicks Reject\n(optionally adds feedback)"])
    ReGate["gateToolCall(originalArgs, skipAudit=true)\nRecover ruleId that triggered escalation"]
    AuditHitl["auditHitl('reject', ruleId, feedback)"]
    StreamReject["streamGovernanceEvent\n{ step:'hitl', humanDecision:'reject' }"]
    SyntheticMsg["Push synthetic tool result:\n'[REJECTED BY HUMAN] The action was rejected.\nReviewer note: feedback.\nDo not attempt this again...'"]
    NoExec["Tool is NEVER executed"]
    LLMReasons(["LLM re-reasons\nSuggests alternatives to user"])

    HumanReject --> ReGate
    ReGate --> AuditHitl
    AuditHitl --> StreamReject
    StreamReject --> SyntheticMsg
    SyntheticMsg --> NoExec
    NoExec --> LLMReasons
```

---

### 3.7 Policy Evaluation Internals

```mermaid
flowchart TD
    Start(["evaluatePolicy\n(policy, toolName, args, context)"])
    Flatten["flattenJsonInput(args)\nIf args = { input: string }:\n① JSON.parse\n② email-header lines Key: Value\n③ key: value lines\n④ key=value semicolon/comma pairs\nMerge parsed fields into args"]
    IterStart["Iterate rules in order\n(first-match wins)"]
    NoMore{"All rules\nexhausted?"}
    DefaultAllow(["return DEFAULT_ALLOW\n{ effect:'allow', ruleId:'default-allow' }"])
    ToolMatch{"toolNameMatches?\n'*' → always\n'prefix_*' → startsWith\nexact → ==="}
    HasWhen{"rule.when\nexists and non-empty?"}
    WhenEval["Evaluate each condition\nagainst { args:flatArgs, context }\nresolve dot-path value\napply op"]
    WhenAll{"ALL pass?\n(AND logic)"}
    HasAnyOf{"rule.anyOf\nexists and non-empty?"}
    AnyOfEval["Evaluate each condition"]
    AnyOfOne{"AT LEAST ONE\npasses? (OR logic)"}
    Matched(["return PolicyDecision\n{ effect, ruleId, message }"])

    Start --> Flatten
    Flatten --> IterStart
    IterStart --> NoMore
    NoMore -- Yes --> DefaultAllow
    NoMore -- No --> ToolMatch
    ToolMatch -- No match --> IterStart
    ToolMatch -- Match --> HasWhen
    HasWhen -- No --> HasAnyOf
    HasWhen -- Yes --> WhenEval
    WhenEval --> WhenAll
    WhenAll -- Fail --> IterStart
    WhenAll -- Pass --> HasAnyOf
    HasAnyOf -- No --> Matched
    HasAnyOf -- Yes --> AnyOfEval
    AnyOfEval --> AnyOfOne
    AnyOfOne -- Fail --> IterStart
    AnyOfOne -- Pass --> Matched
```

---

### 3.8 Audit Lifecycle (Full Session Sequence)

```mermaid
sequenceDiagram
    participant Agent as Agent Loop
    participant Gate as gate.ts
    participant Log as audit.jsonl

    Agent->>Gate: auditSessionStart(input)
    Gate->>Log: { step:"session_start", input, sessionId, chatId, nodeId }

    loop For each tool call in session
        Agent->>Gate: auditPropose(tool, args)
        Gate->>Log: { step:"propose", traceId, tool, args }

        Agent->>Gate: gateToolCall(tool, args, traceId)
        Gate->>Log: { step:"policy_decision", traceId, effect, ruleId, message }

        alt effect == escalate
            Agent->>Gate: auditHitl(tool, args, humanDecision, meta)
            Gate->>Log: { step:"hitl", traceId, humanDecision, feedback }

            alt humanDecision == proceed AND instruction provided (redirect)
                Note over Agent: Tool call discarded\nInstruction injected as user message\nLLM re-invoked — new propose cycle begins
            end
        end

        alt tool executed (allow or approved escalation with no instruction)
            Agent->>Gate: auditExecute(tool, args, observation)
            Gate->>Log: { step:"execute", traceId, tool, args, observation }

            Agent->>Gate: auditObserve(tool, observation)
            Gate->>Log: { step:"observe", traceId, tool, observation }
        end
    end

    Agent->>Gate: auditSessionEnd(output, toolCallCount)
    Gate->>Log: { step:"session_end", output, toolCallCount, sessionId }
```

---

## 4. Appendix: Rule Evaluation Examples

### Example 1 — Internal email → ALLOW

```mermaid
flowchart LR
    Input["tool: send_email\nargs.to: 'alice\@aivar.tech'"]
    R1{"Rule: allow-internal-email\nmatch.tool = send_email ✓\nwhen: args.to regex @aivar\\.tech$\n→ alice\@aivar.tech ✓"}
    Allow(["effect: allow"])

    Input --> R1 --> Allow
```

### Example 2 — External email → ESCALATE

```mermaid
flowchart LR
    Input["tool: send_email\nargs.to: bob\@external.com"]
    R1{"Rule: allow-internal-email\nwhen: args.to regex @aivar\\.tech$\n→ bob\@external.com ✗ skip"}
    R2{"Rule: escalate-external-email\nmatch.tool = send_email ✓\nno conditions"}
    Escalate(["effect: escalate"])

    Input --> R1 --> R2 --> Escalate
```

### Example 3 — Destructive tool → DENY

```mermaid
flowchart LR
    Input["tool: delete_database\nargs: {}"]
    R1{"Rule: deny-destructive\nmatch.tool = delete_database ✓\nno conditions"}
    Deny(["effect: deny"])

    Input --> R1 --> Deny
```

### Example 4 — Production wildcard → ESCALATE

```mermaid
flowchart LR
    Input["tool: get_weather\ncontext.environment: production"]
    R1{"Rule: allow-safe-read\nmatch.tool = get_weather ✓\nno conditions\n→ would match..."}
    Note["BUT: prod-escalate-all placed\nbefore allow-safe-read in rules array\n(first-match wins — rule order matters)"]
    R2{"Rule: prod-escalate-all\nmatch.tool = * ✓\nwhen: context.environment eq production ✓"}
    Escalate(["effect: escalate"])

    Input --> R1
    R1 -. "if prod-escalate-all\ncomes first" .-> R2
    R2 --> Escalate
    Note -.-> R2
```

### Example 5 — Wildcard write tool → ESCALATE

```mermaid
flowchart LR
    Input["tool: write_file\nargs: { path: '/etc/hosts' }"]
    R1{"Rule: escalate-all-writes\nmatch.tool = write_* ✓\ntoolName.startsWith('write_') ✓\nno conditions"}
    Escalate(["effect: escalate\nruleId: escalate-all-writes"])

    Input --> R1 --> Escalate
```

### Example 6 — No matching rule → DEFAULT ALLOW

```mermaid
flowchart LR
    Input["tool: calculate_sum\nargs: { a: 10, b: 25 }"]
    R1{"No rule matches calculate_sum"}
    DefaultAllow(["effect: allow ruleId: default-allow\n'No matching policy rule; allowed by default.'"])

    Input --> R1 --> DefaultAllow
```
