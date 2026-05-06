import { CompositeBackend } from './CompositeBackend'
import { StateBackend } from './StateBackend'
import { BackendProtocol } from '../BackendProtocol'

describe('CompositeBackend constructor', () => {
    it('rejects route prefix of "/"', () => {
        expect(() => new CompositeBackend(new StateBackend(), { '/': new StateBackend() })).toThrow()
    })

    it('rejects empty-string route prefix', () => {
        expect(() => new CompositeBackend(new StateBackend(), { '': new StateBackend() })).toThrow()
    })

    it('normalizes route prefixes to end with trailing slash', async () => {
        // Register without trailing slash; path under that mount should still route to the mount.
        const inner = new StateBackend({ '/x.md': { content: 'hi', mimeType: 'text/markdown', created_at: 0, modified_at: 0 } })
        const composite = new CompositeBackend(new StateBackend(), { '/a': inner })
        const result = await composite.ls('/a/')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['x.md'])
    })
})

describe('CompositeBackend.resolve (via ls)', () => {
    it('routes to default when no routes registered', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'hi', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, {})
        const result = await composite.ls('/')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['x.md'])
    })

    it('routes path under a single registered prefix to that mount', async () => {
        const def = new StateBackend()
        const inner = new StateBackend({
            '/inside.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': inner })
        const result = await composite.ls('/a/')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['inside.md'])
    })

    it('selects the longest matching prefix when nested routes match', async () => {
        const def = new StateBackend()
        const outer = new StateBackend({
            '/wrong.md': { content: 'wrong', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const inner = new StateBackend({
            '/right.md': { content: 'right', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': outer, '/a/b/': inner })
        const result = await composite.ls('/a/b/')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['right.md'])
    })

    it('does not match when prefix would cross a non-slash boundary', async () => {
        // Route '/foo/' should NOT match '/foobar/x.md' — slash boundary is required.
        const def = new StateBackend({
            '/foobar/x.md': { content: 'def', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const inner = new StateBackend({
            '/x.md': { content: 'inner', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/foo/': inner })
        const result = await composite.ls('/foobar/')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['x.md'])
    })

    it('matches a bare path equal to the prefix without trailing slash', async () => {
        // ls('/a') should still route to the '/a/' mount.
        const def = new StateBackend()
        const inner = new StateBackend({
            '/inside.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': inner })
        const result = await composite.ls('/a')
        expect('files' in result && result.files.map((f) => f.name)).toEqual(['inside.md'])
    })
})

describe('CompositeBackend.read', () => {
    it('passes path through unchanged when routing to default', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'hello', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const spy = jest.spyOn(def, 'read')
        const composite = new CompositeBackend(def, {})
        const result = await composite.read('/x.md')
        expect(spy).toHaveBeenCalledWith('/x.md', undefined, undefined)
        expect('content' in result && result.content).toBe('hello')
    })

    it('strips the matched prefix when routing to a mount', async () => {
        const inner = new StateBackend({
            '/inside.md': { content: 'mounted', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const spy = jest.spyOn(inner, 'read')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.read('/a/inside.md')
        expect(spy).toHaveBeenCalledWith('/inside.md', undefined, undefined)
        expect('content' in result && result.content).toBe('mounted')
    })

    it('forwards offset and limit to the sub-backend', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'a\nb\nc\nd', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const spy = jest.spyOn(inner, 'read')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        await composite.read('/a/x.md', 1, 2)
        expect(spy).toHaveBeenCalledWith('/x.md', 1, 2)
    })

    it('passes error results through unchanged', async () => {
        const composite = new CompositeBackend(new StateBackend(), {})
        const result = await composite.read('/missing.md')
        expect(result).toMatchObject({ error: expect.stringContaining('/missing.md') })
    })
})

describe('CompositeBackend.readRaw', () => {
    it('strips the matched prefix when routing to a mount', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'm', mimeType: 'text/markdown', created_at: 5, modified_at: 6 }
        })
        const spy = jest.spyOn(inner, 'readRaw')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.readRaw('/a/x.md')
        expect(spy).toHaveBeenCalledWith('/x.md')
        expect('data' in result && result.data.content).toBe('m')
    })

    it('passes path through unchanged when routing to default', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'd', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const spy = jest.spyOn(def, 'readRaw')
        const composite = new CompositeBackend(def, {})
        await composite.readRaw('/x.md')
        expect(spy).toHaveBeenCalledWith('/x.md')
    })
})

describe('CompositeBackend.write', () => {
    it('writes to default and returns the original virtual path', async () => {
        const def = new StateBackend()
        const composite = new CompositeBackend(def, {})
        const result = await composite.write('/x.md', 'hi')
        expect('path' in result && result.path).toBe('/x.md')
        // FilesUpdate keys for default come back unchanged
        expect('filesUpdate' in result && result.filesUpdate).toMatchObject({ '/x.md': expect.any(Object) })
    })

    it('strips prefix on dispatch and re-prepends prefix on result.path', async () => {
        const inner = new StateBackend()
        const writeSpy = jest.spyOn(inner, 'write')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.write('/a/x.md', 'hi')
        expect(writeSpy).toHaveBeenCalledWith('/x.md', 'hi')
        expect('path' in result && result.path).toBe('/a/x.md')
    })

    it('re-keys FilesUpdate entries with the mount prefix when sub-backend returns a state-shaped update', async () => {
        const inner = new StateBackend()
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.write('/a/x.md', 'hi')
        expect('filesUpdate' in result).toBe(true)
        if ('filesUpdate' in result && result.filesUpdate) {
            const keys = Object.keys(result.filesUpdate)
            expect(keys).toEqual(['/a/x.md'])
            expect(result.filesUpdate['/a/x.md']).toMatchObject({ content: 'hi' })
        }
    })

    it('passes filesUpdate through as null for local-style backends', async () => {
        // Stub backend that mimics LocalBackend's null filesUpdate.
        const inner: BackendProtocol = {
            write: async (p) => ({ path: p, filesUpdate: null }),
            read: async () => ({ error: 'unused' }),
            readRaw: async () => ({ error: 'unused' }),
            edit: async () => ({ error: 'unused' }),
            ls: async () => ({ files: [] }),
            glob: async () => ({ files: [], truncated: false }),
            grep: async () => ({ matches: [], truncated: false })
        }
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.write('/a/x.md', 'hi')
        expect('path' in result && result.path).toBe('/a/x.md')
        expect('filesUpdate' in result && result.filesUpdate).toBeNull()
    })

    it('passes error results through unchanged', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'existing', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, {})
        const result = await composite.write('/x.md', 'second')
        expect('error' in result).toBe(true)
    })
})

describe('CompositeBackend.edit', () => {
    it('strips prefix on dispatch and re-prepends prefix on result.path', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'hello world', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const editSpy = jest.spyOn(inner, 'edit')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.edit('/a/x.md', 'world', 'there')
        expect(editSpy).toHaveBeenCalledWith('/x.md', 'world', 'there', false)
        expect('path' in result && result.path).toBe('/a/x.md')
        expect('occurrences' in result && result.occurrences).toBe(1)
    })

    it('re-keys FilesUpdate entries with the mount prefix', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'hello world', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.edit('/a/x.md', 'world', 'there')
        if ('filesUpdate' in result && result.filesUpdate) {
            expect(Object.keys(result.filesUpdate)).toEqual(['/a/x.md'])
        } else {
            throw new Error('expected filesUpdate to be populated')
        }
    })

    it('forwards replaceAll flag to the sub-backend', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'a a a', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const editSpy = jest.spyOn(inner, 'edit')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        await composite.edit('/a/x.md', 'a', 'b', true)
        expect(editSpy).toHaveBeenCalledWith('/x.md', 'a', 'b', true)
    })

    it('passes error results through unchanged', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'no match here', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, {})
        const result = await composite.edit('/x.md', 'absent', 'nope')
        expect('error' in result).toBe(true)
    })
})

