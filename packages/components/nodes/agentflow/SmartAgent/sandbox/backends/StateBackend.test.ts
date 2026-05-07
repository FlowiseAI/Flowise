import { StateBackend } from './StateBackend'
import { FileData } from '../BackendProtocol'
import { runBackendConformanceSuite } from './conformance'

runBackendConformanceSuite('StateBackend', () => new StateBackend())

describe('StateBackend — backend-specific', () => {
    it('write returns a FilesUpdate containing the written file', async () => {
        const backend = new StateBackend()
        const result = await backend.write('/workspace/notes.md', '# Notes')
        expect('path' in result).toBe(true)
        if ('path' in result) {
            expect(result.path).toBe('/workspace/notes.md')
            expect(result.filesUpdate).not.toBeNull()
            expect(result.filesUpdate!['/workspace/notes.md']).toBeDefined()
        }
    })

    it('edit returns FilesUpdate with bumped modified_at', async () => {
        const backend = new StateBackend()
        await backend.write('/edit.txt', 'hello world')
        const before = (await backend.readRaw('/edit.txt')) as { data: FileData }
        await new Promise((r) => setTimeout(r, 2))
        const result = await backend.edit('/edit.txt', 'world', 'sandbox')
        expect('error' in result).toBe(false)
        if (!('error' in result)) {
            expect(result.filesUpdate).not.toBeNull()
            expect(result.filesUpdate!['/edit.txt']).toBeDefined()
            expect(result.filesUpdate!['/edit.txt']!.modified_at).toBeGreaterThanOrEqual(before.data.modified_at)
        }
    })

    it('constructor accepts initialFiles and makes them readable', async () => {
        const now = Date.now()
        const initialFiles: Record<string, FileData> = {
            '/workspace/seed.txt': { content: 'seeded', mimeType: 'text/plain', created_at: now, modified_at: now }
        }
        const backend = new StateBackend(initialFiles)
        const result = await backend.read('/workspace/seed.txt')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBe('seeded')
        }
    })
})

describe('StateBackend — isolation', () => {
    it('two instances do not share state', async () => {
        const a = new StateBackend()
        const b = new StateBackend()
        await a.write('/shared.txt', 'only in A')
        const fromB = await b.read('/shared.txt')
        expect('error' in fromB).toBe(true)
    })
})

describe('StateBackend — cross-execution persistence', () => {
    it('survives JSON.stringify round-trip via initialFiles (regression for binary corruption)', async () => {
        // Mimics what buildAgentflow.ts:171 does: serialize state.files into the
        // executionData column on every turn, then rehydrate on the next turn.
        const a = new StateBackend()
        await a.write('/img.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))

        // Reach into internal storage to test the persisted shape directly,
        // since runtimeState.files is exactly what gets JSON.stringified.
        const internal = (a as unknown as { files: Record<string, FileData> }).files
        const rehydrated = JSON.parse(JSON.stringify(internal)) as Record<string, FileData>

        const b = new StateBackend(rehydrated)
        const result = await b.read('/img.png')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBeInstanceOf(Uint8Array)
            expect(Array.from(result.content as Uint8Array)).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
            expect(result.mimeType).toBe('image/png')
        }
    })
})
