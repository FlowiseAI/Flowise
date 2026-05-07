import type { BackendProtocol } from '../BackendProtocol'

export type MakeBackend = () => BackendProtocol | Promise<BackendProtocol>

/**
 * Run the shared protocol-conformance suite. Every BackendProtocol implementation
 * must pass this — it locks parity on text/binary I/O, edit, ls, glob, grep.
 * Backend-specific concerns (path traversal, constructor edge cases, FilesUpdate
 * shape) live in each backend's own test file.
 */
export function runBackendConformanceSuite(name: string, makeBackend: MakeBackend) {
    describe(`${name} — conformance`, () => {
        describe('write/read', () => {
            it('write + read round-trip returns the written content', async () => {
                const backend = await makeBackend()
                await backend.write('/workspace/hello.txt', 'hi from sandbox')
                const result = await backend.read('/workspace/hello.txt')
                expect('content' in result).toBe(true)
                if ('content' in result) {
                    expect(result.content).toBe('hi from sandbox')
                    expect(result.mimeType).toBe('text/plain')
                }
            })

            it('duplicate write returns an error mentioning the path', async () => {
                const backend = await makeBackend()
                await backend.write('/workspace/file.txt', 'original')
                const result = await backend.write('/workspace/file.txt', 'duplicate')
                expect('error' in result).toBe(true)
                if ('error' in result) {
                    expect(result.error).toContain('/workspace/file.txt')
                }
            })

            it('read of missing file returns an error mentioning the path', async () => {
                const backend = await makeBackend()
                const result = await backend.read('/workspace/missing.txt')
                expect('error' in result).toBe(true)
                if ('error' in result) {
                    expect(result.error).toContain('/workspace/missing.txt')
                }
            })

            it('write of Uint8Array to a text-mime path is decoded to a string on read', async () => {
                const backend = await makeBackend()
                const bytes = new TextEncoder().encode('hi from bytes')
                await backend.write('/workspace/decoded.txt', bytes)
                const result = await backend.read('/workspace/decoded.txt')
                expect('content' in result).toBe(true)
                if ('content' in result) {
                    expect(typeof result.content).toBe('string')
                    expect(result.content).toBe('hi from bytes')
                    expect(result.mimeType).toBe('text/plain')
                }
            })

            it('binary write/read preserves bytes and mime', async () => {
                const backend = await makeBackend()
                const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
                await backend.write('/img.png', png)
                const result = await backend.read('/img.png')
                expect('content' in result).toBe(true)
                if ('content' in result) {
                    expect(result.content).toBeInstanceOf(Uint8Array)
                    expect(Array.from(result.content as Uint8Array)).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
                    expect(result.mimeType).toBe('image/png')
                }
            })
        })

        describe('read pagination', () => {
            it('returns only the requested lines when offset and limit are set', async () => {
                const backend = await makeBackend()
                await backend.write('/paginated.txt', 'line1\nline2\nline3\nline4\nline5')
                const result = await backend.read('/paginated.txt', 1, 2)
                expect('content' in result).toBe(true)
                if ('content' in result) {
                    const lines = (result.content as string).split('\n').filter(Boolean)
                    expect(lines).toEqual(['line2', 'line3'])
                }
            })

            it('returns content from offset 0 up to limit', async () => {
                const backend = await makeBackend()
                await backend.write('/short.txt', 'a\nb\nc')
                const result = await backend.read('/short.txt', 0, 2)
                expect('content' in result).toBe(true)
                if ('content' in result) {
                    const lines = (result.content as string).split('\n').filter(Boolean)
                    expect(lines).toEqual(['a', 'b'])
                }
            })
        })

        describe('readRaw', () => {
            it('returns FileData with content, mime, and timestamps', async () => {
                const backend = await makeBackend()
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
                const backend = await makeBackend()
                const result = await backend.readRaw('/nope.txt')
                expect('error' in result).toBe(true)
            })

            it('stores binary as base64 string in FileData.content', async () => {
                const backend = await makeBackend()
                const png = new Uint8Array([137, 80, 78, 71])
                await backend.write('/img.png', png)
                const result = await backend.readRaw('/img.png')
                expect('data' in result).toBe(true)
                if ('data' in result) {
                    expect(typeof result.data.content).toBe('string')
                    expect(result.data.content).toBe(Buffer.from([137, 80, 78, 71]).toString('base64'))
                    expect(result.data.mimeType).toBe('image/png')
                }
            })
        })

        describe('ls', () => {
            async function seed(backend: BackendProtocol) {
                await backend.write('/a.txt', 'A')
                await backend.write('/dir/b.txt', 'B')
                await backend.write('/dir/sub/c.txt', 'C')
            }

            it('ls("/") lists top-level files and directory entries', async () => {
                const backend = await makeBackend()
                await seed(backend)
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
                const backend = await makeBackend()
                await seed(backend)
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
                const backend = await makeBackend()
                await backend.write('/zeta.txt', '')
                await backend.write('/alpha.txt', '')
                await backend.write('/mu.txt', '')
                const result = await backend.ls('/')
                expect('files' in result).toBe(true)
                if ('files' in result) {
                    const names = result.files.map((f) => f.name)
                    expect(names).toEqual(['alpha.txt', 'mu.txt', 'zeta.txt'])
                }
            })

            it('returns an empty list for a missing directory', async () => {
                const backend = await makeBackend()
                const result = await backend.ls('/does/not/exist')
                expect('files' in result).toBe(true)
                if ('files' in result) {
                    expect(result.files).toEqual([])
                }
            })
        })

        describe('edit', () => {
            it('replaces a single match', async () => {
                const backend = await makeBackend()
                await backend.write('/edit.txt', 'hello world')
                const result = await backend.edit('/edit.txt', 'world', 'sandbox')
                expect('error' in result).toBe(false)
                if (!('error' in result)) {
                    expect(result.path).toBe('/edit.txt')
                    expect(result.occurrences).toBe(1)
                }
                const after = await backend.read('/edit.txt')
                if ('content' in after) expect(after.content).toBe('hello sandbox')
            })

            it('replaceAll replaces every occurrence', async () => {
                const backend = await makeBackend()
                await backend.write('/all.txt', 'foo bar foo')
                const result = await backend.edit('/all.txt', 'foo', 'baz', true)
                if (!('error' in result)) expect(result.occurrences).toBe(2)
                const after = await backend.read('/all.txt')
                if ('content' in after) expect(after.content).toBe('baz bar baz')
            })

            it('zero matches returns an error mentioning the path', async () => {
                const backend = await makeBackend()
                await backend.write('/empty.txt', 'hello')
                const result = await backend.edit('/empty.txt', 'missing', 'x')
                expect('error' in result).toBe(true)
                if ('error' in result) expect(result.error).toContain('/empty.txt')
            })

            it('multiple matches without replaceAll errors and reports the count', async () => {
                const backend = await makeBackend()
                await backend.write('/multi.txt', 'foo foo foo')
                const result = await backend.edit('/multi.txt', 'foo', 'bar')
                expect('error' in result).toBe(true)
                if ('error' in result) expect(result.error).toContain('3')
            })

            it('errors when target file is binary', async () => {
                const backend = await makeBackend()
                await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
                const result = await backend.edit('/img.png', 'a', 'b')
                expect('error' in result).toBe(true)
                if ('error' in result) expect(result.error).toMatch(/binary/i)
            })

            it('errors when file is missing', async () => {
                const backend = await makeBackend()
                const result = await backend.edit('/none.txt', 'a', 'b')
                expect('error' in result).toBe(true)
            })
        })

        describe('glob', () => {
            it('matches files by pattern across directories', async () => {
                const backend = await makeBackend()
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
                const backend = await makeBackend()
                await backend.write('/src/foo.ts', '')
                await backend.write('/src/deep/bar.ts', '')
                const result = await backend.glob('*.ts', '/src')
                expect('files' in result).toBe(true)
                if ('files' in result) {
                    const paths = result.files.map((f) => f.path)
                    expect(paths).toEqual(['/src/foo.ts'])
                }
            })

            it('returns an empty list and truncated:false when nothing matches', async () => {
                const backend = await makeBackend()
                await backend.write('/src/foo.ts', '')
                const result = await backend.glob('**/*.py', '/')
                expect('files' in result).toBe(true)
                if ('files' in result) {
                    expect(result.files).toEqual([])
                    expect(result.truncated).toBe(false)
                }
            })
        })

        describe('grep', () => {
            it('finds matching lines and reports 1-indexed line numbers', async () => {
                const backend = await makeBackend()
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
                const backend = await makeBackend()
                await backend.write('/a.ts', 'target')
                await backend.write('/a.js', 'target')
                const result = await backend.grep('target', '/', '*.ts')
                expect('matches' in result).toBe(true)
                if ('matches' in result) {
                    expect(result.matches).toHaveLength(1)
                    expect(result.matches[0].path).toBe('/a.ts')
                }
            })

            it('finds matches across multiple files and returns all', async () => {
                const backend = await makeBackend()
                await backend.write('/a.txt', 'match here\nnot here')
                await backend.write('/b.txt', 'also a match here\nskip')
                const result = await backend.grep('match', '/')
                expect('matches' in result).toBe(true)
                if ('matches' in result) {
                    expect(result.matches).toHaveLength(2)
                    const paths = result.matches.map((m) => m.path).sort()
                    expect(paths).toEqual(['/a.txt', '/b.txt'])
                }
            })

            it('null dirPath searches from root', async () => {
                const backend = await makeBackend()
                await backend.write('/deep/nested/file.txt', 'find me')
                const result = await backend.grep('find me', null)
                expect('matches' in result).toBe(true)
                if ('matches' in result) {
                    expect(result.matches).toHaveLength(1)
                    expect(result.matches[0].path).toBe('/deep/nested/file.txt')
                }
            })

            it('skips binary files', async () => {
                const backend = await makeBackend()
                await backend.write('/img.png', new Uint8Array([137, 80, 78, 71]))
                await backend.write('/text.txt', 'hello')
                const result = await backend.grep('hello', '/')
                expect('matches' in result).toBe(true)
                if ('matches' in result) {
                    expect(result.matches).toHaveLength(1)
                    expect(result.matches[0].path).toBe('/text.txt')
                }
            })

            it('returns an empty list and truncated:false when nothing matches', async () => {
                const backend = await makeBackend()
                await backend.write('/notes.txt', 'hello')
                const result = await backend.grep('absent', '/')
                expect('matches' in result).toBe(true)
                if ('matches' in result) {
                    expect(result.matches).toEqual([])
                    expect(result.truncated).toBe(false)
                }
            })

            it('returns an error for invalid regex', async () => {
                const backend = await makeBackend()
                const result = await backend.grep('([', '/')
                expect('error' in result).toBe(true)
            })
        })
    })
}
