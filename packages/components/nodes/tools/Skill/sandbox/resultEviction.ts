/**
 * Skill — large-output eviction.
 *
 * Wraps the `ExecuteTool` so outputs whose size exceeds a configured
 * threshold are written to a well-known sandbox path
 * (`<outputDir>/__large_tool_results/<uuid>`) and the model sees only a
 * head + tail preview plus an instruction to read the full file via the
 * structured `read_file` tool.
 *
 * Why this lives at Layer 3 (middleware):
 *   - Structured filesystem tools already have their own truncation
 *     semantics (`offset` / `limit`) — they are exempt.
 *   - The `ExecuteTool`'s output is the most likely vector for context
 *     blowups (test runs, build logs, `cat <huge.log>`).
 *   - Wrapping at this layer lets us swap backends without touching
 *     the eviction policy.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { randomUUID } from 'node:crypto'
import { BackendProtocol, SandboxFileTransfer } from '../../../../src/sandbox'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_LARGE_RESULT_THRESHOLD = 16 * 1024
const DEFAULT_PREVIEW_BYTES = 4 * 1024

const parseIntEnv = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

const thresholdBytes = (): number => parseIntEnv(process.env.SKILL_LARGE_RESULT_THRESHOLD_BYTES, DEFAULT_LARGE_RESULT_THRESHOLD)
const previewBytes = (): number => parseIntEnv(process.env.SKILL_LARGE_RESULT_PREVIEW_BYTES, DEFAULT_PREVIEW_BYTES)

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

export interface EvictingExecuteToolFields extends ToolParams {
    /** The underlying tool whose output we want to evict on oversize. */
    inner: StructuredTool
    /** Backend with file-transfer support — eviction writes the payload through `uploadFiles`. */
    backend: BackendProtocol & SandboxFileTransfer
    /** Absolute path of the sandbox's output directory. */
    outputDir: string
    /** Name of the read_file structured tool — surfaced in the preview message. */
    readToolName?: string
}

/**
 * Wraps an `ExecuteTool` (or any `StructuredTool`) so its return value
 * is post-processed: oversized payloads are written to disk through the
 * backend's `uploadFiles` and replaced with a head + tail preview.
 *
 * The wrapper preserves the inner tool's schema and name so the agent
 * loop sees no difference.
 */
export class EvictingExecuteTool extends StructuredTool {
    static lc_name() {
        return 'SkillEvictingExecuteTool'
    }

    name: string
    description: string
    schema: z.ZodObject<Record<string, z.ZodTypeAny>>

    private readonly inner: StructuredTool
    private readonly backend: BackendProtocol & SandboxFileTransfer
    private readonly outputDir: string
    private readonly readToolName: string

    constructor(fields: EvictingExecuteToolFields) {
        super(fields)
        this.inner = fields.inner
        this.backend = fields.backend
        this.outputDir = fields.outputDir
        this.readToolName = fields.readToolName ?? 'read_file'
        this.name = fields.inner.name
        this.description = fields.inner.description
        this.schema = fields.inner.schema as z.ZodObject<Record<string, z.ZodTypeAny>>
    }

    protected async _call(input: unknown): Promise<string> {
        // `_call` is the protected method we want to wrap; calling
        // `.invoke()` would re-run the schema parse, so reach into the
        // inner tool's protected hook directly.
        const out = await (this.inner as unknown as { _call: (i: unknown) => Promise<string> })._call(input)
        const max = thresholdBytes()
        if (out.length <= max) return out
        return this.evictOversized(out)
    }

    private async evictOversized(payload: string): Promise<string> {
        const id = randomUUID()
        const path = joinPosix(this.outputDir, '__large_tool_results', `${id}.txt`)
        try {
            const bytes = Buffer.from(payload, 'utf8')
            const responses = await this.backend.uploadFiles([[path, new Uint8Array(bytes)]])
            const failed = responses[0]?.error
            if (failed) {
                // Soft-fail: hand the raw payload back so the agent still
                // makes progress, with a one-line note about the failure.
                return `[Eviction failed — ${failed}; returning raw payload]\n${payload}`
            }
        } catch (err) {
            return `[Eviction failed — ${(err as Error)?.message ?? String(err)}; returning raw payload]\n${payload}`
        }
        return buildEvictionPreview(payload, path, this.readToolName)
    }
}

// ---------------------------------------------------------------------------
// Preview rendering
// ---------------------------------------------------------------------------

export const buildEvictionPreview = (payload: string, path: string, readToolName: string): string => {
    const chunk = previewBytes()
    const head = payload.slice(0, chunk)
    const tail = payload.length > chunk * 2 ? payload.slice(-chunk) : ''
    const lines: string[] = []
    lines.push(`[Output was ${payload.length} bytes — wrote full payload to ${path}]`)
    lines.push(`[Use the \`${readToolName}\` tool to paginate through the file.]`)
    lines.push('')
    lines.push('--- head ---')
    lines.push(head)
    if (tail) {
        lines.push('')
        lines.push('--- tail ---')
        lines.push(tail)
    }
    return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const joinPosix = (a: string, ...rest: string[]): string => {
    let out = a
    for (const r of rest) {
        if (!r) continue
        const left = out.endsWith('/') ? out.slice(0, -1) : out
        const right = r.startsWith('/') ? r.slice(1) : r
        out = `${left}/${right}`
    }
    return out
}
