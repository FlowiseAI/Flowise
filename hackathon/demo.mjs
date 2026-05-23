#!/usr/bin/env node
/**
 * Agent Governance Demo
 * ─────────────────────
 * Simulates the full governance loop end-to-end without the UI:
 *
 *   1. Trigger the loop  — agent proposes a tool call
 *   2. Policy blocks     — deny effect stops execution
 *   3. Human approves    — escalate effect pauses, human proceeds
 *   4. Read audit log    — print a formatted summary of all entries
 *
 * Run:  node hackathon/demo.mjs
 *
 * Writes to ./audit-demo.jsonl (separate from the live audit.jsonl).
 */

import { createRequire } from 'module'
import { readFileSync, existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const require = createRequire(import.meta.url)

// ─── Load governance module (built dist) ─────────────────────────────────────
let governance
try {
    governance = require(resolve(repoRoot, 'packages/components/dist/src/governance/index.js'))
} catch (e) {
    console.error('❌  Could not load governance module.')
    console.error('   Run `pnpm build` from the repo root first, then retry.')
    console.error('   Details:', e.message)
    process.exit(1)
}

const { gateToolCall, auditPropose, auditHitl, auditExecute, auditObserve, appendAuditLog } = governance

// ─── Config ──────────────────────────────────────────────────────────────────
const POLICY_PATH = './hackathon/agent-policies.json'
const AUDIT_PATH = './audit-demo.jsonl'

const governanceConfig = {
    policyPath: POLICY_PATH,
    auditPath: AUDIT_PATH,
    context: { user: 'demo-script', environment: 'dev', nodeId: 'demo-node' }
}

const meta = { sessionId: 'demo-session', chatId: 'demo-chat', nodeId: 'demo-node' }

// Clean up previous demo run
const auditFile = resolve(repoRoot, AUDIT_PATH)
if (existsSync(auditFile)) unlinkSync(auditFile)

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'

function banner(text) {
    const line = '─'.repeat(62)
    console.log(`\n${BOLD}${CYAN}${line}${RESET}`)
    console.log(`${BOLD}${CYAN}  ${text}${RESET}`)
    console.log(`${BOLD}${CYAN}${line}${RESET}`)
}

function step(label, detail) {
    console.log(`  ${BOLD}${label}${RESET}  ${DIM}${detail}${RESET}`)
}

function effectBadge(effect) {
    if (effect === 'allow') return `${GREEN}[ALLOW]${RESET}`
    if (effect === 'deny') return `${RED}[DENY]${RESET}`
    if (effect === 'escalate') return `${YELLOW}[ESCALATE]${RESET}`
    return `[${effect}]`
}

function humanDecision(decision, feedback) {
    const icon = decision === 'proceed' ? '✅' : '❌'
    console.log(`\n  ${icon}  ${BOLD}Human reviewer${RESET}: ${decision.toUpperCase()}${feedback ? ` — "${feedback}"` : ''}`)
}

function traceId() {
    return randomBytes(8).toString('hex')
}

// ─── Simulated tool implementations ──────────────────────────────────────────
function runTool(name, args) {
    if (name === 'get_weather') {
        const loc = args.input || args.location || 'Unknown'
        return `Weather in ${loc}: sunny, 24°C`
    }
    if (name === 'delete_database') {
        return 'All customer records deleted (simulated).'
    }
    if (name === 'send_email') {
        const to = args.to || args.recipient || '(unknown)'
        const body = args.body || args.message || '(no body)'
        return `Email sent to ${to}: "${body}" (simulated).`
    }
    if (name === 'transfer_funds') {
        const amount = args.amount || 0
        const account = args.account || 'unknown'
        return `Transferred $${amount} to account ${account} (simulated).`
    }
    return `Tool ${name} executed (simulated).`
}

// ─── Core helpers ─────────────────────────────────────────────────────────────
function propose(tool, args) {
    const tid = traceId()
    auditPropose({ tool, args, governance: governanceConfig, ...meta, traceId: tid })
    const decision = gateToolCall({ tool, args, governance: governanceConfig, ...meta, traceId: tid })
    return { tid, decision }
}

function execute(tool, args, tid) {
    const output = runTool(tool, args)
    auditExecute(governanceConfig, tool, args, output, { ...meta, traceId: tid })
    auditObserve(governanceConfig, tool, output, { ...meta, traceId: tid })
    return output
}

// ─── Session brackets (appendAuditLog is always in dist) ─────────────────────
function sessionStart(input) {
    appendAuditLog(AUDIT_PATH, { step: 'session_start', input, ...meta })
}
function sessionEnd(output, toolCallCount) {
    appendAuditLog(AUDIT_PATH, { step: 'session_end', output, toolCallCount, ...meta })
}

// ─── flattenJsonInput parity test ────────────────────────────────────────────
// Mirrors the logic in policyEvaluator.ts so the demo can verify all formats
// without requiring a full TypeScript build.
function parseTextInput(input) {
    // 1. JSON
    try {
        const p = JSON.parse(input)
        if (p && typeof p === 'object' && !Array.isArray(p)) return p
    } catch {}

    // 2 & 3. Line-based "Key: Value"
    const lines = input.split(/\r?\n/)
    const result = {}
    const bodyLines = []
    let inBody = false
    let lineMatches = 0
    for (const line of lines) {
        if (inBody) {
            bodyLines.push(line)
            continue
        }
        if (line.trim() === '') {
            inBody = true
            continue
        }
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim().toLowerCase()
            const val = line.slice(colonIdx + 1).trim()
            if (/^\w+$/.test(key)) {
                result[key] = val
                lineMatches++
            } else {
                inBody = true
                bodyLines.push(line)
            }
        } else {
            inBody = true
            bodyLines.push(line)
        }
    }
    if (bodyLines.length > 0 && !result['body']) result['body'] = bodyLines.join('\n').trim()
    if (lineMatches >= 1) return result

    // 4 & 5. key=value pairs
    const kvResult = {}
    let kvMatches = 0
    for (const seg of input.split(/[;,]/)) {
        const eqIdx = seg.indexOf('=')
        if (eqIdx > 0) {
            const key = seg.slice(0, eqIdx).trim().toLowerCase()
            const val = seg.slice(eqIdx + 1).trim()
            if (/^\w+$/.test(key)) {
                kvResult[key] = val
                kvMatches++
            }
        }
    }
    if (kvMatches >= 2) return kvResult
    return null
}

