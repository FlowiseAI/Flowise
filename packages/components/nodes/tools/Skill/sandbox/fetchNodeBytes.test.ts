// =============================================================================
// Mock the storage primitive so the test stays I/O-free. Skill assets live
// under `skills/{workspaceId}/{skillId}/nodes/{nodeId}.{json|bin}` (see
// docs/skill_architecture.md §3 "Storage Layout").
// =============================================================================

const mockReadBlob = jest.fn<Promise<Buffer | null>, string[]>()

jest.mock('../../../../src/storageUtils', () => ({
    __esModule: true,
    readBlobFromStorage: (...args: string[]) => mockReadBlob(...args)
}))

// Import after the mock is registered.
import { clearNodeBytesCache, fetchNodeBytes } from './fetchNodeBytes'

beforeEach(() => {
    mockReadBlob.mockReset()
    clearNodeBytesCache()
})

// =============================================================================
// inlineContent — short-circuit before any storage round-trip
// =============================================================================

describe('fetchNodeBytes — inlineContent short-circuit', () => {
    it('returns the inline content as a Buffer without touching storage (skill kind)', async () => {
        const buf = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'resume-screener',
            kind: 'skill',
            digest: 'd-resume',
            inlineContent: '# Resume Screener'
        })
        expect(buf).not.toBeNull()
        expect(buf!.toString('utf8')).toBe('# Resume Screener')
        expect(mockReadBlob).not.toHaveBeenCalled()
    })

    it('honours an explicit empty string as inline content (no storage read)', async () => {
        const buf = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'empty',
            kind: 'skill',
            inlineContent: ''
        })
        expect(buf!.length).toBe(0)
        expect(mockReadBlob).not.toHaveBeenCalled()
    })
})

// =============================================================================
// JSON-backed nodes (skill / code / data) — payload at `nodes/{id}.json`
// =============================================================================

describe('fetchNodeBytes — JSON-backed nodes (data/code/skill)', () => {
    const payload = (content: unknown) => Buffer.from(JSON.stringify({ content }), 'utf8')

    it('reads `nodes/{nodeId}.json#content` and returns its bytes for code kind', async () => {
        mockReadBlob.mockResolvedValueOnce(payload('console.log("scorer")'))

        const buf = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'score',
            kind: 'code'
        })
        expect(buf!.toString('utf8')).toBe('console.log("scorer")')
        expect(mockReadBlob).toHaveBeenCalledWith('skills', 'ws-1', 'skill-1', 'nodes', 'score.json')
    })

    it('returns null when the JSON payload is missing from storage', async () => {
        mockReadBlob.mockResolvedValueOnce(null)
        const buf = await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'gone', kind: 'data' })
        expect(buf).toBeNull()
    })

    it('returns null when the JSON payload is malformed', async () => {
        mockReadBlob.mockResolvedValueOnce(Buffer.from('not-json', 'utf8'))
        const buf = await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'broken', kind: 'data' })
        expect(buf).toBeNull()
    })

    it('returns null when the JSON payload is missing a string `content` field', async () => {
        mockReadBlob.mockResolvedValueOnce(Buffer.from(JSON.stringify({ content: 42 }), 'utf8'))
        const buf = await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'wrongtype', kind: 'data' })
        expect(buf).toBeNull()
    })
})

// =============================================================================
// Binary-backed nodes — payload at `nodes/{id}.bin`
// =============================================================================

describe('fetchNodeBytes — binary nodes', () => {
    it('reads `nodes/{nodeId}.bin` and returns the bytes verbatim', async () => {
        const blob = Buffer.from('%PDF-1.4 ...binary...', 'utf8')
        mockReadBlob.mockResolvedValueOnce(blob)

        const buf = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'pdf',
            kind: 'binary'
        })
        expect(buf).toBe(blob)
        expect(mockReadBlob).toHaveBeenCalledWith('skills', 'ws-1', 'skill-1', 'nodes', 'pdf.bin')
    })

    it('returns null when the binary blob is missing', async () => {
        mockReadBlob.mockResolvedValueOnce(null)
        const buf = await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'missing', kind: 'binary' })
        expect(buf).toBeNull()
    })
})

// =============================================================================
// Cache — keyed by (workspaceId, skillId, nodeId, digest)
// =============================================================================

describe('fetchNodeBytes — digest-keyed memoisation', () => {
    const payload = (content: string) => Buffer.from(JSON.stringify({ content }), 'utf8')

    it('caches by digest so repeated reads avoid storage round-trips', async () => {
        mockReadBlob.mockResolvedValueOnce(payload('v1'))

        const a = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-1'
        })
        const b = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-1'
        })

        expect(a!.toString('utf8')).toBe('v1')
        expect(b!.toString('utf8')).toBe('v1')
        expect(mockReadBlob).toHaveBeenCalledTimes(1)
    })

    it('treats a different digest as a fresh read (re-publish invalidates the cache)', async () => {
        mockReadBlob.mockResolvedValueOnce(payload('v1'))
        mockReadBlob.mockResolvedValueOnce(payload('v2'))

        const v1 = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-1'
        })
        const v2 = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-2'
        })

        expect(v1!.toString('utf8')).toBe('v1')
        expect(v2!.toString('utf8')).toBe('v2')
        expect(mockReadBlob).toHaveBeenCalledTimes(2)
    })

    it('does not cache when no digest is supplied (every call hits storage)', async () => {
        mockReadBlob.mockResolvedValue(payload('uncached'))
        await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'jd', kind: 'data' })
        await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'jd', kind: 'data' })
        expect(mockReadBlob).toHaveBeenCalledTimes(2)
    })

    it('does not cache null results (a missing payload may appear later)', async () => {
        mockReadBlob.mockResolvedValueOnce(null)
        mockReadBlob.mockResolvedValueOnce(payload('arrived'))

        const first = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-1'
        })
        const second = await fetchNodeBytes({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            nodeId: 'jd',
            kind: 'data',
            digest: 'd-1'
        })

        expect(first).toBeNull()
        expect(second!.toString('utf8')).toBe('arrived')
        expect(mockReadBlob).toHaveBeenCalledTimes(2)
    })

    it('clearNodeBytesCache forces the next read to hit storage', async () => {
        mockReadBlob.mockResolvedValue(payload('cached'))
        await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'jd', kind: 'data', digest: 'd' })
        clearNodeBytesCache()
        await fetchNodeBytes({ workspaceId: 'ws-1', skillId: 'skill-1', nodeId: 'jd', kind: 'data', digest: 'd' })
        expect(mockReadBlob).toHaveBeenCalledTimes(2)
    })
})
