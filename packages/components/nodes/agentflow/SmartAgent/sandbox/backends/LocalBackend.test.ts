import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { LocalBackend } from './LocalBackend'

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

describe('LocalBackend — constructor', () => {
    it('creates the rootPath directory if it does not exist', () => {
        const root = join(tmpdir(), `flowise-local-create-${Date.now()}`)
        tmpRoots.push(root)
        expect(existsSync(root)).toBe(false)
        // eslint-disable-next-line no-new
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

describe('LocalBackend — write', () => {
    it('write of new file returns { path, filesUpdate: null }', async () => {
        const backend = makeBackend()
        const result = await backend.write('/workspace/notes.md', '# Notes')
        expect('path' in result).toBe(true)
        if ('path' in result) {
            expect(result.path).toBe('/workspace/notes.md')
            expect(result.filesUpdate).toBeNull()
        }
    })

    it('duplicate write returns an error mentioning the path', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/file.txt', 'original')
        const result = await backend.write('/workspace/file.txt', 'duplicate')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('/workspace/file.txt')
            expect(result.error).toContain('already exists')
        }
    })

    it('writes Uint8Array content to disk for binary mime types', async () => {
        const backend = makeBackend()
        const png = new Uint8Array([137, 80, 78, 71])
        const result = await backend.write('/img.png', png)
        expect('path' in result).toBe(true)
    })

    it('creates intermediate directories', async () => {
        const backend = makeBackend()
        const result = await backend.write('/a/b/c/deep.txt', 'hi')
        expect('path' in result).toBe(true)
    })
})

describe('LocalBackend — read', () => {
    it('write + read round-trip returns the written content', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/hello.txt', 'hi from disk')
        const result = await backend.read('/workspace/hello.txt')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBe('hi from disk')
            expect(result.mimeType).toBe('text/plain')
        }
    })

    it('read of missing file returns an error', async () => {
        const backend = makeBackend()
        const result = await backend.read('/workspace/missing.txt')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('/workspace/missing.txt')
        }
    })

    it('read returns binary Uint8Array for binary mime types', async () => {
        const backend = makeBackend()
        const png = new Uint8Array([137, 80, 78, 71])
        await backend.write('/img.png', png)
        const result = await backend.read('/img.png')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBeInstanceOf(Uint8Array)
            expect(Array.from(result.content as Uint8Array)).toEqual([137, 80, 78, 71])
            expect(result.mimeType).toBe('image/png')
        }
    })

    it('read with offset and limit paginates lines', async () => {
        const backend = makeBackend()
        await backend.write('/paginated.txt', 'line1\nline2\nline3\nline4\nline5')
        const result = await backend.read('/paginated.txt', 1, 2)
        expect('content' in result).toBe(true)
        if ('content' in result) {
            const lines = (result.content as string).split('\n').filter(Boolean)
            expect(lines).toEqual(['line2', 'line3'])
        }
    })
})

describe('LocalBackend — readRaw', () => {
    it('returns the underlying FileData', async () => {
        const backend = makeBackend()
        await backend.write('/raw.txt', 'raw bytes')
        const result = await backend.readRaw('/raw.txt')
        expect('data' in result).toBe(true)
        if ('data' in result) {
            expect(result.data.content).toBe('raw bytes')
            expect(result.data.mimeType).toBe('text/plain')
            expect(typeof result.data.created_at).toBe('number')
            expect(typeof result.data.modified_at).toBe('number')
        }
    })

    it('readRaw of missing file returns an error', async () => {
        const backend = makeBackend()
        const result = await backend.readRaw('/nope.txt')
        expect('error' in result).toBe(true)
    })
})

describe('LocalBackend — edit', () => {
    it('replaces a single match and returns { path, occurrences, filesUpdate: null }', async () => {
        const backend = makeBackend()
        await backend.write('/edit.txt', 'hello world')
        const result = await backend.edit('/edit.txt', 'world', 'sandbox')
        expect('error' in result).toBe(false)
        if (!('error' in result)) {
            expect(result.path).toBe('/edit.txt')
            expect(result.occurrences).toBe(1)
            expect(result.filesUpdate).toBeNull()
        }
        const after = await backend.read('/edit.txt')
        if ('content' in after) expect(after.content).toBe('hello sandbox')
    })

    it('replaceAll replaces every occurrence', async () => {
        const backend = makeBackend()
        await backend.write('/all.txt', 'foo bar foo')
        const result = await backend.edit('/all.txt', 'foo', 'baz', true)
        if (!('error' in result)) expect(result.occurrences).toBe(2)
        const after = await backend.read('/all.txt')
        if ('content' in after) expect(after.content).toBe('baz bar baz')
    })

    it('zero matches returns an error mentioning the path', async () => {
        const backend = makeBackend()
        await backend.write('/empty.txt', 'hello')
        const result = await backend.edit('/empty.txt', 'missing', 'x')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toContain('/empty.txt')
    })

    it('multiple matches without replaceAll errors and reports the count', async () => {
        const backend = makeBackend()
        await backend.write('/multi.txt', 'foo foo foo')
        const result = await backend.edit('/multi.txt', 'foo', 'bar')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toContain('3')
    })

    it('errors when target file is binary', async () => {
        const backend = makeBackend()
        await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
        const result = await backend.edit('/img.png', 'a', 'b')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/binary/i)
    })

    it('errors when file is missing', async () => {
        const backend = makeBackend()
        const result = await backend.edit('/none.txt', 'a', 'b')
        expect('error' in result).toBe(true)
    })
})