function flattenArgs(args) {
    if (Object.keys(args).length === 1 && typeof args.input === 'string') {
        const parsed = parseTextInput(args.input)
        if (parsed) return { ...args, ...parsed }
    }
    return args
}

banner('Input Flattening — all LLM output formats')
const formats = [
    { label: 'JSON string', input: '{"to":"alice@example.com","subject":"Hi","body":"Hello"}' },
    { label: 'Email-style headers', input: 'To: alice@example.com\nSubject: Hi\n\nHello there' },
    { label: 'key: value lines', input: 'to: alice@example.com\nsubject: Hi\nbody: Hello there' },
    { label: 'key=value semicolons', input: 'to=alice@example.com;subject=Hi;body=Hello there' },
    { label: 'key=value commas', input: 'to=alice@example.com, subject=Hi, body=Hello there' }
]
let allPassed = true
for (const { label, input } of formats) {
    const flat = flattenArgs({ input })
    const ok = flat.to === 'alice@example.com'
    const badge = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
    console.log(`  ${badge}  ${label.padEnd(24)}  to=${flat.to ?? DIM + 'undefined' + RESET}`)
    if (!ok) allPassed = false
}
console.log(
    allPassed
        ? `\n  ${GREEN}All formats resolve args.to correctly.${RESET}`
        : `\n  ${RED}Some formats failed — check policyEvaluator.ts.${RESET}`
)

