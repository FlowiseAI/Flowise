/**
 * Sandbox — backend resolver (Layer 3 prerequisite).
 *
 * Maps environment variables onto a concrete backend instance plus the
 * `SandboxCapability` shape that the existing Skill manifest / recipe
 * code already consumes. The resolver is the single place that knows
 * about backend selection — every other layer talks to the protocol.
 *
 * Env contract:
 *   - `SKILL_ALLOW_EXEC=false` → never returns a backend (hard kill switch).
 *   - `SKILL_BASH_EXEC=false` → same as above, kept for legacy.
 *   - `SKILL_SANDBOX_BACKEND=e2b` (default when `E2B_APIKEY` is set):
 *       routes to `E2BBackend`.
 *   - `SKILL_SANDBOX_BACKEND=docker` (or auto-selected when the Docker
 *       socket is reachable and `E2B_APIKEY` is unset): routes to
 *       `DockerBackend`. Runs every command in an isolated container —
 *       no host filesystem writes, no host env leakage. See
 *       `docs/docker_sandbox_plan.md`.
 *   - Any other value or missing key → no backend, runtime falls back
 *     to read-only mode.
 */

import { existsSync } from 'node:fs'
import { E2BBackend } from './backends/E2BBackend'
import { DockerBackend } from './backends/DockerBackend'
import { SandboxBackendProtocol, SandboxRuntime } from './types'

// ---------------------------------------------------------------------------
// SandboxCapability — preserved here so consumers (the per-skill manifest,
// the bash tool description, the recipe renderer) get a stable shape
// independent of which backend is chosen.
// ---------------------------------------------------------------------------

export interface SandboxCapability {
    /** Human-readable label surfaced in logs and tool descriptions. */
    label: string
    /** Absolute ceiling for per-call execute timeout (ms). */
    maxTimeoutMs: number
    /** Absolute ceiling for captured combined output (bytes). */
    maxOutputBytes: number
    /** Backend id string — used as a tie-breaker / debug hint by Layer 4. */
    backendId: string
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface ResolveResult {
    backend: SandboxBackendProtocol | null
    runtime: SandboxRuntime | null
    capability: SandboxCapability | null
}

const EMPTY: ResolveResult = { backend: null, runtime: null, capability: null }

const parseBool = (v: string | undefined, fallback: boolean): boolean => {
    if (v === undefined || v === null) return fallback
    const t = String(v).trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(t)) return true
    if (['0', 'false', 'no', 'off'].includes(t)) return false
    return fallback
}

const parseIntEnv = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

const dockerSocketReachable = (env: NodeJS.ProcessEnv): boolean => {
    if (env.DOCKER_HOST) return true
    try {
        return existsSync('/var/run/docker.sock')
    } catch {
        return false
    }
}

const inferBackend = (env: NodeJS.ProcessEnv): 'e2b' | 'docker' | 'none' => {
    const raw = (env.SKILL_SANDBOX_BACKEND || '').trim().toLowerCase()
    if (raw === 'none' || raw === 'off') return 'none'
    if (raw === 'e2b') return 'e2b'
    if (raw === 'docker') return 'docker'
    // Auto-select: prefer E2B when its key is available; else docker if
    // the daemon is reachable; else none. Any unrecognised explicit value
    // falls through to the same auto-select so a typo doesn't silently
    // disable execution when a working default is available.
    if (env.E2B_APIKEY) return 'e2b'
    if (dockerSocketReachable(env)) return 'docker'
    return 'none'
}

let warnedDockerEnabled = false

/**
 * Resolve the runtime backend for a Skill execution. Never throws — a
 * misconfigured env returns `{ backend: null }` so the Skill node falls
 * back to its read-only mode.
 */
export const resolveBackend = (env: NodeJS.ProcessEnv = process.env): ResolveResult => {
    if (!parseBool(env.SKILL_ALLOW_EXEC, true)) return EMPTY
    // Skill-level toggle that maps onto the architecture's "execution
    // off" mode. Kept for backwards compatibility with the legacy
    // `SKILL_BASH_EXEC=false` env knob.
    if (!parseBool(env.SKILL_BASH_EXEC, true)) return EMPTY

    const choice = inferBackend(env)

    if (choice === 'e2b') {
        if (!env.E2B_APIKEY) return EMPTY
        const backend = new E2BBackend({ apiKey: env.E2B_APIKEY })
        return {
            backend,
            runtime: backend,
            capability: {
                label: 'E2B (Bash session)',
                backendId: backend.id,
                maxTimeoutMs: parseIntEnv(env.SKILL_EXEC_TIMEOUT_MS, 15_000),
                maxOutputBytes: parseIntEnv(env.SKILL_MAX_OUTPUT_BYTES, 64 * 1024)
            }
        }
    }

    if (choice === 'docker') {
        const backend = new DockerBackend()
        // Cheap image-presence probe at resolution time so contributors
        // see the warning at boot rather than on first chatflow turn.
        // The probe is best-effort: any failure is swallowed.
        backend.warnIfImageMissing().catch(() => undefined)
        if (!warnedDockerEnabled) {
            warnedDockerEnabled = true
            console.warn(
                '[Skill sandbox] DockerBackend enabled. Every Skill command runs in an isolated container (NetworkMode=none by default).'
            )
        }
        return {
            backend,
            runtime: backend,
            capability: {
                label: 'Docker (local container)',
                backendId: backend.id,
                // Default 30s matches DockerBackend.DEFAULT_COMMAND_TIMEOUT_MS.
                // The session's clamp and the backend's `timeout(1)` budget
                // must agree, otherwise the session aborts BEFORE the
                // in-container timeout fires and the LLM sees a generic
                // host-side timeout instead of the friendlier "sandbox
                // is still alive" trailer.
                maxTimeoutMs: parseIntEnv(env.SKILL_EXEC_TIMEOUT_MS, 30_000),
                maxOutputBytes: parseIntEnv(env.SKILL_MAX_OUTPUT_BYTES, 64 * 1024)
            }
        }
    }

    return EMPTY
}

/** Reset the once-per-process warning state. Test-only. */
export const __resetResolverWarnings = (): void => {
    warnedDockerEnabled = false
}
