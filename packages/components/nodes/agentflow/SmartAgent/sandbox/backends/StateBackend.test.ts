import { StateBackend } from './StateBackend'
import { FileData } from '../BackendProtocol'

describe('StateBackend — write/read', () => {
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

describe('StateBackend — read pagination', () => {
    it('returns only the requested lines when offset and limit are set', async () => {
        const backend = new StateBackend()
        await backend.write('/paginated.txt', 'line1\nline2\nline3\nline4\nline5')
        const result = await backend.read('/paginated.txt', 1, 2)
        if ('content' in result) {
            const lines = (result.content as string).split('\n').filter(Boolean)
            expect(lines).toHaveLength(2)
            expect(lines[0]).toBe('line2')
            expect(lines[1]).toBe('line3')
        }
    })

    it('returns content from offset 0 up to limit', async () => {
        const backend = new StateBackend()
        await backend.write('/short.txt', 'a\nb\nc')
        const result = await backend.read('/short.txt', 0, 2)
        if ('content' in result) {
            const lines = (result.content as string).split('\n').filter(Boolean)
            expect(lines).toHaveLength(2)
            expect(lines[0]).toBe('a')
        }
    })
})

describe('StateBackend — readRaw', () => {
    it('returns the underlying FileData', async () => {
        const backend = new StateBackend()
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

    it('returns an error for missing file', async () => {
        const backend = new StateBackend()
        const result = await backend.readRaw('/nope.txt')
        expect('error' in result).toBe(true)
    })
})

describe('StateBackend — ls', () => {
    async function seed() {
        const backend = new StateBackend()
        await backend.write('/a.txt', 'A')
        await backend.write('/dir/b.txt', 'B')
        await backend.write('/dir/sub/c.txt', 'C')
        return backend
    }

    it('ls("/") returns top-level file and synthesized directory', async () => {
        const backend = await seed()
        const result = await backend.ls('/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toContain('a.txt')
            expect(names).toContain('dir')
            const dir = result.files.find((f) => f.name === 'dir')
            expect(dir!.isDirectory).toBe(true)
            const file = result.files.find((f) => f.name === 'a.txt')
            expect(file!.isDirectory).toBe(false)
        }
    })

    it('ls("/dir") lists nested files and synthesizes deeper directory', async () => {
        const backend = await seed()
        const result = await backend.ls('/dir')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toContain('b.txt')
            expect(names).toContain('sub')
            const sub = result.files.find((f) => f.name === 'sub')
            expect(sub!.isDirectory).toBe(true)
        }
    })

    it('returns entries sorted alphabetically', async () => {
        const backend = new StateBackend()
        await backend.write('/zeta.txt', '')
        await backend.write('/alpha.txt', '')
        await backend.write('/mu.txt', '')
        const result = await backend.ls('/')
        if ('files' in result) {
            const names = result.files.map((f) => f.name)
            expect(names).toEqual(['alpha.txt', 'mu.txt', 'zeta.txt'])
        }
    })
})

describe('StateBackend — edit', () => {
    it('replaces a single match and returns FilesUpdate', async () => {
        const backend = new StateBackend()
        await backend.write('/edit.txt', 'hello world')
        const before = (await backend.readRaw('/edit.txt')) as { data: FileData }
        // Force a delta in modified_at
        await new Promise((r) => setTimeout(r, 2))
        const result = await backend.edit('/edit.txt', 'world', 'sandbox')
        expect('error' in result).toBe(false)
        if (!('error' in result)) {
            expect(result.occurrences).toBe(1)
            expect(result.filesUpdate).not.toBeNull()
            expect(result.filesUpdate!['/edit.txt']).toBeDefined()
            expect(result.filesUpdate!['/edit.txt']!.modified_at).toBeGreaterThanOrEqual(before.data.modified_at)
        }
        const after = await backend.read('/edit.txt')
        if ('content' in after) {
            expect(after.content).toBe('hello sandbox')
        }
    })

    it('replaceAll replaces every occurrence', async () => {
        const backend = new StateBackend()
        await backend.write('/all.txt', 'foo bar foo')
        const result = await backend.edit('/all.txt', 'foo', 'baz', true)
        if (!('error' in result)) {
            expect(result.occurrences).toBe(2)
        }
        const after = await backend.read('/all.txt')
        if ('content' in after) {
            expect(after.content).toBe('baz bar baz')
        }
    })

    it('zero matches returns an error mentioning the file path', async () => {
        const backend = new StateBackend()
        await backend.write('/empty.txt', 'hello')
        const result = await backend.edit('/empty.txt', 'missing', 'x')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('/empty.txt')
        }
    })

    it('multiple matches without replaceAll errors and reports the count', async () => {
        const backend = new StateBackend()
        await backend.write('/multi.txt', 'foo foo foo')
        const result = await backend.edit('/multi.txt', 'foo', 'bar')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toContain('3')
        }
    })

    it('errors when target file is binary', async () => {
        const backend = new StateBackend()
        await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
        const result = await backend.edit('/img.png', 'a', 'b')
        expect('error' in result).toBe(true)
        if ('error' in result) {
            expect(result.error).toMatch(/binary/i)
        }
    })

    it('errors when file is missing', async () => {
        const backend = new StateBackend()
        const result = await backend.edit('/none.txt', 'a', 'b')
        expect('error' in result).toBe(true)
    })
})

describe('StateBackend — glob', () => {
    it('matches files by pattern across directories', async () => {
        const backend = new StateBackend()
        await backend.write('/src/foo.ts', '')
        await backend.write('/src/bar.js', '')
        await backend.write('/lib/baz.ts', '')
        const result = await backend.glob('**/*.ts', '/')
        expect('files' in result).toBe(true)
        if ('files' in result) {
            const paths = result.files.map((f) => f.path).sort()
            expect(paths).toEqual(['/lib/baz.ts', '/src/foo.ts'])
        }
    })

    it('matches single-segment pattern within a directory', async () => {
        const backend = new StateBackend()
        await backend.write('/src/foo.ts', '')
        await backend.write('/src/deep/bar.ts', '')
        const result = await backend.glob('*.ts', '/src')
        if ('files' in result) {
            const paths = result.files.map((f) => f.path)
            expect(paths).toEqual(['/src/foo.ts'])
        }
    })
})

describe('StateBackend — grep', () => {
    it('finds matching lines and reports 1-indexed line numbers', async () => {
        const backend = new StateBackend()
        await backend.write('/notes.txt', 'line one\nfind me\nline three')
        const result = await backend.grep('find me', '/')
        expect('matches' in result).toBe(true)
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].line).toBe(2)
            expect(result.matches[0].path).toBe('/notes.txt')
            expect(result.matches[0].content).toBe('find me')
        }
    })

    it('respects glob filename filter', async () => {
        const backend = new StateBackend()
        await backend.write('/a.ts', 'target')
        await backend.write('/a.js', 'target')
        const result = await backend.grep('target', '/', '*.ts')
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/a.ts')
        }
    })

    it('finds matches across multiple files and returns all', async () => {
        const backend = new StateBackend()
        await backend.write('/a.txt', 'match here\nnot here')
        await backend.write('/b.txt', 'also a match here\nskip')
        const result = await backend.grep('match', '/')
        if ('matches' in result) {
            expect(result.matches).toHaveLength(2)
            const paths = result.matches.map((m) => m.path).sort()
            expect(paths).toEqual(['/a.txt', '/b.txt'])
        }
    })

    it('null dirPath searches from root', async () => {
        const backend = new StateBackend()
        await backend.write('/deep/nested/file.txt', 'find me')
        const result = await backend.grep('find me', null)
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/deep/nested/file.txt')
        }
    })

    it('skips binary files', async () => {
        const backend = new StateBackend()
        await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
        await backend.write('/text.txt', 'hello')
        const result = await backend.grep('hello', '/')
        if ('matches' in result) {
            expect(result.matches).toHaveLength(1)
            expect(result.matches[0].path).toBe('/text.txt')
        }
    })
})

describe('StateBackend — isolation & binary', () => {
    it('two instances do not share state', async () => {
        const a = new StateBackend()
        const b = new StateBackend()
        await a.write('/shared.txt', 'only in A')
        const fromB = await b.read('/shared.txt')
        expect('error' in fromB).toBe(true)
    })

    it('binary write/read round-trip preserves bytes and mime', async () => {
        const backend = new StateBackend()
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
})