// ─── DEMO ─────────────────────────────────────────────────────────────────────

sessionStart('governance demo run')

// ── Scenario 1: ALLOW ────────────────────────────────────────────────────────
banner('Scenario 1 — ALLOW: get_weather')
console.log(`  Agent proposes: get_weather({ input: "Tokyo" })`)

{
    const tool = 'get_weather'
    const args = { input: 'Tokyo' }
    const { tid, decision } = propose(tool, args)

    step('Policy decision:', `${effectBadge(decision.effect)}  rule=${decision.ruleId}`)
    step('Message:', decision.message)

    if (decision.effect === 'allow') {
        const output = execute(tool, args, tid)
        step('Tool output:', output)
        console.log(`\n  ${GREEN}✓ Tool ran immediately — no human pause needed.${RESET}`)
    }
}

// ── Scenario 2: DENY ─────────────────────────────────────────────────────────
banner('Scenario 2 — DENY: delete_database')
console.log(`  Agent proposes: delete_database({})`)

{
    const tool = 'delete_database'
    const args = {}
    const { decision } = propose(tool, args)

    step('Policy decision:', `${effectBadge(decision.effect)}  rule=${decision.ruleId}`)
    step('Message:', decision.message)

    if (decision.effect === 'deny') {
        const synthetic = `[POLICY_DENIED] ${decision.message}`
        step('Synthetic tool result fed to LLM:', synthetic)
        console.log(`\n  ${RED}✗ Tool was blocked. Agent re-reasons without executing.${RESET}`)
    }
}

// ── Scenario 3: ESCALATE → human APPROVES ────────────────────────────────────
banner('Scenario 3 — ESCALATE → Approve: send_email (external, email-header format)')
console.log(`  Agent proposes: send_email({ input: "To: alice@example.com\\nSubject: Report\\n\\nReport ready" })`)
console.log(`  (LLM packed everything into a single input string — flattenJsonInput extracts args.to)`)

{
    const tool = 'send_email'
    // This is exactly what the LLM sends — everything in one input string
    const args = { input: 'To: alice@example.com\nSubject: Report ready\n\nHi Alice, the report is ready.' }
    const { tid, decision } = propose(tool, args)

    step('Policy decision:', `${effectBadge(decision.effect)}  rule=${decision.ruleId}`)
    step('Message:', decision.message)

    if (decision.effect === 'escalate') {
        console.log(`\n  ${YELLOW}⏸  Execution paused — waiting for human review...${RESET}`)
        humanDecision('proceed', 'Looks fine, send it')

        auditHitl(governanceConfig, tool, args, 'proceed', {
            ...meta,
            traceId: tid,
            ruleId: decision.ruleId,
            feedback: 'Looks fine, send it'
        })

        const output = execute(tool, args, tid)
        step('Tool output:', output)
        console.log(`\n  ${GREEN}✓ Human approved — tool executed.${RESET}`)
    } else if (decision.effect === 'allow') {
        const output = execute(tool, args, tid)
        step('Tool output:', output)
        console.log(`\n  ${GREEN}✓ Allowed immediately (internal address).${RESET}`)
    }
}

// ── Scenario 4: ESCALATE → human REJECTS ─────────────────────────────────────
banner('Scenario 4 — ESCALATE → Reject: transfer_funds')
console.log(`  Agent proposes: transfer_funds({ amount: 50000, account: "9988776655" })`)

