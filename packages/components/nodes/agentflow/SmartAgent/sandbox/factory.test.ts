import { sanitizeSegment, buildScopeSegments, createBackend, getBuiltinSkillsBackend } from './factory'
import { LocalBackend } from './backends/LocalBackend'
import { StateBackend } from './backends/StateBackend'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

describe('sanitizeSegment', () => {
    it('passes UUIDs through unchanged', () => {
        expect(sanitizeSegment('a3f4c1e2-0000-4abc-8def-123456789abc')).toBe('a3f4c1e2-0000-4abc-8def-123456789abc')
    })

    it('replaces slashes, backslashes, dots, and spaces with underscore', () => {
        expect(sanitizeSegment('a/b\\c..d e')).toBe('a_b_c__d_e')
    })

    it('replaces control characters with underscore', () => {
        expect(sanitizeSegment('foo\x00bar')).toBe('foo_bar')
    })

    it('truncates output to 64 characters', () => {
        const longInput = 'a'.repeat(200)
        expect(sanitizeSegment(longInput)).toHaveLength(64)
    })

    it('returns "_" when input sanitizes to empty', () => {
        expect(sanitizeSegment('////')).toBe('____')
        expect(sanitizeSegment('')).toBe('_')
    })
})

describe('buildScopeSegments', () => {
    it('returns sanitized segments in order [org, flow, chat]', () => {
        const segments = buildScopeSegments({
            orgId: 'org-123',
            chatflowid: 'flow-abc',
            chatId: 'chat-xyz'
        })
        expect(segments).toEqual(['org-123', 'flow-abc', 'chat-xyz'])
    })

    it('uses _no_org when orgId is missing', () => {
        const [orgSeg] = buildScopeSegments({ chatflowid: 'flow-abc', chatId: 'chat-xyz' })
        expect(orgSeg).toBe('_no_org')
    })

    it('uses _no_flow when chatflowid is missing', () => {
        const [, flowSeg] = buildScopeSegments({ orgId: 'org-123', chatId: 'chat-xyz' })
        expect(flowSeg).toBe('_no_flow')
    })

    it('uses a unique random _ephemeral_* segment when chatId is missing', () => {
        const [, , chatSeg1] = buildScopeSegments({ orgId: 'org-123', chatflowid: 'flow-abc' })
        const [, , chatSeg2] = buildScopeSegments({ orgId: 'org-123', chatflowid: 'flow-abc' })
        expect(chatSeg1).toMatch(/^_ephemeral_[a-f0-9]{16}$/)
        expect(chatSeg2).toMatch(/^_ephemeral_[a-f0-9]{16}$/)
        expect(chatSeg1).not.toBe(chatSeg2)
    })

    it('returns all three fallbacks when scope is undefined', () => {
        const [orgSeg, flowSeg, chatSeg] = buildScopeSegments(undefined)
        expect(orgSeg).toBe('_no_org')
        expect(flowSeg).toBe('_no_flow')
        expect(chatSeg).toMatch(/^_ephemeral_[a-f0-9]{16}$/)
    })

    it('sanitizes unsafe characters in provided IDs', () => {
        const segments = buildScopeSegments({
            orgId: 'org/with/slashes',
            chatflowid: 'flow..traversal',
            chatId: 'chat with spaces'
        })
        expect(segments).toEqual(['org_with_slashes', 'flow__traversal', 'chat_with_spaces'])
    })
})

describe('createBackend — dispatch', () => {
    const originalSandboxType = process.env.SANDBOX_TYPE
    const originalLocalPath = process.env.SANDBOX_LOCAL_PATH
    const tmpRoots: string[] = []

    afterEach(() => {
        process.env.SANDBOX_TYPE = originalSandboxType
        process.env.SANDBOX_LOCAL_PATH = originalLocalPath
    })

    afterAll(() => {
        for (const root of tmpRoots) rmSync(root, { recursive: true, force: true })
        tmpRoots.length = 0
    })

    it('returns a StateBackend when SANDBOX_TYPE=state, ignoring scope', async () => {
        process.env.SANDBOX_TYPE = 'state'
        const backend = await createBackend(undefined, { orgId: 'o', chatflowid: 'f', chatId: 'c' })
        expect(backend).toBeInstanceOf(StateBackend)
    })

    it('returns a LocalBackend rooted under <SANDBOX_LOCAL_PATH>/<scope> when SANDBOX_TYPE=local', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flowise-factory-'))
        tmpRoots.push(tmp)
        process.env.SANDBOX_TYPE = 'local'
        process.env.SANDBOX_LOCAL_PATH = tmp

        const backend = (await createBackend(undefined, {
            orgId: 'org-1',
            chatflowid: 'flow-2',
            chatId: 'chat-3'
        })) as LocalBackend

        expect(backend).toBeInstanceOf(LocalBackend)
        const root = (backend as unknown as { root: string }).root
        expect(root).toBe(resolve(tmp, 'org-1', 'flow-2', 'chat-3'))
        expect(existsSync(root)).toBe(true)
    })

    it('falls back to ~/.flowise/sandbox when SANDBOX_LOCAL_PATH is unset', async () => {
        process.env.SANDBOX_TYPE = 'local'
        delete process.env.SANDBOX_LOCAL_PATH

        // Use a unique scope so we don't collide with real ~/.flowise/sandbox content
        // and can clean up the exact branch we created.
        const uniq = randomBytes(4).toString('hex')
        const orgId = `test-org-${uniq}`
        const backend = (await createBackend(undefined, {
            orgId,
            chatflowid: `test-flow-${uniq}`,
            chatId: `test-chat-${uniq}`
        })) as LocalBackend

        const root = (backend as unknown as { root: string }).root
        expect(root).toBe(resolve(homedir(), '.flowise', 'sandbox', orgId, `test-flow-${uniq}`, `test-chat-${uniq}`))
        tmpRoots.push(resolve(homedir(), '.flowise', 'sandbox', orgId))
    })

    it('builds scoped path with fallback segments when scope is omitted', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flowise-factory-'))
        tmpRoots.push(tmp)
        process.env.SANDBOX_TYPE = 'local'
        process.env.SANDBOX_LOCAL_PATH = tmp

        const backend = (await createBackend()) as LocalBackend
        const root = (backend as unknown as { root: string }).root

        // Strip the tmp prefix and split into segments, regardless of OS path separator.
        const remainder = root.slice(tmp.length).split(/[/\\]/).filter(Boolean)
        expect(remainder).toHaveLength(3)
        expect(remainder[0]).toBe('_no_org')
        expect(remainder[1]).toBe('_no_flow')
        expect(remainder[2]).toMatch(/^_ephemeral_[a-f0-9]{16}$/)
    })

    it('throws on unknown SANDBOX_TYPE', async () => {
        process.env.SANDBOX_TYPE = 'definitely-not-a-real-mode'
        await expect(createBackend()).rejects.toThrow(/Unknown SANDBOX_TYPE/)
    })
})

