/**
 * Sandbox — Docker backend.
 *
 * A local-or-self-host backend that runs every Skill bash invocation
 * inside a fresh, sealed container. The host filesystem is never
 * touched by LLM-issued commands — all I/O goes through tar streams on
 * the docker daemon socket, and the only writable mounts are an
 * anonymous volume at `/home/user` plus a tmpfs at `/tmp` (both
 * reclaimed when the container is removed). See
 * `docs/docker_sandbox_plan.md` for the security model.
 *
 * Implements:
 *   - `SandboxBackendProtocol` (id + execute + filesystem ops via BaseSandbox).
 *   - `SandboxRuntime` (initialize / close lifecycle).
 *   - `SandboxFileTransfer` (uploadFiles / downloadFiles via tar streams over
 *     dockerode's putArchive / getArchive — no bind mounts, no host writes).
 *
 * Hardening defaults (see `docs/docker_sandbox_plan.md` §7):
 *   - One container per backend instance, anonymous volume at /home/user,
 *     `ReadonlyRootfs: true`, `CapDrop: ['ALL']`, `no-new-privileges:true`,
 *     non-root uid 1000, no host env, `NetworkMode: 'none'`,
 *     `PidsLimit: 128`, 512 MiB memory, 1 CPU.
 *
 * Concurrency:
 *   - A per-instance async mutex serializes the public methods so the
 *     idle reaper / lifetime timer / explicit close never race against
 *     an in-flight call.
 *
 * Output handling (matches the architecture contract):
 *   - `ExecuteResponse.output` combines stdout + stderr.
 *   - We clamp at `maxOutputBytes`; `truncated` is reported honestly.
 *   - Timeouts and host-side failures surface as `exitCode: null` —
 *     never thrown to the agent loop.
 */

import * as crypto from 'node:crypto'
import { BaseSandbox } from '../BaseSandbox'
import { ExecuteResponse, FileDownloadResponse, FileUploadResponse, SandboxError, SandboxRuntime } from '../types'
import { ContainerCreateOptions, ContainerLike, DockerClient, DockerLike } from '../docker/DockerClient'
import { Mutex } from '../docker/Mutex'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_IMAGE = 'flowise-skill-sandbox:dev'
const DEFAULT_NETWORK_MODE = 'none'
const DEFAULT_MEMORY_BYTES = 512 * 1024 * 1024
const DEFAULT_PIDS_LIMIT = 128
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000
/**
 * Grace period the host-side safety net gives to the in-container
 * `timeout(1)` wrapper. The host kills the whole container only if
 * the user's command is still alive `HOST_SAFETY_MARGIN_MS` past the
 * `commandTimeoutMs` budget — which only happens if `timeout(1)`
 * itself wedges (e.g. process in uninterruptible kernel sleep). A
 * value much larger than `timeout -k 2` (2 second SIGKILL grace) is
 * enough to absorb the normal cleanup path.
 */
const HOST_SAFETY_MARGIN_MS = 5_000
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024
const DEFAULT_IDLE_MS = 5 * 60 * 1000
const DEFAULT_LIFETIME_MS = 15 * 60 * 1000

const parseIntEnv = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

const parseFloatEnv = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback
    const n = parseFloat(v)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DockerBackendOptions {
    /** Image tag to run. Defaults to `flowise-skill-sandbox:dev`. */
    image?: string
    /** Docker network mode. Defaults to `'none'` — no egress. */
    networkMode?: string
    /** Memory cap in bytes. Defaults to 512 MiB. */
    memoryBytes?: number
    /** CPU cap as nano-CPUs (1 CPU = 1e9). Defaults to 1.0. */
    nanoCpus?: number
    /** PID cap. Defaults to 128. */
    pidsLimit?: number
    /** Per-command timeout (ms). Defaults to 15s or SKILL_EXEC_TIMEOUT_MS. */
    commandTimeoutMs?: number
    /** Max bytes per combined output. Defaults to 64 KiB or SKILL_MAX_OUTPUT_BYTES. */
    maxOutputBytes?: number
    /** Idle reaper window (ms). Defaults to 5 min or SKILL_V2_SANDBOX_IDLE_MS. */
    idleMs?: number
    /** Lifetime ceiling (ms). Defaults to 15 min or SKILL_V2_SANDBOX_LIFETIME_MS. */
    lifetimeMs?: number
    /**
     * Working directory inside the container for `execute`. Defaults to
     * `/home/user`, matching the base image and the E2B path layout so
     * `BaseSandbox` shell snippets ("/home/user/skills/...") work as-is.
     */
    cwd?: string
    /**
     * Test seam: inject a fake DockerLike. Production uses a real
     * `DockerClient`.
     */
    client?: DockerLike
}

