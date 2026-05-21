/**
 * Skill — sandbox capability shim.
 *
 * The architecture-canonical capability detection now lives in
 * `flowise-components/src/sandbox/resolveBackend.ts` together with the
 * pluggable backend selection. This file is kept as a thin shim so
 * existing imports (`detectSandboxCapability`, `SandboxCapability`,
 * `clampOutput`) keep compiling while callers migrate.
 *
 * Two execution modes for a published Skill (unchanged from the legacy
 * design):
 *
 *   1. **Sandbox shell** — when the resolver returns a backend, the
 *      Skill node registers the new `execute` tool (formerly
 *      `bash_<SkillName>`) backed by the resolved sandbox.
 *
 *   2. **Fallback / read-only** — no backend. Only the per-file
 *      `SkillFileTool` instances are registered.
 */

import { resolveBackend } from '../../../../src/sandbox'

export interface SandboxCapability {
    /** Human-readable label surfaced in logs and tool descriptions. */
    label: string
    /** Absolute ceiling for per-call execute timeout (ms). */
    maxTimeoutMs: number
    /** Absolute ceiling for captured stdout and stderr each (bytes). */
    maxOutputBytes: number
}

/**
 * Return a `SandboxCapability` when the resolved backend supports
 * execution, or `null` otherwise. The actual backend instance is
 * constructed and returned by `resolveBackend(env)`; this shim drops
 * the backend pointer and projects only the LLM-facing limits, mirroring
 * the legacy contract for the manifest + recipe code that still consumes
 * `SandboxCapability` directly.
 */
export const detectSandboxCapability = (env: NodeJS.ProcessEnv = process.env): SandboxCapability | null => {
    const { capability } = resolveBackend(env)
    if (!capability) return null
    return {
        label: capability.label,
        maxTimeoutMs: capability.maxTimeoutMs,
        maxOutputBytes: capability.maxOutputBytes
    }
}

/** Truncate output buffer to the capability's ceiling with a `[truncated]` marker. */
export const clampOutput = (s: string, max: number): string => {
    if (s.length <= max) return s
    return `${s.slice(0, Math.max(0, max - 32))}\n…[truncated: exceeded ${max} bytes]`
}
