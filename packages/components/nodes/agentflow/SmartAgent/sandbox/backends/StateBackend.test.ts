import { StateBackend } from './StateBackend'
import { FileData } from '../BackendProtocol'

describe('StateBackend', () => {
    it('write + read round-trip returns the written content', async () => {
        const backend = new StateBackend()
        await backend.write('/workspace/hello.txt', 'hi from sandbox')
        const result = await backend.read('/workspace/hello.txt')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBe('hi from sandbox')
            expect(result.mimeType).toBe('text/plain')
        }
    })

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

    it('duplicate write returns an error', async () => {
        const backend = new StateBackend()
        await backend.write('/workspace/file.txt', 'original')
        const result = await backend.write('/workspace/file.txt', 'duplicate')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('/workspace/file.txt')
        }
    })

    it('read of missing file returns an error', async () => {
        const backend = new StateBackend()
        const result = await backend.read('/workspace/missing.txt')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('/workspace/missing.txt')
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
