// Mock the E2B SDK so we never try to reach the network during resolver tests.
jest.mock('@e2b/code-interpreter', () => ({
    Sandbox: { create: jest.fn() }
}))

// Mock dockerode at the module level so `new DockerClient()` (instantiated
// inside the resolver) never tries to talk to a real daemon.
jest.mock('dockerode', () => {
    return jest.fn().mockImplementation(() => ({
        getImage: () => ({ inspect: async () => ({}) }),
        listContainers: async () => [],
        createContainer: async () => ({ id: 'x', start: async () => undefined, remove: async () => undefined })
    }))
})

import { resolveBackend, __resetResolverWarnings } from './resolveBackend'

describe('resolveBackend — env routing', () => {
    beforeEach(() => {
        __resetResolverWarnings()
    })

    it('returns null backend when SKILL_ALLOW_EXEC is false', () => {
        const r = resolveBackend({ E2B_APIKEY: 'k', SKILL_ALLOW_EXEC: 'false' } as NodeJS.ProcessEnv)
        expect(r.backend).toBeNull()
        expect(r.capability).toBeNull()
    })

    it('returns null backend when SKILL_BASH_EXEC is false', () => {
        const r = resolveBackend({ E2B_APIKEY: 'k', SKILL_BASH_EXEC: 'false' } as NodeJS.ProcessEnv)
        expect(r.backend).toBeNull()
    })

    it('auto-selects E2B when E2B_APIKEY is set', () => {
        const r = resolveBackend({ E2B_APIKEY: 'k' } as NodeJS.ProcessEnv)
        expect(r.backend).not.toBeNull()
        expect(r.capability?.label).toBe('E2B (Bash session)')
        expect(r.capability?.backendId).toContain('e2b-')
    })

    it('returns null when SKILL_SANDBOX_BACKEND=e2b but E2B_APIKEY is missing', () => {
        const r = resolveBackend({ SKILL_SANDBOX_BACKEND: 'e2b' } as NodeJS.ProcessEnv)
        expect(r.backend).toBeNull()
    })

    it('selects DockerBackend when SKILL_SANDBOX_BACKEND=docker (DOCKER_HOST hint)', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const r = resolveBackend({
                SKILL_SANDBOX_BACKEND: 'docker',
                DOCKER_HOST: 'unix:///var/run/docker.sock'
            } as NodeJS.ProcessEnv)
            expect(r.backend).not.toBeNull()
            expect(r.capability?.label).toBe('Docker (local container)')
            expect(r.capability?.backendId).toContain('docker-')
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('DockerBackend enabled'))
        } finally {
            warn.mockRestore()
        }
    })

    it('auto-selects DockerBackend when no E2B key is set and DOCKER_HOST is reachable', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const r = resolveBackend({ DOCKER_HOST: 'unix:///var/run/docker.sock' } as NodeJS.ProcessEnv)
            expect(r.backend).not.toBeNull()
            expect(r.capability?.label).toBe('Docker (local container)')
        } finally {
            warn.mockRestore()
        }
    })

    it('treats an unrecognised SKILL_SANDBOX_BACKEND value as auto-select, with no special case for "local"', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            // `local` and any other unrecognised value should follow the
            // SAME auto-select path. Setting E2B_APIKEY forces a
            // deterministic auto-select target so this test passes
            // regardless of whether the host running it happens to have
            // a Docker daemon installed.
            const local = resolveBackend({
                E2B_APIKEY: 'k',
                SKILL_SANDBOX_BACKEND: 'local'
            } as NodeJS.ProcessEnv)
            const typo = resolveBackend({
                E2B_APIKEY: 'k',
                SKILL_SANDBOX_BACKEND: 'dockre'
            } as NodeJS.ProcessEnv)
            const unset = resolveBackend({ E2B_APIKEY: 'k' } as NodeJS.ProcessEnv)

            // All three end up at the same backend (E2B in this case).
            expect(local.capability?.label).toBe(unset.capability?.label)
            expect(typo.capability?.label).toBe(unset.capability?.label)
            expect(local.capability?.label).toBe('E2B (Bash session)')

            // Crucially, no warning about `local` being deprecated. The
            // value is just treated as unrecognised, full stop.
            const deprecationWarnings = warn.mock.calls.filter((args) => /deprecat|no longer supported|legacy/i.test(String(args[0])))
            expect(deprecationWarnings).toHaveLength(0)
        } finally {
            warn.mockRestore()
        }
    })

    it('honours SKILL_EXEC_TIMEOUT_MS and SKILL_MAX_OUTPUT_BYTES', () => {
        const r = resolveBackend({
            E2B_APIKEY: 'k',
            SKILL_EXEC_TIMEOUT_MS: '30000',
            SKILL_MAX_OUTPUT_BYTES: '131072'
        } as NodeJS.ProcessEnv)
        expect(r.capability?.maxTimeoutMs).toBe(30000)
        expect(r.capability?.maxOutputBytes).toBe(131072)
    })

    it('falls back to defaults when env values are non-numeric or non-positive', () => {
        // E2B branch keeps its historical 15s default.
        const e2b = resolveBackend({
            E2B_APIKEY: 'k',
            SKILL_EXEC_TIMEOUT_MS: '0',
            SKILL_MAX_OUTPUT_BYTES: 'not-a-number'
        } as NodeJS.ProcessEnv)
        expect(e2b.capability?.maxTimeoutMs).toBe(15000)
        expect(e2b.capability?.maxOutputBytes).toBe(64 * 1024)
    })

    it('Docker capability default timeout matches DockerBackend.DEFAULT_COMMAND_TIMEOUT_MS (30s)', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const r = resolveBackend({
                SKILL_SANDBOX_BACKEND: 'docker',
                DOCKER_HOST: 'unix:///var/run/docker.sock'
            } as NodeJS.ProcessEnv)
            // The session-level clamp MUST agree with the backend's
            // in-container `timeout(1)` budget — see comment in
            // resolveBackend.ts. If this assertion fails, double-check
            // that the docker branch default and DockerBackend's default
            // are still in sync.
            expect(r.capability?.maxTimeoutMs).toBe(30_000)
        } finally {
            warn.mockRestore()
        }
    })
})
