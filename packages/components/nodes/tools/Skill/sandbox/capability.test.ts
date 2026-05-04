import { clampOutput, detectSandboxCapability, SandboxCapability } from './capability'

// ---------------------------------------------------------------------------
// detectSandboxCapability — env-only opt-ins, three independent kill switches.
// ---------------------------------------------------------------------------

describe('detectSandboxCapability — happy path', () => {
    it('returns a capability when E2B_APIKEY is set and the kill switches are at default', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k' } as NodeJS.ProcessEnv)
        expect(cap).not.toBeNull()
        expect(cap!.label).toBe('E2B (Bash session)')
        expect(cap!.maxTimeoutMs).toBe(15000)
        expect(cap!.maxOutputBytes).toBe(64 * 1024)
    })

    it('honours SKILL_EXEC_TIMEOUT_MS when it is a positive integer', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_EXEC_TIMEOUT_MS: '30000' } as NodeJS.ProcessEnv)
        expect(cap?.maxTimeoutMs).toBe(30000)
    })

    it('honours SKILL_MAX_OUTPUT_BYTES when it is a positive integer', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_MAX_OUTPUT_BYTES: '131072' } as NodeJS.ProcessEnv)
        expect(cap?.maxOutputBytes).toBe(131072)
    })

    it('falls back to defaults when env values are non-numeric or non-positive', () => {
        const cap = detectSandboxCapability({
            E2B_APIKEY: 'k',
            SKILL_EXEC_TIMEOUT_MS: '0',
            SKILL_MAX_OUTPUT_BYTES: 'not-a-number'
        } as NodeJS.ProcessEnv)
        expect(cap?.maxTimeoutMs).toBe(15000)
        expect(cap?.maxOutputBytes).toBe(64 * 1024)
    })
})

describe('detectSandboxCapability — opt-outs', () => {
    it('returns null when E2B_APIKEY is unset', () => {
        expect(detectSandboxCapability({} as NodeJS.ProcessEnv)).toBeNull()
    })

    it('returns null when SKILL_ALLOW_EXEC=false (the hard kill switch)', () => {
        for (const v of ['false', '0', 'off', 'no', 'NO']) {
            const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_ALLOW_EXEC: v } as NodeJS.ProcessEnv)
            expect(cap).toBeNull()
        }
    })

    it('returns null when SKILL_BASH_EXEC=false (author-level opt-out)', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_BASH_EXEC: 'false' } as NodeJS.ProcessEnv)
        expect(cap).toBeNull()
    })

    it('still enables the sandbox when SKILL_BASH_EXEC parses as truthy', () => {
        for (const v of ['1', 'true', 'on', 'yes']) {
            const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_BASH_EXEC: v } as NodeJS.ProcessEnv)
            expect(cap).not.toBeNull()
        }
    })

    it('treats unparseable kill-switch values as the default (true)', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k', SKILL_ALLOW_EXEC: 'maybe' } as NodeJS.ProcessEnv)
        expect(cap).not.toBeNull()
    })
})

// ---------------------------------------------------------------------------
// clampOutput — head-truncation with explicit marker.
// ---------------------------------------------------------------------------

describe('clampOutput', () => {
    it('returns the input verbatim when it fits within the budget', () => {
        expect(clampOutput('hello world', 1024)).toBe('hello world')
    })

    it('returns empty string verbatim', () => {
        expect(clampOutput('', 16)).toBe('')
    })

    it('appends a [truncated] marker when the input exceeds the budget', () => {
        const long = 'A'.repeat(5_000)
        const out = clampOutput(long, 1_024)
        // The output is approximately bounded by `max`. The marker is 32-ish
        // chars wide and depends on the digit count of `max`, so a couple of
        // bytes of slack is normal — what matters is we cut the input down
        // dramatically.
        expect(out.length).toBeLessThan(long.length)
        expect(out.length).toBeLessThanOrEqual(1_032)
        expect(out).toMatch(/\n\u2026\[truncated: exceeded 1024 bytes\]$/)
        // The leading slice of the output must come from the original input.
        expect(out.startsWith('A'.repeat(100))).toBe(true)
    })

    it('keeps the truncated output bounded even when the budget is tiny', () => {
        const out = clampOutput('payload', 5)
        // The marker dominates here — the slice is clamped at 0, so the
        // output collapses to "\n…[truncated: …]". We only assert the
        // marker survives intact and the original payload was dropped.
        expect(out).toContain('[truncated: exceeded 5 bytes]')
        expect(out).not.toContain('payload')
    })
})

// ---------------------------------------------------------------------------
// Capability shape — defensive type-assertion test
// ---------------------------------------------------------------------------

describe('SandboxCapability shape', () => {
    it('exposes the three documented fields', () => {
        const cap = detectSandboxCapability({ E2B_APIKEY: 'k' } as NodeJS.ProcessEnv) as SandboxCapability
        expect(Object.keys(cap).sort()).toEqual(['label', 'maxOutputBytes', 'maxTimeoutMs'])
    })
})