// ---------------------------------------------------------------------------
// Process-exit hook — registered once per process so abandoned containers
// from previous Flowise crashes are reaped at startup, and live containers
// are reaped on shutdown.
// ---------------------------------------------------------------------------

let exitHookRegistered = false
const installExitHook = (client: DockerLike): void => {
    if (exitHookRegistered) return
    exitHookRegistered = true
    const handler = () => {
        client
            .listSkillContainers()
            .then(async (xs) => {
                await Promise.all(xs.map((x) => x.remove()))
            })
            .catch(() => undefined)
    }
    process.once('SIGTERM', handler)
    process.once('SIGINT', handler)
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export class DockerBackend extends BaseSandbox implements SandboxRuntime {
    readonly id: string

    private readonly opts: Required<Omit<DockerBackendOptions, 'client'>>
    private readonly client: DockerLike

    private container: ContainerLike | null = null
    private state: 'idle' | 'starting' | 'ready' | 'closed' = 'idle'
    private closeReason: string | null = null
    private startPromise: Promise<void> | null = null

    private readonly mutex = new Mutex()
    private idleTimer: NodeJS.Timeout | null = null
    private lifetimeTimer: NodeJS.Timeout | null = null

    constructor(options: DockerBackendOptions = {}) {
        super()
        this.opts = {
            image: options.image ?? process.env.SKILL_DOCKER_IMAGE ?? DEFAULT_IMAGE,
            networkMode: options.networkMode ?? process.env.SKILL_DOCKER_NETWORK ?? DEFAULT_NETWORK_MODE,
            memoryBytes:
                options.memoryBytes ??
                parseIntEnv(process.env.SKILL_DOCKER_MEMORY_MB, Math.round(DEFAULT_MEMORY_BYTES / 1024 / 1024)) * 1024 * 1024,
            nanoCpus: options.nanoCpus ?? Math.round(parseFloatEnv(process.env.SKILL_DOCKER_CPUS, 1) * 1e9),
            pidsLimit: options.pidsLimit ?? parseIntEnv(process.env.SKILL_DOCKER_PIDS_LIMIT, DEFAULT_PIDS_LIMIT),
            commandTimeoutMs: options.commandTimeoutMs ?? parseIntEnv(process.env.SKILL_EXEC_TIMEOUT_MS, DEFAULT_COMMAND_TIMEOUT_MS),
            maxOutputBytes: options.maxOutputBytes ?? parseIntEnv(process.env.SKILL_MAX_OUTPUT_BYTES, DEFAULT_MAX_OUTPUT_BYTES),
            idleMs: options.idleMs ?? parseIntEnv(process.env.SKILL_V2_SANDBOX_IDLE_MS, DEFAULT_IDLE_MS),
            lifetimeMs: options.lifetimeMs ?? parseIntEnv(process.env.SKILL_V2_SANDBOX_LIFETIME_MS, DEFAULT_LIFETIME_MS),
            cwd: options.cwd ?? '/home/user'
        }
        this.client = options.client ?? new DockerClient()
        // Stable id used for tracing. Mutated to include the real container id
        // once initialize() succeeds.
        this.id = `docker-${crypto.randomBytes(4).toString('hex')}`
        installExitHook(this.client)
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
            throw new SandboxError(`DockerBackend is closed (${this.closeReason ?? 'unknown reason'})`, 'NOT_INITIALIZED')
        }
        if (this.startPromise) return this.startPromise
        this.state = 'starting'
        this.startPromise = this.boot().finally(() => {
            this.startPromise = null
        })
        return this.startPromise
    }

    async close(): Promise<void> {
        return this.mutex.runExclusive(async () => {
            if (this.state === 'closed') return
            this.state = 'closed'
            this.closeReason = this.closeReason ?? 'explicit close'
            this.clearTimers()
            const c = this.container
            this.container = null
            if (c) {
                try {
                    await c.remove({ force: true, v: true })
                } catch {
                    // best-effort — the daemon also reaps abandoned containers.
                }
            }
        })
    }

    /**
     * Best-effort image-presence probe — logs a warning when the image
     * is missing so contributors find out at boot rather than on first
     * chatflow turn. Never throws.
     */
    async warnIfImageMissing(): Promise<void> {
        try {
            const present = await this.client.isImagePresent(this.opts.image)
            if (!present) {
                console.warn(
                    `[Skill sandbox] Docker image ${this.opts.image} is not present. Run scripts/build-skill-sandbox.sh to build it.`
                )
            }
        } catch {
            // The probe is informational; silent failure is fine.
        }
    }

    // -----------------------------------------------------------------------
    // SandboxBackendProtocol
    // -----------------------------------------------------------------------

    async execute(command: string): Promise<ExecuteResponse> {
        return this.mutex.runExclusive(async () => {
            if (this.state === 'closed') {
                return this.closedEnvelope()
            }
            const container = await this.requireContainer()
            try {
                this.resetIdleTimer()

                // Wrap the LLM-supplied command in `/usr/bin/timeout` so it
                // self-terminates inside the container with exit code 124
                // when it exceeds the budget. This keeps the container
                // alive for subsequent commands, which is critical for
                // agent UX: one slow `python3 …` would otherwise kill the
                // whole sandbox and every follow-up call surfaces the
                // closed envelope. See `docs/docker_sandbox_plan.md` §6.4.
                //
                // The host-side timer in `runExec` remains as a hard
                // safety net at `commandTimeoutMs + HOST_SAFETY_MARGIN_MS`,
                // so a wedged `timeout(1)` (e.g. process stuck in
                // uninterruptible kernel sleep) is still bounded.
                const timeoutSeconds = Math.max(1, Math.ceil(this.opts.commandTimeoutMs / 1000))
                const wrappedCmd = [
                    '/usr/bin/timeout',
                    '--foreground',
                    '-s',
                    'TERM',
                    '-k',
                    '2',
                    String(timeoutSeconds),
                    'bash',
                    '-lc',
                    command
                ]

                const result = await container.exec(wrappedCmd, {
                    user: '1000:1000',
                    workingDir: this.opts.cwd,
                    timeoutMs: this.opts.commandTimeoutMs + HOST_SAFETY_MARGIN_MS
                })

                if (result.timedOut) {
                    // The host-side safety net fired — `timeout(1)` did
                    // NOT terminate the command. The container was just
                    // hard-killed. Mark the backend dead so subsequent
                    // calls surface the closed envelope rather than
                    // silently rebooting a fresh VM behind the LLM's back.
                    this.state = 'closed'
                    this.closeReason = 'command_hard_timeout'
                    this.clearTimers()
                    this.container = null
                    const stderrText = result.stderr.length
                        ? result.stderr.toString('utf8')
                        : `command did not terminate within ${this.opts.commandTimeoutMs}ms (sandbox closed)`
                    return this.toExecuteResponse(result.stdout.toString('utf8'), stderrText, null)
                }

                // Soft timeout: `timeout(1)` killed the inner bash with
                // exit 124 (SIGTERM-on-budget) or 137 (escalated to
                // SIGKILL after the `-k 2` grace window). The container
                // is alive and reusable — surface a clear trailer so the
                // LLM knows it can retry with a faster / smaller command.
                const exit = result.exitCode
                if (exit === 124 || exit === 137) {
                    const reason = exit === 124 ? 'SIGTERM after budget' : 'SIGKILL after grace window'
                    const stderrText = result.stderr.toString('utf8')
                    const trailer = `[Command exceeded the ${this.opts.commandTimeoutMs}ms sandbox timeout (${reason}); the sandbox is still alive — retry with a shorter command or break the work into steps.]`
                    const stderrWithTrailer = stderrText ? `${stderrText}\n${trailer}` : trailer
                    return this.toExecuteResponse(result.stdout.toString('utf8'), stderrWithTrailer, exit)
                }

                return this.toExecuteResponse(result.stdout.toString('utf8'), result.stderr.toString('utf8'), exit)
            } catch (err) {
                // Host-side failure (daemon connection, dockerode internal).
                // Per architecture spec §3.1 rule 2, never throw to the
                // tool layer — surface as exitCode=null with the message.
                const message = (err as Error)?.message ?? String(err)
                return this.toExecuteResponse('', message, null)
            }
        })
    }

    // -----------------------------------------------------------------------
    // SandboxFileTransfer
    // -----------------------------------------------------------------------

    async uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
        if (!files.length) return []
        return this.mutex.runExclusive(async () => {
            if (this.state === 'closed') {
                return files.map(([path]) => ({ path, error: 'io_error' as const, message: this.closeReason ?? 'closed' }))
            }
            const container = await this.requireContainer()
            this.resetIdleTimer()
            return container.putFiles(files)
        })
    }

    async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
        if (!paths.length) return []
        return this.mutex.runExclusive(async () => {
            if (this.state === 'closed') {
                return paths.map((p) => ({ path: p, content: null, error: 'io_error' as const, message: this.closeReason ?? 'closed' }))
            }
            const container = await this.requireContainer()
            this.resetIdleTimer()
            return container.getFiles(paths)
        })
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private async boot(): Promise<void> {
        try {
            await this.client.ensureImage(this.opts.image)
            const container = await this.client.createContainer(this.buildCreateOpts())
            await container.start()
            this.container = container
            ;(this as { id: string }).id = `docker-${container.id.slice(0, 12)}`
            this.armLifetimeTimer()
            this.resetIdleTimer()
            this.state = 'ready'
        } catch (err) {
            this.state = 'idle'
            this.container = null
            if (err instanceof SandboxError) throw err
            const message = (err as Error)?.message ?? String(err)
            throw new SandboxError(`DockerBackend.initialize failed: ${message}`, 'COMMAND_FAILED', err as Error)
        }
    }

    private buildCreateOpts(): ContainerCreateOptions {
        return {
            Image: this.opts.image,
            name: `flowise-skill-${this.id.replace(/^docker-/, '')}`,
            Labels: {
                'flowise.skill_sandbox': 'true',
                'flowise.backend_id': this.id
            },
            User: '1000:1000',
            WorkingDir: this.opts.cwd,
            Cmd: ['/usr/local/bin/skill-entrypoint.sh'],
            Env: [],
            HostConfig: {
                AutoRemove: false,
                NetworkMode: this.opts.networkMode,
                Memory: this.opts.memoryBytes,
                NanoCpus: this.opts.nanoCpus,
                PidsLimit: this.opts.pidsLimit,
                ReadonlyRootfs: true,
                Tmpfs: {
                    '/tmp': 'rw,size=64m,mode=1777'
                },
                Mounts: [
                    {
                        // Anonymous volume — empty Source tells the daemon
                        // to provision a fresh one, which is reclaimed
                        // when the container is removed with `v: true`.
                        Type: 'volume',
                        Source: '',
                        Target: '/home/user',
                        ReadOnly: false
                    }
                ],
                CapDrop: ['ALL'],
                SecurityOpt: ['no-new-privileges:true']
                // seccomp: default profile (do not disable).
            }
        } as ContainerCreateOptions
    }

    private async requireContainer(): Promise<ContainerLike> {
        if (this.state === 'closed') {
            throw new SandboxError(`DockerBackend is closed (${this.closeReason ?? 'unknown reason'})`, 'NOT_INITIALIZED')
        }
        if (this.state !== 'ready') {
            // initialize() owns its own state machine — kick it off,
            // re-enter once it lands. The mutex prevents reentry races.
            await this.initialize()
        }
        if (!this.container) {
            throw new SandboxError('DockerBackend has no active container after initialize()', 'NOT_INITIALIZED')
        }
        return this.container
    }

    private armLifetimeTimer(): void {
        this.clearLifetimeTimer()
        this.lifetimeTimer = setTimeout(() => {
            this.closeReason = this.closeReason ?? 'lifetime_exceeded'
            this.close().catch(() => undefined)
        }, this.opts.lifetimeMs)
        this.lifetimeTimer.unref?.()
    }

    private resetIdleTimer(): void {
        this.clearIdleTimer()
        this.idleTimer = setTimeout(() => {
            this.closeReason = this.closeReason ?? 'idle_timeout'
            this.close().catch(() => undefined)
        }, this.opts.idleMs)
        this.idleTimer.unref?.()
    }

    private clearTimers(): void {
        this.clearIdleTimer()
        this.clearLifetimeTimer()
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = null
        }
    }

    private clearLifetimeTimer(): void {
        if (this.lifetimeTimer) {
            clearTimeout(this.lifetimeTimer)
            this.lifetimeTimer = null
        }
    }

    private toExecuteResponse(stdout: string, stderr: string, exitCode: number | null): ExecuteResponse {
        const combinedRaw = stderr ? (stdout ? `${stdout}\n${stderr}` : stderr) : stdout
        const { text, truncated } = clampWithFlag(combinedRaw, this.opts.maxOutputBytes)
        return { output: text, exitCode, truncated }
    }

    private closedEnvelope(): ExecuteResponse {
        return {
            output: `DockerBackend is closed (${this.closeReason ?? 'unknown reason'})`,
            exitCode: null,
            truncated: false
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clampWithFlag = (s: string, max: number): { text: string; truncated: boolean } => {
    if (s.length <= max) return { text: s, truncated: false }
    return { text: s.slice(0, max), truncated: true }
}
