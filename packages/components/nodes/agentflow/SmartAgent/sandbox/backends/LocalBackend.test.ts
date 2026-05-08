import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { LocalBackend } from './LocalBackend'
import { runBackendConformanceSuite } from './conformance'

const tmpRoots: string[] = []

function makeBackend(): LocalBackend {
    const root = mkdtempSync(join(tmpdir(), 'flowise-local-'))
    tmpRoots.push(root)
    return new LocalBackend(root)
}

afterAll(() => {
    for (const root of tmpRoots) {
        rmSync(root, { recursive: true, force: true })
    }
    tmpRoots.length = 0
})

runBackendConformanceSuite('LocalBackend', () => makeBackend())

describe('LocalBackend — constructor', () => {
    it('creates the rootPath directory if it does not exist', () => {
        const root = join(tmpdir(), `flowise-local-create-${Date.now()}`)
        tmpRoots.push(root)
        expect(existsSync(root)).toBe(false)
        new LocalBackend(root)
        expect(existsSync(root)).toBe(true)
    })

    it('empty-string rootPath does NOT resolve to CWD (security: prevents sandbox escape)', () => {
        const backend = new LocalBackend('')
        const root = (backend as unknown as { root: string }).root
        expect(root).not.toBe(process.cwd())
        expect(root).toBe(resolve(homedir(), '.flowise', 'sandbox'))
    })
})

describe('LocalBackend — backend-specific write', () => {
    it('write of new file returns { path, filesUpdate: null }', async () => {
        const backend = makeBackend()
        const result = await backend.write('/workspace/notes.md', '# Notes')
        expect('path' in result).toBe(true)
        if ('path' in result) {
            expect(result.path).toBe('/workspace/notes.md')
            expect(result.filesUpdate).toBeNull()
        }
    })

    it('duplicate write error message includes "already exists"', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/file.txt', 'original')
        const result = await backend.write('/workspace/file.txt', 'duplicate')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('already exists')
        }
    })

    it('creates intermediate directories', async () => {
        const backend = makeBackend()
        const result = await backend.write('/a/b/c/deep.txt', 'hi')
        expect('path' in result).toBe(true)
    })
})

describe('LocalBackend — glob (caps)', () => {
    it('caps results at MAX_LIST_OBJECTS and reports truncated:true', async () => {
        const backend = makeBackend()
        // Seed 1001 files — one over the cap
        for (let i = 0; i < 1001; i++) {
            await backend.write(`/many/file${i}.txt`, '')
        }
        const result = await backend.glob('**/*.txt', '/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            expect(result.files.length).toBe(1000)
            expect(result.truncated).toBe(true)
        }
    }, 20000)
})

describe('LocalBackend — grep (caps)', () => {
    it('caps scanned files at MAX_LIST_OBJECTS and reports truncated:true', async () => {
        const backend = makeBackend()
        for (let i = 0; i < 1001; i++) {
            await backend.write(`/many/file${i}.txt`, 'needle')
        }
        const result = await backend.grep('needle', '/')
        expect('matches' in result).toBe(true)
        if ('matches' in result) {
            expect(result.truncated).toBe(true)
        }
    }, 30000)
})

describe('LocalBackend — path traversal', () => {
    it('write rejects ../ escape', async () => {
        const backend = makeBackend()
        const result = await backend.write('/../escape.txt', 'pwn')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/[Pp]ath traversal/)
    })

    it('read rejects ../ escape', async () => {
        const backend = makeBackend()
        const result = await backend.read('/../../etc/passwd')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/[Pp]ath traversal/)
    })

    it('readRaw rejects ../ escape', async () => {
        const backend = makeBackend()
        const result = await backend.readRaw('/../etc/passwd')
        expect('error' in result).toBe(true)
    })

    it('edit rejects ../ escape', async () => {
        const backend = makeBackend()
        const result = await backend.edit('/../escape.txt', 'a', 'b')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/[Pp]ath traversal/)
    })

    it('ls rejects ../ escape', async () => {
        const backend = makeBackend()
        const result = await backend.ls('/../')
        expect('error' in result).toBe(true)
    })

    it('glob rejects ../ escape on basePath', async () => {
        const backend = makeBackend()
        const result = await backend.glob('*.txt', '/../')
        expect('error' in result).toBe(true)
    })

    it('grep rejects ../ escape on dirPath', async () => {
        const backend = makeBackend()
        const result = await backend.grep('hi', '/../')
        expect('error' in result).toBe(true)
    })

    it('legitimate paths without ../ succeed', async () => {
        const backend = makeBackend()
        const w = await backend.write('/legit.txt', 'ok')
        expect('path' in w).toBe(true)
        const r = await backend.read('/legit.txt')
        if ('content' in r) expect(r.content).toBe('ok')
    })
})

describe('LocalBackend — isolation', () => {
    it('two instances on different roots do not share state', async () => {
        const a = makeBackend()
        const b = makeBackend()
        await a.write('/shared.txt', 'only in A')
        const fromB = await b.read('/shared.txt')
        expect('error' in fromB).toBe(true)
    })
})
