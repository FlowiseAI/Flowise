/**
 * Skill — sandbox capability detection.
 *
 * Two execution modes for a published Skill:
 *
 *   1. **Sandbox shell** — when `E2B_APIKEY` is set and `SKILL_ALLOW_EXEC`
 *      is truthy (both default on), the Skill node registers a single
 *      `bash_<SkillName>` tool backed by an E2B VM. The LLM issues free-form
 *      shell commands against materialised skill files.
 *
 *   2. **Fallback / read-only** — no E2B key, or the kill-switch is flipped
 *      off. Only the per-file `SkillFileTool` instances are registered; the
 *      LLM sees the compiled markdown and acts on it without code execution.
 *
 * Detection is cheap and synchronous: env-only, no network probes. Runtime
 * failures (expired API key, connectivity hiccups) surface later through
 * the session's `exec()` envelope instead of blocking init.
 */

export interface SandboxCapability {
    /** Human-readable label surfaced in logs and tool descriptions. */
    label: string
    /** Absolute ceiling for per-call `bash` timeout (ms). */
    maxTimeoutMs: number
    /** Absolute ceiling for captured stdout and stderr each (bytes). */
    maxOutputBytes: number
}

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

/**
 * Return a `SandboxCapability` when the current environment can host a
 * bash session, or `null` when the Skill node should run in fallback
 * (read-only) mode.
 *
 * Opt-outs:
 *   - `SKILL_ALLOW_EXEC=false` — hard kill switch; always `null`.
 *   - No `E2B_APIKEY` — no shell backend, always `null`.
 *   - `SKILL_BASH_EXEC=false` — author explicitly disables the shell;
 *     equivalent to falling back to read-only mode.
 */
export const detectSandboxCapability = (env: NodeJS.ProcessEnv = process.env): SandboxCapability | null => {
    if (!parseBool(env.SKILL_ALLOW_EXEC, true)) return null
    if (!env.E2B_APIKEY) return null
    if (!parseBool(env.SKILL_BASH_EXEC, true)) return null

    return {
        label: 'E2B (Bash session)',
        maxTimeoutMs: parseIntEnv(env.SKILL_EXEC_TIMEOUT_MS, 15000),
        maxOutputBytes: parseIntEnv(env.SKILL_MAX_OUTPUT_BYTES, 64 * 1024)
    }
}

/** Truncate output buffer to the capability's ceiling with a `[truncated]` marker. */
export const clampOutput = (s: string, max: number): string => {
    if (s.length <= max) return s
    return `${s.slice(0, Math.max(0, max - 32))}\n…[truncated: exceeded ${max} bytes]`
}