{
    const tool = 'transfer_funds'
    const args = { amount: 50000, account: '9988776655' }
    const { tid, decision } = propose(tool, args)

    step('Policy decision:', `${effectBadge(decision.effect)}  rule=${decision.ruleId}`)
    step('Message:', decision.message)

    if (decision.effect === 'escalate') {
        console.log(`\n  ${YELLOW}⏸  Execution paused — waiting for human review...${RESET}`)
        humanDecision('reject', 'Amount too large, do not proceed')

        auditHitl(governanceConfig, tool, args, 'reject', {
            ...meta,
            traceId: tid,
            ruleId: decision.ruleId,
            feedback: 'Amount too large, do not proceed'
        })

        const synthetic = `[REJECTED BY HUMAN] The action "${tool}" was rejected. Reviewer note: "Amount too large, do not proceed".`
        step('Synthetic tool result fed to LLM:', synthetic)
        console.log(`\n  ${RED}✗ Human rejected — tool blocked, agent re-reasons.${RESET}`)
    }
}

// ── Scenario 5: ESCALATE → approve WITH arg modification ─────────────────────
banner('Scenario 5 — ESCALATE → Approve with modified args: transfer_funds')
console.log(`  Agent proposes: transfer_funds({ amount: 50000, account: "9988776655" })`)
console.log(`  Reviewer lowers amount to $200 before approving.`)

{
    const tool = 'transfer_funds'
    const originalArgs = { amount: 50000, account: '9988776655' }
    const { tid, decision } = propose(tool, originalArgs)

    step('Policy decision:', `${effectBadge(decision.effect)}  rule=${decision.ruleId}`)

    if (decision.effect === 'escalate') {
        console.log(`\n  ${YELLOW}⏸  Execution paused — waiting for human review...${RESET}`)

        const modifiedArgs = { amount: 200, account: '9988776655' }
        humanDecision('proceed', 'Approved with reduced amount ($200)')

        auditHitl(governanceConfig, tool, modifiedArgs, 'proceed', {
            ...meta,
            traceId: tid,
            ruleId: decision.ruleId,
            originalArgs,
            modifiedArgs,
            feedback: 'Approved with reduced amount ($200)'
        })

        const output = execute(tool, modifiedArgs, tid)
        step('Tool output (with modified args):', output)
        console.log(`\n  ${GREEN}✓ Human approved with modified args — $200 instead of $50000.${RESET}`)
    }
}

sessionEnd('demo complete', 5)

// ─── Audit log reader ─────────────────────────────────────────────────────────
banner('Audit Log — audit-demo.jsonl')

if (!existsSync(auditFile)) {
    console.log(`  ${RED}Audit file not found: ${AUDIT_PATH}${RESET}`)
    process.exit(1)
}

const lines = readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean)
const entries = lines.map((l) => JSON.parse(l))

const stepColors = {
    session_start: CYAN,
    session_end: CYAN,
    propose: DIM,
    policy_decision: BOLD,
    hitl: YELLOW,
    execute: GREEN,
    observe: DIM
}

console.log(`\n  ${entries.length} entries written to ${BOLD}${AUDIT_PATH}${RESET}\n`)

for (const entry of entries) {
    const color = stepColors[entry.step] || ''
    const ts = entry.ts.replace('T', ' ').replace('Z', '')
    const tool = entry.tool ? `  tool=${entry.tool}` : ''
    const effect = entry.effect ? `  ${effectBadge(entry.effect)}` : ''
    const rule = entry.ruleId ? `  rule=${entry.ruleId}` : ''
    const human = entry.humanDecision ? `  human=${entry.humanDecision.toUpperCase()}` : ''
    const fb = entry.feedback ? `  feedback="${entry.feedback}"` : ''
    const obs = entry.observation ? `  → ${entry.observation.slice(0, 55)}${entry.observation.length > 55 ? '…' : ''}` : ''
    const mod = entry.modifiedArgs ? `  ${YELLOW}[args modified]${RESET}` : ''

    console.log(`  ${DIM}${ts}${RESET}  ${color}${entry.step.padEnd(16)}${RESET}${tool}${effect}${rule}${human}${fb}${obs}${mod}`)
}

console.log(`\n${BOLD}${GREEN}Demo complete.${RESET} Full entries in ${BOLD}${AUDIT_PATH}${RESET}\n`)
