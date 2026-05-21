/**
 * Skill — pluggable sandbox session.
 *
 * A `SandboxSession` owns one resolved sandbox backend (E2B, local
 * subprocess, …) for the lifetime of one agent run. It is the bridge
 * between the manifest (what-should-be-on-disk) and the LLM-facing
 * `ExecuteTool` / structured filesystem tools.
 *
 *   1. `ensureStarted()` is idempotent and lazy — the backend's
 *      `initialize()` is only invoked when the LLM actually reaches for
 *      execution.
 *   2. The manifest is materialised under `manifest.skillsDir` and an
 *      `manifest.outputDir` directory is prepared for artefacts. The
 *      built-in helpers go under `manifest.helpersDir`.
 *   3. `exec()` runs one shell command through the backend protocol's
 *      `execute(...)`. The result is mapped onto the legacy
 *      `CommandRunResult` envelope so existing call sites keep
 *      compiling; new call sites should consume the typed
 *      `ExecuteResponse` directly via `backend.execute(...)`.
 *   4. `close()` is best-effort and idempotent.
 *
 * Safety:
 *   - Per-file and total-byte upload caps prevent shipping a 4 GB
 *     binary asset into the VM. Helpers are first-party trusted code
 *     and exempt from the budgets.
 *   - Output per-stream is head-clipped via `clampOutput` so the LLM
 *     can't be DoSed by a chatty command.
 *   - An idle timer auto-kills the session after prolonged silence
 *     even if the Skill node forgets to call `close()`.
 *
 * Backend agnostic — nothing in this file imports `@e2b/code-interpreter`.
 * The backend instance is supplied by the caller (Skill.ts) via the
 * `resolveBackend` resolver.
 */

import {
    isSandboxBackend,
    SandboxBackendProtocol,
    SandboxFileTransfer,
    SandboxRuntime,
    BackendProtocol,
    EditResult,
    FileDownloadResponse,
    FileUploadResponse,
    GlobResult,
    GrepResult,
    LsResult,
    ReadRawResult,
    ReadResult,
    WriteResult
} from '../../../../src/sandbox'
import type { SkillBundle } from '../utils'
import { BUILTIN_HELPERS, BuiltinHelper } from './builtinHelpers'
import { clampOutput, SandboxCapability } from './capability'
import { fetchNodeBytes } from './fetchNodeBytes'
import { absolutePath, joinPosix, SandboxManifest, SandboxManifestEntry } from './SandboxManifest'

// ---------------------------------------------------------------------------
// Env-driven limits
// ---------------------------------------------------------------------------

/** Upload budget per individual file (bytes). Guards against huge assets. */
const MAX_BYTES_PER_FILE = parseIntEnv(process.env.SKILL_V2_SANDBOX_MAX_BYTES_PER_FILE, 2 * 1024 * 1024)
/** Cumulative upload budget for an entire session. */
const MAX_TOTAL_BYTES = parseIntEnv(process.env.SKILL_V2_SANDBOX_MAX_TOTAL_BYTES, 20 * 1024 * 1024)
/** Kill the session after this many ms of inactivity. Default 5 minutes. */
const IDLE_SHUTDOWN_MS = parseIntEnv(process.env.SKILL_V2_SANDBOX_IDLE_MS, 5 * 60 * 1000)