describe('LocalBackend — ls', () => {
    async function seed(): Promise<LocalBackend> {
        const backend = makeBackend()
        await backend.write('/a.txt', 'A')
        await backend.write('/dir/b.txt', 'B')
        await backend.write('/dir/sub/c.txt', 'C')
        return backend
    }

    it('ls("/") returns top-level file and directory entries', async () => {
        const backend = await seed()
        const result = await backend.ls('/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toContain('a.txt')
            expect(names).toContain('dir')
            const dir = result.files.find((f) => f.name === 'dir')!
            expect(dir.isDirectory).toBe(true)
            const file = result.files.find((f) => f.name === 'a.txt')!
            expect(file.isDirectory).toBe(false)
        }
    })

    it('ls("/dir") lists nested files and the deeper subdirectory', async () => {
        const backend = await seed()
        const result = await backend.ls('/dir')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toContain('b.txt')
            expect(names).toContain('sub')
            const sub = result.files.find((f) => f.name === 'sub')!
            expect(sub.isDirectory).toBe(true)
        }
    })

    it('returns entries sorted alphabetically', async () => {
        const backend = makeBackend()
        await backend.write('/zeta.txt', '')
        await backend.write('/alpha.txt', '')
        await backend.write('/mu.txt', '')
        const result = await backend.ls('/')
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toEqual(['alpha.txt', 'mu.txt', 'zeta.txt'])
        }
    })

    it('returns an empty list for a missing directory', async () => {
        const backend = makeBackend()
        const result = await backend.ls('/does/not/exist')
        if ('files' in result) expect(result.files).toEqual([])
    })
})

describe('LocalBackend — glob', () => {
    it('matches files by pattern across directories', async () => {
        const backend = makeBackend()
        await backend.write('/src/foo.ts', '')
        await backend.write('/src/bar.js', '')
        await backend.write('/lib/baz.ts', '')
        const result = await backend.glob('**/*.ts', '/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const paths = result.files.map((f) => f.path).sort()
            expect(paths).toEqual(['/lib/baz.ts', '/src/foo.ts'])
            expect(result.truncated).toBe(false)
        }
    })

    it('matches single-segment pattern within a directory', async () => {
        const backend = makeBackend()
        await backend.write('/src/foo.ts', '')
        await backend.write('/src/deep/bar.ts', '')
        const result = await backend.glob('*.ts', '/src')
        if ('files' in result) {
            const paths = result.files.map((f) => f.path)
            expect(paths).toEqual(['/src/foo.ts'])
        }
    })

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

describe('LocalBackend — grep', () => {
    it('finds matching lines and reports 1-indexed line numbers', async () => {
        const backend = makeBackend()
        await backend.write('/notes.txt', 'line one\nfind me\nline three')
        const result = await backend.grep('find me', '/')
        expect('matches' in result).toBe(true)
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].line).toBe(2)
            expect(result.matches[0].path).toBe('/notes.txt')
            expect(result.matches[0].content).toBe('find me')
            expect(result.truncated).toBe(false)
        }
    })

    it('respects glob filename filter', async () => {
        const backend = makeBackend()
        await backend.write('/a.ts', 'target')
        await backend.write('/a.js', 'target')
        const result = await backend.grep('target', '/', '*.ts')
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/a.ts')
        }
    })

    it('null dirPath searches from root', async () => {
        const backend = makeBackend()
        await backend.write('/deep/nested/file.txt', 'find me')
        const result = await backend.grep('find me', null)
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/deep/nested/file.txt')
        }
    })

    it('skips binary files', async () => {
        const backend = makeBackend()
        await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
        await backend.write('/text.txt', 'hello')
        const result = await backend.grep('hello', '/')
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/text.txt')
        }
    })

    it('invalid regex returns an error', async () => {
        const backend = makeBackend()
        const result = await backend.grep('([', '/')
        expect('error' in result).toBe(true)
        if ('error' in result) expect(result.error).toMatch(/[Ii]nvalid/)
    })

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

describe('LocalBackend — binary round-trip', () => {
    it('binary write/read preserves bytes and mime', async () => {
        const backend = makeBackend()
        const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
        await backend.write('/bin.png', png)
        const result = await backend.read('/bin.png')
        expect('content' in result).toBe(true)
        if ('content' in result) {
            expect(result.content).toBeInstanceOf(Uint8Array)
            expect(Array.from(result.content as Uint8Array)).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
            expect(result.mimeType).toBe('image/png')
        }
    })
})
