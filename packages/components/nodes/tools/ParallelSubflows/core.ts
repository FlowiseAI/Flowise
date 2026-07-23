// packages/components/nodes/utilities/ParallelSubflows/core.ts
import type { ToolParams } from '@langchain/core/tools'
import { Tool } from '@langchain/core/tools'

export type FailPolicy = 'continue' | 'fail-fast'
export type ReturnSelection = 'text' | 'json' | 'full'

export interface FlowBranch {
    flowId: string
    label?: string // e.g. 'A' | 'B' | 'C'
    timeoutMs?: number
    apiKey?: string
    vars?: Record<string, any>
    // Optional per-branch question template override
    questionTemplate?: string
}

export interface ParallelSubflowsConfig {
    baseUrl: string
    defaultApiKey?: string
    questionTemplate?: string
    flows: FlowBranch[]
    maxParallel: number
    overallTimeoutMs: number
    failPolicy: FailPolicy
    returnSelection: ReturnSelection
    emitTiming: boolean
}

type OkReport = {
    role: string
    ok: true
    status: number
    text: string
    json: any
    sourceDocuments: any[]
    usedTools?: any[]
    sessionId?: string | null
    ms: number
    tStart: number
    tEnd: number
    relStart: number
    relEnd: number
}

type ErrReport = {
    role: string
    ok: false
    status: number
    error: string
    body?: any
    ms: number
    tStart: number
    tEnd: number
    relStart: number
    relEnd: number
}

function uuid(): string {
    if ((globalThis as any).crypto?.randomUUID) return (globalThis as any).crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

function msFmt(ms: number) {
    return `${ms}ms (${(ms / 1000).toFixed(2)}s)`
}

function asciiTimelineWithSum(per: Array<OkReport | ErrReport>, unit = 100) {
    const lines: string[] = []
    for (const p of per) {
        const start = Math.max(0, Math.round(p.relStart / unit))
        const width = Math.max(1, Math.round((p.relEnd - p.relStart) / unit))
        const bar = `${' '.repeat(start)}${'#'.repeat(width)}`
        lines.push(`${p.role} | ${bar} ${p.ms}ms`)
    }
    const sumMs = per.reduce((acc, p) => acc + (p.ms || 0), 0)
    const sumWidth = Math.max(1, Math.round(sumMs / unit))
    lines.push(`S | ${'#'.repeat(sumWidth)} ${sumMs}ms`)
    return lines.join('\n')
}

// Minimal p-limit (no deps)
function pLimit(concurrency: number) {
    let active = 0
    const queue: Array<() => void> = []
    const next = () => {
        active--
        const fn = queue.shift()
        if (fn) fn()
    }
    return <T>(fn: () => Promise<T>): Promise<T> =>
        new Promise((resolve, reject) => {
            const run = async () => {
                active++
                try {
                    resolve(await fn())
                } catch (e) {
                    reject(e)
                } finally {
                    next()
                }
            }
            if (active < concurrency) run()
            else queue.push(run)
        })
}

async function fetchWithTimeout(url: string, init: any, ms: number): Promise<Response> {
    // Prefer native AbortSignal.timeout if available (Node 18+)
    if (typeof (globalThis as any).AbortSignal?.timeout === 'function') {
        return fetch(url, { ...init, signal: (AbortSignal as any).timeout(ms) })
    }
    // Fallback: race (does not abort underlying socket)
    return Promise.race([
        fetch(url, init),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ])
}

// Basic Mustache-like templating for {{input}} + {{var}}
function renderTemplate(tpl: string, scope: Record<string, any>) {
    return String(tpl ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
        const parts = String(key).split('.')
        let v: any = scope
        for (const p of parts) {
            if (v && typeof v === 'object' && p in v) v = v[p]
            else return ''
        }
        return v == null ? '' : String(v)
    })
}

export class ParallelSubflowsTool extends Tool {
    name = 'parallelSubflows'
    description =
        'Launch multiple Flowise subflows in parallel via /prediction/{id}, wait for all, return merged results with optional timing.'

    private cfg: ParallelSubflowsConfig

    constructor(cfg: ParallelSubflowsConfig, toolParams?: ToolParams) {
        super(toolParams)
        this.cfg = cfg
    }