function parseIntEnv(v: string | undefined, fallback: number): number {
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export interface CommandRunResult {
    /** `true` iff the host call succeeded AND the process exited with 0. */
    ok: boolean
    stdout: string
    stderr: string
    exitCode: number
    /**
     * Non-null for *host* failures (timeout, network error, sandbox boot
     * problem). Guest-side failures (non-zero exit, stderr spew) still set
     * `ok=false` but leave `error` null so the LLM can see the exit path.
     */
    error?: {
        kind: 'timeout' | 'internal' | 'runtime' | 'disabled'
        message: string
    }
    /** Wall-clock runtime of the `exec` call (ms). */
    durationMs: number
}

export interface SandboxSessionOptions {
    workspaceId: string
    skillId: string
    /** Bundle is needed so we can pull `entry.content` for skill-kind nodes. */
    bundle: SkillBundle
    manifest: SandboxManifest
    capability: SandboxCapability
    /**
     * Resolved sandbox backend. The session never constructs one itself;
     * the caller (Skill.ts) goes through `resolveBackend(env)` so the
     * choice between E2B / local / future backends stays in a single
     * place. File-transfer support is required because the session has
     * to materialise manifest entries and harvest output artefacts.
     */
    backend: SandboxBackendProtocol & SandboxFileTransfer
    /** Optional lifecycle handle — present when the backend is long-lived. */
    runtime?: SandboxRuntime | null
    /**
     * Optional override for the built-in helper registry. Production
     * always uses `BUILTIN_HELPERS`. Tests inject a stub registry so
     * helper materialisation can be exercised without touching the
     * real Python scripts.
     */
    helperRegistry?: readonly BuiltinHelper[]
}

type LifecycleState = 'idle' | 'starting' | 'ready' | 'closed'

/**
 * Thin, deterministic wrapper around a resolved sandbox backend.
 * Construction is free; all network activity is deferred until the
 * first `exec()` call (or an explicit `ensureStarted()`).
 */
export class SandboxSession {
    readonly workspaceId: string
    readonly skillId: string
    readonly manifest: SandboxManifest
    readonly capability: SandboxCapability

    private readonly bundle: SkillBundle
    private readonly backend: SandboxBackendProtocol & SandboxFileTransfer
    private readonly runtime: SandboxRuntime | null
    private readonly helperRegistry: readonly BuiltinHelper[]

    private state: LifecycleState = 'idle'
    private startPromise: Promise<void> | null = null
    private idleTimer: NodeJS.Timeout | null = null
    private closeReason: string | null = null
    private cachedReadyBackend: (BackendProtocol & SandboxFileTransfer) | null = null

    constructor(options: SandboxSessionOptions) {
        if (!isSandboxBackend(options.backend)) {
            throw new Error('SandboxSession requires a backend that satisfies SandboxBackendProtocol (id + execute).')
        }
        this.workspaceId = options.workspaceId
        this.skillId = options.skillId
        this.bundle = options.bundle
        this.manifest = options.manifest
        this.capability = options.capability
        this.backend = options.backend
        this.runtime = options.runtime ?? null
        this.helperRegistry = options.helperRegistry ?? BUILTIN_HELPERS
    }

    get isClosed(): boolean {
        return this.state === 'closed'
    }

    /** Stable id of the resolved backend — useful for logs and telemetry. */
    get backendId(): string {
        return this.backend.id
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /**
     * Lazily boot the backend and materialize the manifest on its
     * filesystem. Safe to call repeatedly — a single in-flight promise is
     * shared across concurrent callers so parallel exec invocations don't
     * start two sandboxes.
     */
    async ensureStarted(): Promise<void> {
        if (this.state === 'ready') return
        if (this.state === 'closed') throw new Error(`SandboxSession is closed (${this.closeReason ?? 'unknown reason'})`)
        if (this.startPromise) return this.startPromise

        this.state = 'starting'
        this.startPromise = this.bootAndMaterialize().finally(() => {
            this.startPromise = null
        })
        return this.startPromise
    }

    /**
     * Run one command in the sandbox. Always resolves; shell-level errors
     * flow through the `CommandRunResult` envelope.
     */
    async exec(command: string, timeoutMs?: number): Promise<CommandRunResult> {
        const started = Date.now()

        if (this.state === 'closed') {
            return {
                ok: false,
                stdout: '',
                stderr: '',
                exitCode: 1,
                error: { kind: 'disabled', message: `SandboxSession is closed (${this.closeReason ?? 'unknown reason'})` },
                durationMs: 0
            }
        }

        try {
            await this.ensureStarted()
        } catch (err) {
            const message = (err as Error)?.message ?? String(err)
            return {
                ok: false,
                stdout: '',
                stderr: message,
                exitCode: 1,
                error: { kind: classifyHostError(message), message },
                durationMs: Date.now() - started
            }
        }

        this.bumpIdleTimer()
        const effectiveTimeout = this.clampTimeout(timeoutMs)

        try {
            const response = await this.runWithTimeout(this.backend.execute(command), effectiveTimeout)
            const { output, exitCode, truncated } = response
            // Map the new combined-stream `ExecuteResponse` back onto the
            // legacy two-stream envelope so existing callers keep compiling.
            // We surface the whole combined output through `stdout` and
            // leave `stderr` empty; the architecture explicitly argues for
            // one combined stream so this is the canonical shape going
            // forward.
            const clampedStdout = clampOutput(output, this.capability.maxOutputBytes)
            const ok = exitCode === 0
            return {
                ok,
                stdout: clampedStdout,
                stderr: truncated ? '[Output was truncated due to size limits]' : '',
                exitCode: typeof exitCode === 'number' ? exitCode : 1,
                error:
                    exitCode === null
                        ? { kind: 'timeout', message: 'command did not report an exit code (killed or timed out)' }
                        : undefined,
                durationMs: Date.now() - started
            }
        } catch (err) {
            const message = (err as Error)?.message ?? String(err)
            return {
                ok: false,
                stdout: '',
                stderr: message,
                exitCode: 1,
                error: { kind: classifyHostError(message), message },
                durationMs: Date.now() - started
            }
        } finally {
            this.bumpIdleTimer()
        }
    }

    /**
     * Public accessor for a "materializing" view of the backend.
     *
     * Why this exists: in the legacy design, every interaction with the
     * sandbox went through `exec()`, which always called
     * `ensureStarted()` first — that's where manifest entries (skill
     * files, code references, helpers) get uploaded into the VM. With
     * the new architecture, the LLM can call structured FS tools
     * (`read_file`, `ls`, `grep`, …) directly. If those calls hit the
     * raw backend, the sandbox is empty and they all return
     * `file_not_found`.
     *
     * The proxy returned here intercepts every `BackendProtocol`
     * (and `SandboxFileTransfer`) method, `await`s
     * `ensureStarted()` (which is idempotent — paid once per session),
     * then delegates to the underlying backend. Boot failures are
     * surfaced as the protocol's tagged-union `error?` field rather
     * than thrown exceptions, keeping the agent loop deterministic.
     *
     * The proxy is cached for stable identity — useful for tests and
     * for downstream consumers (the eviction decorator) that want to
     * compare references.
     *
     * Note: the proxy intentionally does NOT expose `execute()` — Layer
     * 4 callers that need shell execution must go through `session.exec()`
     * which handles the legacy `CommandRunResult` envelope (timeouts,
     * stderr clamping, host-error classification).
     */
    getBackend(): BackendProtocol & SandboxFileTransfer {
        if (!this.cachedReadyBackend) {
            this.cachedReadyBackend = this.makeMaterializingBackend()
        }
        return this.cachedReadyBackend
    }

    private makeMaterializingBackend(): BackendProtocol & SandboxFileTransfer {
        const inner = this.backend
        // Tagged-union error fallbacks. Each method returns the same shape
        // its concrete backend would have produced; only `error?` differs.
        const ensureOrError = async (): Promise<string | null> => {
            if (this.state === 'closed') return `sandbox is closed (${this.closeReason ?? 'unknown reason'})`
            try {
                await this.ensureStarted()
                return null
            } catch (err) {
                return (err as Error)?.message ?? String(err)
            }
        }
        const bump = () => this.bumpIdleTimer()
        return {
            ls: async (path: string): Promise<LsResult> => {
                const e = await ensureOrError()
                if (e) return { path, entries: [], error: `sandbox not ready: ${e}` }
                try {
                    return await inner.ls(path)
                } finally {
                    bump()
                }
            },
            read: async (path: string, offset?: number, limit?: number): Promise<ReadResult> => {
                const e = await ensureOrError()
                if (e) return { path, content: null, error: `sandbox not ready: ${e}` }
                try {
                    return await inner.read(path, offset, limit)
                } finally {
                    bump()
                }
            },
            readRaw: async (path: string): Promise<ReadRawResult> => {
                const e = await ensureOrError()
                if (e) return { path, content: null, error: `sandbox not ready: ${e}` }
                try {
                    return await inner.readRaw(path)
                } finally {
                    bump()
                }
            },
            write: async (path: string, content: string): Promise<WriteResult> => {
                const e = await ensureOrError()
                if (e) return { path, error: `sandbox not ready: ${e}` }
                try {
                    return await inner.write(path, content)
                } finally {
                    bump()
                }
            },
            edit: async (path: string, oldString: string, newString: string, replaceAll?: boolean): Promise<EditResult> => {
                const e = await ensureOrError()
                if (e) return { path, replacements: 0, error: `sandbox not ready: ${e}` }
                try {
                    return await inner.edit(path, oldString, newString, replaceAll)
                } finally {
                    bump()
                }
            },
            glob: async (pattern: string, path?: string): Promise<GlobResult> => {
                const e = await ensureOrError()
                if (e) return { pattern, path: path ?? this.manifest.skillsDir, matches: [], error: `sandbox not ready: ${e}` }
                try {
                    return await inner.glob(pattern, path)
                } finally {
                    bump()
                }
            },
            grep: async (pattern: string, path?: string, glob?: string | null): Promise<GrepResult> => {
                const e = await ensureOrError()
                if (e) return { pattern, path: path ?? this.manifest.skillsDir, hits: [], error: `sandbox not ready: ${e}` }
                try {
                    return await inner.grep(pattern, path, glob)
                } finally {
                    bump()
                }
            },
            uploadFiles: async (files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> => {
                const e = await ensureOrError()
                if (e) return files.map(([p]) => ({ path: p, error: 'io_error' as const, message: `sandbox not ready: ${e}` }))
                try {
                    return await inner.uploadFiles(files)
                } finally {
                    bump()
                }
            },
            downloadFiles: async (paths: string[]): Promise<FileDownloadResponse[]> => {
                const e = await ensureOrError()
                if (e) return paths.map((p) => ({ path: p, content: null, error: 'io_error' as const, message: `sandbox not ready: ${e}` }))
                try {
                    return await inner.downloadFiles(paths)
                } finally {
                    bump()
                }
            }
        }
    }

    /**
     * List and download any files the LLM wrote under `outputDir`.
     *
     * Returned buffers are un-clipped — the caller decides how to surface
     * them to downstream nodes. Safe to call before `close()`; after
     * `close()` it returns an empty array.
     */
    async harvestOutputs(limit = 32): Promise<Array<{ path: string; bytes: Buffer }>> {
        if (this.state !== 'ready') return []
        const out: Array<{ path: string; bytes: Buffer }> = []
        try {
            const listing = await this.backend.ls(this.manifest.outputDir)
            if (listing.error) return []
            const files = listing.entries.filter((e) => e.type === 'file').slice(0, Math.max(0, limit))
            const paths = files.map((f) => f.path)
            const responses = await this.backend.downloadFiles(paths)
            for (const r of responses) {
                if (r.error || !r.content) continue
                out.push({ path: r.path, bytes: Buffer.from(r.content) })
            }
        } catch {
            // Best-effort — the output dir may not exist (LLM never wrote).
        }
        return out
    }

    /**
     * Tear the backend down. Idempotent; safe from finalisers / signal
     * handlers. A reason is recorded so subsequent `exec()` calls surface
     * a clear message to the LLM.
     */
    async close(reason = 'session closed'): Promise<void> {
        if (this.state === 'closed') return
        this.closeReason = reason
        this.state = 'closed'
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = null
        }
        if (this.runtime) {
            try {
                await this.runtime.close()
            } catch {
                // best-effort cleanup.
            }
        }
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /**
     * Boot the backend (if it carries a `SandboxRuntime` lifecycle) and
     * materialize all manifest entries.
     */
    private async bootAndMaterialize(): Promise<void> {
        try {
            if (this.runtime && !this.runtime.isRunning) {
                await this.runtime.initialize()
            }
            // Create the canonical layout in one shot. POSIX `mkdir -p`
            // is non-throwing on already-present dirs.
            const dirs = [this.manifest.skillsDir, this.manifest.outputDir]
            if (this.manifest.helpers.length) dirs.push(this.manifest.helpersDir)
            const mkResp = await this.backend.execute(`mkdir -p ${dirs.map(shellQuote).join(' ')}`)
            if (mkResp.exitCode !== 0 && mkResp.exitCode !== null) {
                throw new Error(`Failed to create sandbox directories: ${truncate(mkResp.output, 256)}`)
            }
            await this.materializeManifest()
            await this.materializeHelpers()
            this.state = 'ready'
            this.bumpIdleTimer()
        } catch (err) {
            console.error(
                `Failed to boot sandbox for skill ${this.skillId}:`,
                err instanceof Error ? err.stack || err.message : String(err)
            )
            this.state = 'idle'
            if (this.runtime) {
                try {
                    await this.runtime.close()
                } catch (closeErr) {
                    console.error(
                        `Failed to close sandbox runtime for skill ${this.skillId}:`,
                        closeErr instanceof Error ? closeErr.stack || closeErr.message : String(closeErr)
                    )
                }
            }
            throw err
        }
    }

    private async materializeManifest(): Promise<void> {
        if (!this.manifest.entries.length) return

        const writeEntries: Array<[string, Uint8Array]> = []
        let totalBytes = 0

        for (const entry of this.manifest.entries) {
            const bytes = await this.loadEntryBytes(entry)
            if (bytes === null) continue

            if (bytes.length > MAX_BYTES_PER_FILE) {
                throw new Error(
                    `Skill asset "${entry.relPath}" (${bytes.length} bytes) exceeds per-file sandbox budget (${MAX_BYTES_PER_FILE})`
                )
            }
            totalBytes += bytes.length
            if (totalBytes > MAX_TOTAL_BYTES) {
                throw new Error(`Skill sandbox upload exceeded total budget (${MAX_TOTAL_BYTES} bytes); last file "${entry.relPath}"`)
            }

            writeEntries.push([absolutePath(this.manifest, entry), new Uint8Array(bytes)])
        }

        if (!writeEntries.length) return

        const responses = await this.backend.uploadFiles(writeEntries)
        const failures = responses.filter((r) => r.error)
        if (failures.length) {
            const first = failures[0]
            throw new Error(
                `Failed to materialise ${failures.length}/${responses.length} skill assets (first: ${first.path} → ${first.error})`
            )
        }
    }

    /**
     * Upload the built-in helper scripts under `manifest.helpersDir`.
     *
     * Helpers are first-party trusted code — they are deliberately
     * exempt from the per-file / per-session upload budgets that protect
     * against malicious skill assets. We instead surface a single
     * telemetry log line (`Materialized N helpers (B bytes) for skill X`)
     * so accidental size growth is visible without bisecting commits.
     *
     * The helper entries on the manifest are enriched in place with the
     * resolved `digest` and `sizeBytes` so downstream callers (cache
     * keys, drift detection) can read the same numbers the session
     * actually uploaded.
     */
    private async materializeHelpers(): Promise<void> {
        if (!this.manifest.helpers.length) return

        const writeEntries: Array<[string, Uint8Array]> = []
        let totalBytes = 0

        for (const helperMeta of this.manifest.helpers) {
            const registered = this.helperRegistry.find((h) => h.name === helperMeta.name)
            if (!registered) {
                console.warn(`Manifest references unknown built-in helper "${helperMeta.name}" — skipping.`)
                continue
            }
            const bytes = await registered.bytes()
            const digest = await registered.digest()
            helperMeta.digest = digest
            helperMeta.sizeBytes = bytes.length
            totalBytes += bytes.length
            writeEntries.push([joinPosix(this.manifest.helpersDir, helperMeta.relPath), new Uint8Array(bytes)])
        }

        if (!writeEntries.length) return

        const responses = await this.backend.uploadFiles(writeEntries)
        const failures = responses.filter((r) => r.error)
        if (failures.length) {
            const first = failures[0]
            throw new Error(`Failed to materialise ${failures.length}/${responses.length} helpers (first: ${first.path} → ${first.error})`)
        }
        console.log(`[SandboxSession] Materialized ${writeEntries.length} helpers (${totalBytes} bytes) for skill ${this.skillId}`)
    }

    private async loadEntryBytes(entry: SandboxManifestEntry): Promise<Buffer | null> {
        const bundleEntry = this.bundle.entries?.[entry.nodeId]
        const inlineContent =
            entry.kind === 'skill' && bundleEntry && typeof bundleEntry.content === 'string' ? bundleEntry.content : undefined

        return fetchNodeBytes({
            workspaceId: this.workspaceId,
            skillId: this.skillId,
            nodeId: entry.nodeId,
            kind: entry.kind,
            digest: entry.digest,
            inlineContent
        })
    }

    private clampTimeout(requested: number | undefined): number {
        if (typeof requested === 'number' && requested > 0) {
            return Math.min(requested, this.capability.maxTimeoutMs)
        }
        return this.capability.maxTimeoutMs
    }

    /**
     * Wrap a backend call in a `Promise.race` against a per-session
     * timeout. The architecture's `ExecuteResponse.exitCode = null` path
     * is what we hand back to callers when this trips.
     */
    private async runWithTimeout<T>(p: Promise<T> | T, timeoutMs: number): Promise<T> {
        const value = Promise.resolve(p)
        if (!timeoutMs || timeoutMs <= 0) return value
        let timer: NodeJS.Timeout | null = null
        try {
            return await Promise.race<T>([
                value,
                new Promise<T>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`command exceeded sandbox timeout (${timeoutMs} ms)`)), timeoutMs)
                    if (typeof (timer as { unref?: () => void }).unref === 'function') {
                        ;(timer as { unref: () => void }).unref()
                    }
                })
            ])
        } finally {
            if (timer) clearTimeout(timer)
        }
    }

    private bumpIdleTimer(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer)
        if (IDLE_SHUTDOWN_MS <= 0) return
        this.idleTimer = setTimeout(() => {
            void this.close('idle timeout')
        }, IDLE_SHUTDOWN_MS)
        if (typeof (this.idleTimer as { unref?: () => void }).unref === 'function') {
            ;(this.idleTimer as { unref: () => void }).unref()
        }
    }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const classifyHostError = (message: string): NonNullable<CommandRunResult['error']>['kind'] => {
    const m = (message || '').toLowerCase()
    if (m.includes('timeout') || m.includes('timed out') || m.includes('exceeded')) return 'timeout'
    if (m.includes('closed') || m.includes('killed')) return 'disabled'
    return 'internal'
}

const shellQuote = (s: string): string => "'" + s.replace(/'/g, `'\\''`) + "'"

const truncate = (s: string, max: number): string => (s.length <= max ? s : `${s.slice(0, max)}…`)