describe('createBackend — isolation', () => {
    const originalSandboxType = process.env.SANDBOX_TYPE
    const originalLocalPath = process.env.SANDBOX_LOCAL_PATH
    const tmpRoots: string[] = []

    afterEach(() => {
        process.env.SANDBOX_TYPE = originalSandboxType
        process.env.SANDBOX_LOCAL_PATH = originalLocalPath
    })

    afterAll(() => {
        for (const root of tmpRoots) rmSync(root, { recursive: true, force: true })
        tmpRoots.length = 0
    })

    it('two backends with different chatIds cannot read each other files', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flowise-isolation-'))
        tmpRoots.push(tmp)
        process.env.SANDBOX_TYPE = 'local'
        process.env.SANDBOX_LOCAL_PATH = tmp

        const a = await createBackend(undefined, { orgId: 'o', chatflowid: 'f', chatId: 'chat-A' })
        const b = await createBackend(undefined, { orgId: 'o', chatflowid: 'f', chatId: 'chat-B' })

        const writeResult = await a.write('/workspace/secret.txt', 'only for chat A')
        expect('path' in writeResult).toBe(true)

        const readFromB = await b.read('/workspace/secret.txt')
        expect('error' in readFromB).toBe(true)
    })

    it('two backends with the same scope share files (same chat across messages)', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flowise-isolation-'))
        tmpRoots.push(tmp)
        process.env.SANDBOX_TYPE = 'local'
        process.env.SANDBOX_LOCAL_PATH = tmp

        const scope = { orgId: 'o', chatflowid: 'f', chatId: 'chat-shared' }
        const first = await createBackend(undefined, scope)
        await first.write('/workspace/shared.txt', 'persisted across messages')

        const second = await createBackend(undefined, scope)
        const readBack = await second.read('/workspace/shared.txt')
        expect('content' in readBack).toBe(true)
        if ('content' in readBack) expect(readBack.content).toBe('persisted across messages')
    })
})

describe('createBackend with SANDBOX_TYPE=composite', () => {
    afterEach(() => {
        // Reset to unset so we don't leak SANDBOX_TYPE into other suites.
        // Avoid `process.env.SANDBOX_TYPE = undefined` — that stores the literal string "undefined".
        delete process.env.SANDBOX_TYPE
    })

    it('returns a working backend with empty routes (default behaves like StateBackend)', async () => {
        process.env.SANDBOX_TYPE = 'composite'
        const backend = await createBackend()
        const writeResult = await backend.write('/workspace/notes.md', 'hello')
        expect('path' in writeResult && writeResult.path).toBe('/workspace/notes.md')
        const readResult = await backend.read('/workspace/notes.md')
        expect('content' in readResult && readResult.content).toBe('hello')
    })

    it('seeds the default StateBackend from initialFiles', async () => {
        process.env.SANDBOX_TYPE = 'composite'
        const initial = {
            '/workspace/seed.md': { content: 'seeded', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        }
        const backend = await createBackend(initial)
        const result = await backend.read('/workspace/seed.md')
        expect('content' in result && result.content).toBe('seeded')
    })
})

describe('getBuiltinSkillsBackend', () => {
    it('lists the shipped built-in skill folders', async () => {
        const b = getBuiltinSkillsBackend()
        const result = await b.ls('/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const names = result.files.map((f) => f.name).sort()
            expect(names).toEqual(expect.arrayContaining(['code-review', 'todo-extract', 'web-research']))
        }
    })

    it('reads SKILL.md content from a built-in skill', async () => {
        const b = getBuiltinSkillsBackend()
        const result = await b.read('/web-research/SKILL.md')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toMatch(/name:\s*web-research/)
        }
    })

    it('rejects writes (read-only)', async () => {
        const b = getBuiltinSkillsBackend()
        const result = await b.write('/poisoned.md', 'x')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/read[- ]?only/i)
    })
})
