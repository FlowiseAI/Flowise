/**
 * Skill — E2B bash session.
 *
 * A `SandboxSession` owns one E2B VM for the lifetime of one agent run.
 * It is the bridge between the manifest (what-should-be-on-disk) and
 * the `SandboxBashTool` (how-the-LLM-reaches-it). The design mirrors
 *
 *   1. `ensureStarted()` is idempotent and lazy — nothing hits the wire
 *      until the LLM actually calls the bash tool.
 *   2. The manifest is materialized under `/home/user/skills/` and an
 *      `/home/user/output/` directory is prepared for artefacts.
 *   3. `exec()` runs one shell command, always returning a
 *      `CommandRunResult` envelope; non-zero exits never throw out.
 *   4. `close()` is best-effort; the remote sandbox also has its own
 *      timeout so leaked sessions self-heal.
 *
 * Safety:
 *   - Per-file and total-byte upload caps prevent accidentally shipping
 *     a 4 GB binary asset into the VM.
 *   - Output per-stream is head/tail clipped so the LLM can't be DoSed
 *     by a chatty command.
 *   - An idle timer auto-kills the session after prolonged silence even
 *     if the Skill node forgets to call `close()`.
 */

import { Sandbox } from '@e2b/code-interpreter'
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
/** How long E2B keeps the VM alive server-side. Default 15 minutes. */
const SESSION_LIFETIME_MS = parseIntEnv(process.env.SKILL_V2_SANDBOX_LIFETIME_MS, 15 * 60 * 1000)

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
    /** Override for tests; production always uses `@e2b/code-interpreter`. */
    createSandbox?: (opts: { apiKey: string | undefined; timeoutMs: number }) => Promise<Sandbox>
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
 * Thin, deterministic wrapper around a single E2B VM. Construction is
 * free; all network activity is deferred until the first `exec()` call
 * (or an explicit `ensureStarted()`).
 */
export class SandboxSession {
    readonly workspaceId: string
    readonly skillId: string
    readonly manifest: SandboxManifest
    readonly capability: SandboxCapability

    private readonly bundle: SkillBundle
    private readonly createSandbox: NonNullable<SandboxSessionOptions['createSandbox']>
    private readonly helperRegistry: readonly BuiltinHelper[]

    private state: LifecycleState = 'idle'
    private sandbox: Sandbox | null = null
    private startPromise: Promise<void> | null = null
    private idleTimer: NodeJS.Timeout | null = null
    private closeReason: string | null = null

    constructor(options: SandboxSessionOptions) {
        this.workspaceId = options.workspaceId
        this.skillId = options.skillId
        this.bundle = options.bundle
        this.manifest = options.manifest
        this.capability = options.capability
        this.createSandbox = options.createSandbox ?? (async ({ apiKey, timeoutMs }) => Sandbox.create({ apiKey, timeoutMs }))
        this.helperRegistry = options.helperRegistry ?? BUILTIN_HELPERS
    }