    /** Tool input:
     *  - If `questionTemplate` includes {{input}}, it’s replaced by the tool input string.
     *  - Alternatively you can pass a JSON string: { "input": "question text", "vars": { ... } }
     */
    async _call(rawInput: string): Promise<string> {
        const {
            baseUrl,
            defaultApiKey,
            questionTemplate = '{{input}}',
            flows,
            maxParallel,
            overallTimeoutMs,
            failPolicy,
            returnSelection,
            emitTiming
        } = this.cfg

        if (!Array.isArray(flows) || flows.length === 0) {
            return 'ParallelSubflows: No flows configured. Provide an array of {flowId,label,...}.'
        }

        // Parse optional JSON input to allow passing extra vars at runtime
        let inputPayload: any = {}
        try {
            inputPayload = JSON.parse(rawInput)
        } catch {
            inputPayload = { input: rawInput }
        }
        const inputText: string = String(inputPayload.input ?? rawInput ?? '')
        const inputVars: Record<string, any> = (inputPayload.vars && typeof inputPayload.vars === 'object')
            ? inputPayload.vars
            : {}

        // Build semaphore
        const limit = pLimit(Math.max(1, Number(maxParallel) || flows.length))

        // Shared aborters for fail-fast
        const controllers: AbortController[] = []
        let shouldAbort = false

        const headersBase: Record<string, string> = { 'Content-Type': 'application/json' }
        const runId = uuid()
        const tAll0 = Date.now()

        // Create tasks
        const tasks = flows
            .filter((f) => f && typeof f.flowId === 'string' && f.flowId.trim())
            .map((f) => {
                const label = f.label || f.flowId.slice(0, 6)
                const branchVars = { ...(f.vars || {}), runId, label }
                const tpl = f.questionTemplate || questionTemplate
                const question = renderTemplate(tpl, { input: inputText, vars: inputVars, ...branchVars })
                const body = {
                    question,
                    streaming: false,
                    overrideConfig: {
                        sessionId: `${runId}-${label}`,
                        vars: branchVars
                    }
                }
                const url = `${baseUrl.replace(/\/+$/, '')}/prediction/${encodeURIComponent(f.flowId)}`
                const apiKey = f.apiKey || defaultApiKey || ''
                const headers = { ...headersBase }
                if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

                const timeoutMs = Number(f.timeoutMs || 120000)

                return async (): Promise<OkReport | ErrReport> => {
                    if (shouldAbort) {
                        const now = Date.now()
                        return {
                            role: label,
                            ok: false,
                            status: 0,
                            error: 'cancelled (fail-fast)',
                            ms: 0,
                            tStart: now,
                            tEnd: now,
                            relStart: now - tAll0,
                            relEnd: now - tAll0
                        }
                    }
                    const t0 = Date.now()
                    let res: Response | null = null
                    let text: string = ''

                    const controller = new AbortController()
                    controllers.push(controller)
                    try {
                        // Prefer native fetch; fallback to node-fetch dynamically
                        const doFetch =
                            typeof fetch === 'function'
                                ? fetch
                                : (await import('node-fetch')).default as unknown as typeof fetch

                        res = await fetchWithTimeout(
                            url,
                            { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal },
                            timeoutMs
                        )
                        text = await res.text()
                    } catch (e: any) {
                        const t1 = Date.now()
                        const out: ErrReport = {
                            role: label,
                            ok: false,
                            status: 0,
                            error: `fetch error: ${String(e)}`,
                            ms: t1 - t0,
                            tStart: t0,
                            tEnd: t1,
                            relStart: t0 - tAll0,
                            relEnd: t1 - tAll0
                        }
                        if (failPolicy === 'fail-fast') {
                            shouldAbort = true
                            controllers.forEach((c) => c.abort())
                        }
                        return out
                    }

                    const t1 = Date.now()
                    const ms = t1 - t0

                    let data: any = null
                    try {
                        data = JSON.parse(text)
                    } catch {
                        data = { raw: text }
                    }

                    if (!res!.ok) {
                        const out: ErrReport = {
                            role: label,
                            ok: false,
                            status: res!.status,
                            error: data?.message || data?.error || `HTTP ${res!.status}`,
                            body: data,
                            ms,
                            tStart: t0,
                            tEnd: t1,
                            relStart: t0 - tAll0,
                            relEnd: t1 - tAll0
                        }
                        if (failPolicy === 'fail-fast') {
                            shouldAbort = true
                            controllers.forEach((c) => c.abort())
                        }
                        return out
                    }

                    const ok: OkReport = {
                        role: label,
                        ok: true,
                        status: res!.status,
                        text: data?.text ?? '',
                        json: data?.json ?? {},
                        sourceDocuments: data?.sourceDocuments ?? [],
                        usedTools: data?.usedTools ?? [],
                        sessionId: data?.sessionId ?? null,
                        ms,
                        tStart: t0,
                        tEnd: t1,
                        relStart: t0 - tAll0,
                        relEnd: t1 - tAll0
                    }
                    return ok
                }
            })

        if (!tasks.length) {
            return 'ParallelSubflows: No valid flow entries (need flowId).'
        }

        const runner = (async () => {
        // Queue all tasks immediately; pLimit ensures only maxParallel run at once
        const promises = tasks.map((task) => limit(task))

        // Our task wrapper already catches errors and returns ErrReport,
        // so these promises shouldn't reject. allSettled adds extra safety.
        const results = await Promise.allSettled(promises)

        // Normalize to OkReport | ErrReport[]
        const settled: Array<OkReport | ErrReport> = results.map((r, i) => {
            if (r.status === 'fulfilled') return r.value as OkReport | ErrReport
            const now = Date.now()
            return {
            role: tasks[i] ? 'branch-' + (i + 1) : '?',
            ok: false,
            status: 0,
            error: String(r.reason),
            ms: 0,
            tStart: now,
            tEnd: now,
            relStart: 0,
            relEnd: 0
            } as ErrReport
        })

        const tAll1 = Date.now()

        const reports = settled.filter((x) => x.ok) as OkReport[]
        const errors  = settled.filter((x) => !x.ok) as ErrReport[]

        // Metrics
        const totalMs = tAll1 - tAll0
        const perMs   = settled.map((p) => p.ms)
        const sumMs   = perMs.reduce((a, b) => a + b, 0)
        const maxMs   = perMs.reduce((a, b) => Math.max(a, b), 0)
        const speedup = totalMs > 0 ? sumMs / totalMs : 0
        const concurrencyFactor = Number(speedup.toFixed(2))

        const timing = { totalMs, sumMs, maxMs, concurrencyFactor, per: settled }

        let pretty = ''
        if (emitTiming) {
            const lineA = `A: ${msFmt((settled.find((p) => p.role === 'A')?.ms) ?? 0)}`
            const lineB = `B: ${msFmt((settled.find((p) => p.role === 'B')?.ms) ?? 0)}`
            const lineC = `C: ${msFmt((settled.find((p) => p.role === 'C')?.ms) ?? 0)}`
            const normalTotal   = `Sequential (normal) total: ${msFmt(sumMs)}`
            const parallelTotal = `Parallel (observed) total: ${msFmt(totalMs)}`
            const speed         = `Speedup: ×${speedup.toFixed(2)}   (sum/total)`
            const timeline      = asciiTimelineWithSum(settled, 100)
            pretty = [lineA, lineB, lineC, '', normalTotal, parallelTotal, speed, '', 'Timeline (1 char = 100ms):', timeline].join('\n')
        }

        const finalReports = reports.map((r) => {
            if (returnSelection === 'text') return { role: r.role, text: r.text }
            if (returnSelection === 'json') return { role: r.role, json: r.json }
            return {
            role: r.role,
            text: r.text,
            json: r.json,
            sourceDocuments: r.sourceDocuments,
            usedTools: r.usedTools,
            sessionId: r.sessionId
            }
        })

        return JSON.stringify({ reports: finalReports, errors, timing, pretty })
        })()

        if (overallTimeoutMs && overallTimeoutMs > 0) {
            // Hard ceiling for the whole orchestration
            if (typeof (globalThis as any).AbortSignal?.timeout === 'function') {
            }
            return Promise.race([
                runner,
                new Promise<string>((_, reject) =>
                    setTimeout(() => reject(new Error('ParallelSubflows: overall timeout')), overallTimeoutMs)
                )
            ]).catch((e) => `ParallelSubflows error: ${String(e)}`)
        }

        return runner.catch((e) => `ParallelSubflows error: ${String(e)}`)
    }
}