describe('CompositeBackend.ls path translation', () => {
    it('re-prepends mount prefix to FileInfo.path entries when listing inside a mount', async () => {
        const inner = new StateBackend({
            '/inside.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.ls('/a/')
        if (!('files' in result)) throw new Error('expected files')
        expect(result.files.map((f) => f.path)).toEqual(['/a/inside.md'])
    })

    it('does NOT synthesize directory entries for registered mounts when listing /', async () => {
        const def = new StateBackend({
            '/workspace/foo.md': { content: 'w', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const inner = new StateBackend({
            '/x.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': inner, '/b/': inner })
        const result = await composite.ls('/')
        if (!('files' in result)) throw new Error('expected files')
        // Only the default backend's root entries — no /a/ or /b/ synthesized.
        expect(result.files.map((f) => f.name).sort()).toEqual(['workspace'])
    })

    it('passes default-backend ls results through unchanged', async () => {
        const def = new StateBackend({
            '/foo/x.md': { content: 'd', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, {})
        const result = await composite.ls('/foo/')
        if (!('files' in result)) throw new Error('expected files')
        expect(result.files.map((f) => f.path)).toEqual(['/foo/x.md'])
    })
})

describe('CompositeBackend.glob', () => {
    it('routes to mount on basePath match and re-prepends prefix to result paths', async () => {
        const inner = new StateBackend({
            '/x.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 },
            '/y.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const globSpy = jest.spyOn(inner, 'glob')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.glob('*.md', '/a/')
        expect(globSpy).toHaveBeenCalledWith('*.md', '/')
        if (!('files' in result)) throw new Error('expected files')
        expect(result.files.map((f) => f.path).sort()).toEqual(['/a/x.md', '/a/y.md'])
    })

    it('passes default-backend glob through unchanged', async () => {
        const def = new StateBackend({
            '/foo.md': { content: 'd', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, {})
        const result = await composite.glob('*.md', '/')
        if (!('files' in result)) throw new Error('expected files')
        expect(result.files.map((f) => f.path)).toEqual(['/foo.md'])
    })

    it('does NOT cross mount boundaries when globbing from /', async () => {
        const def = new StateBackend({
            '/default.md': { content: 'd', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const inner = new StateBackend({
            '/inside.md': { content: 'm', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': inner })
        const result = await composite.glob('**/*.md', '/')
        if (!('files' in result)) throw new Error('expected files')
        // Only default's match; the /a/ mount's inside.md is invisible.
        expect(result.files.map((f) => f.path)).toEqual(['/default.md'])
    })

    it('preserves the truncated flag from the sub-backend', async () => {
        const inner: BackendProtocol = {
            read: async () => ({ error: 'unused' }),
            readRaw: async () => ({ error: 'unused' }),
            write: async () => ({ error: 'unused' }),
            edit: async () => ({ error: 'unused' }),
            ls: async () => ({ files: [] }),
            glob: async () => ({ files: [], truncated: true }),
            grep: async () => ({ matches: [], truncated: false })
        }
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.glob('*', '/a/')
        expect('truncated' in result && result.truncated).toBe(true)
    })

    it('passes error results through unchanged', async () => {
        const inner: BackendProtocol = {
            read: async () => ({ error: 'unused' }),
            readRaw: async () => ({ error: 'unused' }),
            write: async () => ({ error: 'unused' }),
            edit: async () => ({ error: 'unused' }),
            ls: async () => ({ files: [] }),
            glob: async () => ({ error: 'boom' }),
            grep: async () => ({ matches: [], truncated: false })
        }
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.glob('*', '/a/')
        expect('error' in result).toBe(true)
    })
})

describe('CompositeBackend.grep', () => {
    it('routes to mount on dirPath match and re-prepends prefix to match paths', async () => {
        const inner = new StateBackend({
            '/notes.md': { content: 'first line\nfind me\nthird line', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const grepSpy = jest.spyOn(inner, 'grep')
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        const result = await composite.grep('find', '/a/', null)
        expect(grepSpy).toHaveBeenCalledWith('find', '/', null)
        if (!('matches' in result)) throw new Error('expected matches')
        expect(result.matches.map((m) => m.path)).toEqual(['/a/notes.md'])
    })

    it('forwards the glob filter argument to the sub-backend', async () => {
        const inner = new StateBackend()
        const grepSpy = jest.spyOn(inner, 'grep').mockResolvedValue({ matches: [], truncated: false })
        const composite = new CompositeBackend(new StateBackend(), { '/a/': inner })
        await composite.grep('foo', '/a/', '*.md')
        expect(grepSpy).toHaveBeenCalledWith('foo', '/', '*.md')
    })

    it('does NOT cross mount boundaries when grepping from /', async () => {
        const def = new StateBackend({
            '/default.md': { content: 'find me', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const inner = new StateBackend({
            '/mounted.md': { content: 'find me', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const composite = new CompositeBackend(def, { '/a/': inner })
        const result = await composite.grep('find', '/', null)
        if (!('matches' in result)) throw new Error('expected matches')
        expect(result.matches.map((m) => m.path)).toEqual(['/default.md'])
    })

    it('routes to default when dirPath is null', async () => {
        const def = new StateBackend({
            '/x.md': { content: 'find me', mimeType: 'text/markdown', created_at: 0, modified_at: 0 }
        })
        const grepSpy = jest.spyOn(def, 'grep')
        const composite = new CompositeBackend(def, { '/a/': new StateBackend() })
        await composite.grep('find', null, null)
        expect(grepSpy).toHaveBeenCalledWith('find', '/', null)
    })

    it('passes error results through unchanged', async () => {
        const composite = new CompositeBackend(new StateBackend(), {})
        const result = await composite.grep('[invalid', '/', null)
        expect('error' in result).toBe(true)
    })
})
