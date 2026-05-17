/**
 * Sandbox — E2B backend adapter.
 *
 * Wraps `@e2b/code-interpreter` so the rest of the runtime never has to
 * import the SDK directly. Implements:
 *
 *   - `SandboxBackendProtocol` (id + execute + filesystem ops via BaseSandbox).
 *   - `SandboxRuntime` (initialize / close lifecycle).
 *   - `SandboxFileTransfer` (uploadFiles / downloadFiles via `sandbox.files.*`).
 *
 * Configuration is env-driven and stays here rather than spreading
 * across the runtime — adding a second backend means changing one file,
 * not three.
 *
 * Output handling:
 *   `ExecuteResponse.output` combines stdout + stderr per the architecture
 *   contract. We clamp at `maxOutputBytes` to keep one chatty command
 *   from poisoning the model's context. `truncated` is set honestly so
 *   the caller can decide what to do.
 *
 * Exit-code semantics:
 *   - Normal exits → `exitCode = result.exitCode`.
 *   - Timeouts and kills (no exit code reported) → `exitCode = null`.
 *   - CommandExitError (E2B's non-zero throw) → `exitCode = err.exitCode`.
 */

import { Sandbox } from '@e2b/code-interpreter'
import { BaseSandbox, quote } from '../BaseSandbox'
import { ExecuteResponse, FileDownloadResponse, FileOperationError, FileUploadResponse, SandboxError, SandboxRuntime } from '../types'

// ---------------------------------------------------------------------------
// Configurable limits (env-driven)
// ---------------------------------------------------------------------------

const DEFAULT_SESSION_LIFETIME_MS = 15 * 60 * 1000
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024
const DEFAULT_COMMAND_TIMEOUT_MS = 15_000

const parseIntEnv = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

export interface E2BBackendOptions {
    apiKey?: string
    /** Server-side VM lifetime ceiling (ms). */
    lifetimeMs?: number
    /** Default per-command timeout (ms); clamped by callers if they pass a smaller value. */
    commandTimeoutMs?: number
    /** Max bytes per output stream before truncation. */
    maxOutputBytes?: number
    /**
     * Test seam: allows the caller to inject a fake `Sandbox.create`
     * implementation. Production always uses `Sandbox.create`.
     */
    createSandbox?: (opts: { apiKey: string | undefined; timeoutMs: number }) => Promise<Sandbox>
    /**
     * Working directory for `execute` calls. Defaults to `/home/user`,
     * matching the E2B base image convention.
     */
    cwd?: string
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export class E2BBackend extends BaseSandbox implements SandboxRuntime {
    readonly id: string

    private readonly apiKey: string | undefined
    private readonly lifetimeMs: number
    private readonly commandTimeoutMs: number
    private readonly maxOutputBytes: number
    private readonly cwd: string
    private readonly createSandbox: NonNullable<E2BBackendOptions['createSandbox']>

    private sandbox: Sandbox | null = null
    private startPromise: Promise<void> | null = null
    private state: 'idle' | 'starting' | 'ready' | 'closed' = 'idle'
    private closeReason: string | null = null

    constructor(options: E2BBackendOptions = {}) {
        super()
        this.apiKey = options.apiKey ?? process.env.E2B_APIKEY
        this.lifetimeMs = options.lifetimeMs ?? parseIntEnv(process.env.SKILL_V2_SANDBOX_LIFETIME_MS, DEFAULT_SESSION_LIFETIME_MS)
        this.commandTimeoutMs = options.commandTimeoutMs ?? parseIntEnv(process.env.SKILL_EXEC_TIMEOUT_MS, DEFAULT_COMMAND_TIMEOUT_MS)
        this.maxOutputBytes = options.maxOutputBytes ?? parseIntEnv(process.env.SKILL_MAX_OUTPUT_BYTES, DEFAULT_MAX_OUTPUT_BYTES)
        this.cwd = options.cwd ?? '/home/user'
        this.createSandbox = options.createSandbox ?? (async ({ apiKey, timeoutMs }) => Sandbox.create({ apiKey, timeoutMs }))
        // Stable id used for tracing. Real id is populated after `initialize()`.
        this.id = `e2b-${Math.random().toString(36).slice(2, 10)}`
    }

    // -----------------------------------------------------------------------
    // SandboxRuntime
    // -----------------------------------------------------------------------

    get isRunning(): boolean {
        return this.state === 'ready'
    }

    async initialize(): Promise<void> {
        if (this.state === 'ready') return
        if (this.state === 'closed') {
            throw new SandboxError(`E2BBackend is closed (${this.closeReason ?? 'unknown reason'})`, 'NOT_INITIALIZED')
        }
        if (this.startPromise) return this.startPromise
        this.state = 'starting'
        this.startPromise = this.bootSandbox().finally(() => {
            this.startPromise = null
        })
        return this.startPromise
    }

    async close(): Promise<void> {
        if (this.state === 'closed') return
        this.closeReason = this.closeReason ?? 'explicit close'
        this.state = 'closed'
        const sbx = this.sandbox
        this.sandbox = null
        if (sbx) {
            try {
                await sbx.kill()
            } catch {
                // best-effort — the remote runtime also self-reaps.
            }
        }
    }

    // -----------------------------------------------------------------------
    // SandboxBackendProtocol
    // -----------------------------------------------------------------------

    async execute(command: string): Promise<ExecuteResponse> {
        const sbx = await this.requireSandbox()
        try {
            const result = await sbx.commands.run(command, { cwd: this.cwd, timeoutMs: this.commandTimeoutMs })
            return this.toExecuteResponse(result.stdout ?? '', result.stderr ?? '', result.exitCode ?? null)
        } catch (err) {
            const e = err as { stdout?: string; stderr?: string; exitCode?: number; message?: string } | null
            // CommandExitError shape — guest exited non-zero.
            if (
                e &&
                typeof e === 'object' &&
                typeof e.exitCode === 'number' &&
                (typeof e.stdout === 'string' || typeof e.stderr === 'string')
            ) {
                return this.toExecuteResponse(e.stdout ?? '', e.stderr ?? '', e.exitCode)
            }
            // Host-side failure (timeout, kill, network blip). exitCode=null per architecture spec.
            const message = e?.message ?? String(err)
            return this.toExecuteResponse('', message, null)
        }
    }

    // -----------------------------------------------------------------------
    // SandboxFileTransfer
    // -----------------------------------------------------------------------

    async uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
        if (!files.length) return []
        const sbx = await this.requireSandbox()
        // Prepare parent dirs in one shot — E2B's `files.write` requires the
        // parent to exist. We dedupe so we don't issue 200 mkdir calls.
        const dirs = new Set<string>()
        for (const [p] of files) {
            const i = p.lastIndexOf('/')
            if (i > 0) dirs.add(p.slice(0, i))
        }
        if (dirs.size) {
            await this.execute(`mkdir -p ${Array.from(dirs).map(quote).join(' ')}`)
        }
        const entries = files.map(([path, data]) => ({ path, data: Buffer.from(data) }))
        try {
            await sbx.files.write(entries as unknown as { path: string; data: ArrayBuffer }[])
            return files.map(([path]) => ({ path, error: null }))
        } catch (err) {
            // Fall back to per-file writes so partial success is preserved.
            const out: FileUploadResponse[] = []
            for (const entry of entries) {
                try {
                    await sbx.files.write(entry.path, entry.data as unknown as ArrayBuffer)
                    out.push({ path: entry.path, error: null })
                } catch (innerErr) {
                    out.push({
                        path: entry.path,
                        error: classifyFileError(innerErr),
                        message: (innerErr as Error)?.message ?? String(innerErr)
                    })
                }
            }
            // If absolutely every entry failed, surface the bulk error so
            // callers see a clean diagnostic instead of N identical ones.
            if (out.every((r) => r.error)) {
                const msg = (err as Error)?.message ?? String(err)
                return files.map(([path]) => ({ path, error: 'io_error', message: msg }))
            }
            return out
        }
    }