    get isClosed(): boolean {
        return this.state === 'closed'
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /**
     * Lazily boot the E2B VM and materialize the manifest on its
     * filesystem. Safe to call repeatedly — a single in-flight promise is
     * shared across concurrent callers so parallel bash invocations don't
     * start two sandboxes.
     */
    async ensureStarted(): Promise<void> {
        if (this.state === 'ready') return
        if (this.state === 'closed') throw new Error(`SandboxSession is closed (${this.closeReason ?? 'unknown reason'})`)
        if (this.startPromise) return this.startPromise

        this.state = 'starting'
        this.startPromise = this.bootAndMaterialize().finally(() => {
            // bootAndMaterialize updates state on success/failure itself.
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

        if (!this.sandbox) {
            return {
                ok: false,
                stdout: '',
                stderr: '',
                exitCode: 1,
                error: { kind: 'internal', message: 'SandboxSession has no active VM after ensureStarted' },
                durationMs: Date.now() - started
            }
        }

        this.bumpIdleTimer()
        const effectiveTimeout = this.clampTimeout(timeoutMs)

        try {
            // `commands.run` throws a CommandExitError on non-zero exit by
            // default. That class implements CommandResult, so we can read
            // stdout/stderr/exitCode off the thrown error and treat the
            // whole thing as a guest-side failure instead of a host crash.
            const result = await this.sandbox.commands.run(command, {
                cwd: '/home/user',
                timeoutMs: effectiveTimeout
            })
            const stdout = clampOutput(result.stdout ?? '', this.capability.maxOutputBytes)
            const stderr = clampOutput(result.stderr ?? '', this.capability.maxOutputBytes)
            return {
                ok: result.exitCode === 0,
                stdout,
                stderr,
                exitCode: result.exitCode,
                durationMs: Date.now() - started
            }
        } catch (err) {
            return this.translateExecError(err, started)
        } finally {
            this.bumpIdleTimer()
        }
    }

    /**
     * List and download any files the LLM wrote under `/home/user/output/`.
     *
     * Returned buffers are un-clipped — the caller decides how to surface
     * them to downstream nodes. Safe to call before `close()`; after
     * `close()` it returns an empty array.
     */
    async harvestOutputs(limit = 32): Promise<Array<{ path: string; bytes: Buffer }>> {
        if (this.state !== 'ready' || !this.sandbox) return []
        const out: Array<{ path: string; bytes: Buffer }> = []
        try {
            const listed = await this.sandbox.files.list(this.manifest.outputDir)
            const files = listed.filter((e) => e.type === 'file').slice(0, Math.max(0, limit))
            for (const f of files) {
                try {
                    const remotePath = `${this.manifest.outputDir}/${f.name}`.replace(/\/+/g, '/')
                    const data = await this.sandbox.files.read(remotePath, { format: 'bytes' })
                    out.push({ path: remotePath, bytes: Buffer.from(data) })
                } catch {
                    // Best-effort — skip unreadable entries.
                }
            }
        } catch {
            // The output dir may not exist (LLM never wrote anything) — that's fine.
        }
        return out
    }

    /**
     * Tear the VM down. Idempotent; safe from finalisers / signal handlers.
     * A reason is recorded so subsequent `exec()` calls surface a clear
     * message to the LLM.
     */
    async close(reason = 'session closed'): Promise<void> {
        if (this.state === 'closed') return
        this.closeReason = reason
        this.state = 'closed'
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = null
        }
        const sbx = this.sandbox
        this.sandbox = null
        if (sbx) {
            try {
                await sbx.kill()
            } catch {
                // noop — best-effort cleanup
            }
        }
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /**
     * Boot the sandbox and materialize all manifest entries.
     * Clone the manifest files into the VM's filesystem so the bash tool can
     * reach them without extra storage round-trips. The manifest is the
     * single source of truth for what should be on disk, so we don't allow
     * the session to start until all files are in place.
     */
    private async bootAndMaterialize(): Promise<void> {
        let sbx: Sandbox | null = null
        try {
            sbx = await this.createSandbox({
                apiKey: process.env.E2B_APIKEY,
                timeoutMs: SESSION_LIFETIME_MS
            })
            this.sandbox = sbx
            await sbx.files.makeDir(this.manifest.skillsDir)
            await sbx.files.makeDir(this.manifest.outputDir)
            if (this.manifest.helpers.length) {
                await sbx.files.makeDir(this.manifest.helpersDir)
            }
            await this.materializeManifest(sbx)
            await this.materializeHelpers(sbx)
            this.state = 'ready'
            this.bumpIdleTimer()
        } catch (err) {
            console.error(
                `Failed to boot sandbox for skill ${this.skillId}:`,
                err instanceof Error ? err.stack || err.message : String(err)
            )
            // Roll back to a clean state so the next ensureStarted() call
            // can retry (e.g. transient network blip during boot).
            this.state = 'idle'
            if (sbx) {
                try {
                    await sbx.kill()
                } catch (err) {
                    console.error(
                        `Failed to kill sandbox for skill ${this.skillId}:`,
                        err instanceof Error ? err.stack || err.message : String(err)
                    )
                }
            }
            this.sandbox = null
            throw err
        }
    }

    private async materializeManifest(sbx: Sandbox): Promise<void> {
        if (!this.manifest.entries.length) return

        // Group into a single bulk write where possible — the E2B API has
        // an overload that accepts an array of `{path, data}` entries.
        const writeEntries: Array<{ path: string; data: Buffer }> = []
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

            writeEntries.push({ path: absolutePath(this.manifest, entry), data: bytes })
        }

        if (!writeEntries.length) return

        // NOTE: `files.write` accepts either a single path+data pair OR an
        // array of entries. We pass the array form; the SDK types accept
        // Buffer (extends Uint8Array extends ArrayBufferView → ArrayBuffer
        // interop). Cast through `unknown` keeps strict-mode happy because
        // the SDK's declared element type is `string | ArrayBuffer | Blob |
        // ReadableStream` and Buffer isn't listed by name.
        await sbx.files.write(writeEntries as unknown as { path: string; data: ArrayBuffer }[])
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
    private async materializeHelpers(sbx: Sandbox): Promise<void> {
        if (!this.manifest.helpers.length) return

        const writeEntries: Array<{ path: string; data: Buffer }> = []
        let totalBytes = 0

        for (const helperMeta of this.manifest.helpers) {
            const registered = this.helperRegistry.find((h) => h.name === helperMeta.name)
            if (!registered) {
                console.warn(`Manifest references unknown built-in helper "${helperMeta.name}" — skipping.`)
                continue
            }
            const bytes = await registered.bytes()
            const digest = await registered.digest()
            // Enrich the manifest in place so callers (cache keys, drift
            // detection) can read the same numbers we actually uploaded.
            helperMeta.digest = digest
            helperMeta.sizeBytes = bytes.length
            totalBytes += bytes.length
            writeEntries.push({
                path: joinPosix(this.manifest.helpersDir, helperMeta.relPath),
                data: bytes
            })
        }

        if (!writeEntries.length) return

        await sbx.files.write(writeEntries as unknown as { path: string; data: ArrayBuffer }[])
        console.log(`[SandboxSession] Materialized ${writeEntries.length} helpers (${totalBytes} bytes) for skill ${this.skillId}`)
    }

    private async loadEntryBytes(entry: SandboxManifestEntry): Promise<Buffer | null> {
        // For skill-kind markdown, the compiled content is already in the
        // bundle — no need for another round-trip to storage.
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

    private translateExecError(err: unknown, started: number): CommandRunResult {
        // CommandExitError is the only *expected* throw from commands.run.
        // Its shape is {exitCode, stdout, stderr, error?} so we can fall
        // through to the normal envelope and leave `error` null.
        const e = err as { stdout?: string; stderr?: string; exitCode?: number; error?: string; message?: string; name?: string } | null
        if (
            e &&
            typeof e === 'object' &&
            typeof e.exitCode === 'number' &&
            (typeof e.stdout === 'string' || typeof e.stderr === 'string')
        ) {
            return {
                ok: false,
                stdout: clampOutput(e.stdout ?? '', this.capability.maxOutputBytes),
                stderr: clampOutput(e.stderr ?? '', this.capability.maxOutputBytes),
                exitCode: e.exitCode,
                error: e.error ? { kind: 'runtime', message: e.error } : undefined,
                durationMs: Date.now() - started
            }
        }
        const message = e?.message ?? String(err)
        return {
            ok: false,
            stdout: '',
            stderr: message,
            exitCode: 1,
            error: { kind: classifyHostError(message), message },
            durationMs: Date.now() - started
        }
    }

    private bumpIdleTimer(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer)
        if (IDLE_SHUTDOWN_MS <= 0) return
        this.idleTimer = setTimeout(() => {
            void this.close('idle timeout')
        }, IDLE_SHUTDOWN_MS)
        // Don't keep the process alive just for this timer in CLI contexts.
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
    if (m.includes('timeout') || m.includes('timed out')) return 'timeout'
    if (m.includes('closed') || m.includes('killed')) return 'disabled'
    return 'internal'
}