    async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
        if (!paths.length) return []
        const sbx = await this.requireSandbox()
        const out: FileDownloadResponse[] = []
        for (const p of paths) {
            try {
                const data = await sbx.files.read(p, { format: 'bytes' })
                out.push({
                    path: p,
                    content: data instanceof Uint8Array ? data : new Uint8Array(Buffer.from(data as unknown as ArrayBuffer)),
                    error: null
                })
            } catch (err) {
                out.push({
                    path: p,
                    content: null,
                    error: classifyFileError(err),
                    message: (err as Error)?.message ?? String(err)
                })
            }
        }
        return out
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private async bootSandbox(): Promise<void> {
        try {
            const sbx = await this.createSandbox({ apiKey: this.apiKey, timeoutMs: this.lifetimeMs })
            this.sandbox = sbx
            // Mutate the id to a stable, host-known value so tracing
            // ties commands back to the remote VM. We allow the assignment
            // post-construction by typing `id` as `readonly` but treating
            // it as init-once below.
            const stable = (sbx as unknown as { sandboxID?: string; id?: string }).sandboxID ?? (sbx as unknown as { id?: string }).id
            if (stable && typeof stable === 'string') {
                ;(this as { id: string }).id = `e2b-${stable}`
            }
            this.state = 'ready'
        } catch (err) {
            this.state = 'idle'
            this.sandbox = null
            throw err instanceof SandboxError
                ? err
                : new SandboxError((err as Error)?.message ?? String(err), 'COMMAND_FAILED', err as Error)
        }
    }

    private async requireSandbox(): Promise<Sandbox> {
        if (this.state === 'closed') {
            throw new SandboxError(`E2BBackend is closed (${this.closeReason ?? 'unknown reason'})`, 'NOT_INITIALIZED')
        }
        if (this.state !== 'ready') await this.initialize()
        if (!this.sandbox) {
            throw new SandboxError('E2BBackend has no active VM after initialize()', 'NOT_INITIALIZED')
        }
        return this.sandbox
    }

    private toExecuteResponse(stdout: string, stderr: string, exitCode: number | null): ExecuteResponse {
        // Combined stream per architecture spec §3.1 rule 1.
        const combinedRaw = stderr ? (stdout ? `${stdout}\n${stderr}` : stderr) : stdout
        const { text, truncated } = clampWithFlag(combinedRaw, this.maxOutputBytes)
        return { output: text, exitCode, truncated }
    }
}

// ---------------------------------------------------------------------------
// Output clamp — returns the flag instead of mutating the string with a
// "[truncated]" marker so the canonical Layer-4 formatter can decide how
// to render it.
// ---------------------------------------------------------------------------

const clampWithFlag = (s: string, max: number): { text: string; truncated: boolean } => {
    if (s.length <= max) return { text: s, truncated: false }
    return { text: s.slice(0, max), truncated: true }
}

// ---------------------------------------------------------------------------
// FileOperationError classifier
// ---------------------------------------------------------------------------

const classifyFileError = (err: unknown): FileOperationError => {
    const m = ((err as Error)?.message ?? '').toLowerCase()
    if (m.includes('no such file') || m.includes('not found') || m.includes('does not exist')) return 'file_not_found'
    if (m.includes('permission')) return 'permission_denied'
    if (m.includes('is a directory')) return 'is_directory'
    if (m.includes('invalid')) return 'invalid_path'
    return 'io_error'
}
