/**
 * Structured filesystem tools — verify each forwards to the backend
 * with the right arguments and renders the deterministic text envelope.
 */

import type { BackendProtocol } from '../../../../../src/sandbox'
import { LsTool, formatLsResult } from './LsTool'
import { ReadFileTool, formatReadResult } from './ReadFileTool'
import { WriteFileTool, formatWriteResult } from './WriteFileTool'
import { EditFileTool, formatEditResult } from './EditFileTool'
import { GlobTool, formatGlobResult } from './GlobTool'
import { GrepTool, formatGrepResult } from './GrepTool'
import { buildStructuredFsTools } from './buildStructuredFsTools'

const makeFakeBackend = (): BackendProtocol & { _spies: any } => {
    const ls = jest.fn(async (path: string) => ({ path, entries: [] }))
    const read = jest.fn(async (path: string) => ({ path, content: 'hi' }))
    const readRaw = jest.fn(async (path: string) => ({ path, content: null }))
    const write = jest.fn(async (path: string) => ({ path, bytesWritten: 5, overwrote: false }))
    const edit = jest.fn(async (path: string) => ({ path, replacements: 1 }))
    const glob = jest.fn(async (pattern: string, path?: string) => ({ pattern, path: path ?? '.', matches: [] }))
    const grep = jest.fn(async (pattern: string, path?: string) => ({ pattern, path: path ?? '.', hits: [] }))
    return { ls, read, readRaw, write, edit, glob, grep, _spies: { ls, read, readRaw, write, edit, glob, grep } } as any
}

describe('LsTool', () => {
    it('forwards path to backend.ls and renders entries', async () => {
        const backend = makeFakeBackend()
        backend._spies.ls.mockResolvedValueOnce({
            path: '/p',
            entries: [
                { name: 'a.txt', path: '/p/a.txt', type: 'file', size: 10 },
                { name: 'sub', path: '/p/sub', type: 'dir', size: 0 }
            ]
        })
        const t = new LsTool({ name: 'ls_test', description: '', backend })
        const out = await t.invoke({ path: '/p' })
        expect(backend._spies.ls).toHaveBeenCalledWith('/p')
        expect(out).toContain('a.txt')
        expect(out).toContain('sub')
    })

    it('renders empty directories as "(empty) <path>"', () => {
        expect(formatLsResult({ path: '/p', entries: [] })).toBe('(empty) /p')
    })

    it('surfaces error as Error: ls …', () => {
        expect(formatLsResult({ path: '/p', entries: [], error: 'file_not_found' })).toContain('Error: ls /p — file_not_found')
    })
})

describe('ReadFileTool', () => {
    it('forwards path/offset/limit to backend.read', async () => {
        const backend = makeFakeBackend()
        const t = new ReadFileTool({ name: 'read_test', description: '', backend })
        await t.invoke({ path: '/f', offset: 1, limit: 10 })
        expect(backend._spies.read).toHaveBeenCalledWith('/f', 1, 10)
    })

    it('renders sliced content with a header', () => {
        expect(formatReadResult({ path: '/f', content: 'hi', offset: 1, limit: 1, totalLines: 5 })).toBe('[Showing lines 1-1 of 5]\nhi')
    })

    it('renders full reads verbatim', () => {
        expect(formatReadResult({ path: '/f', content: 'hi', totalLines: 1 })).toBe('hi')
    })

    it('renders errors as Error: read …', () => {
        expect(formatReadResult({ path: '/f', content: null, error: 'file_not_found' })).toContain('Error: read /f — file_not_found')
    })
})

describe('WriteFileTool', () => {
    it('forwards path/content to backend.write', async () => {
        const backend = makeFakeBackend()
        const t = new WriteFileTool({ name: 'write_test', description: '', backend })
        await t.invoke({ path: '/f', content: 'hello' })
        expect(backend._spies.write).toHaveBeenCalledWith('/f', 'hello')
    })

    it('renders created / overwrote correctly', () => {
        expect(formatWriteResult({ path: '/f', bytesWritten: 5, overwrote: false })).toBe('created /f (5 bytes)')
        expect(formatWriteResult({ path: '/f', bytesWritten: 5, overwrote: true })).toBe('overwrote /f (5 bytes)')
    })
})

describe('EditFileTool', () => {
    it('forwards replaceAll to backend.edit', async () => {
        const backend = makeFakeBackend()
        const t = new EditFileTool({ name: 'edit_test', description: '', backend })
        await t.invoke({ path: '/f', oldString: 'a', newString: 'b', replaceAll: true })
        expect(backend._spies.edit).toHaveBeenCalledWith('/f', 'a', 'b', true)
    })

    it('renders replacements count', () => {
        expect(formatEditResult({ path: '/f', replacements: 1 })).toBe('applied 1 replacement in /f')
        expect(formatEditResult({ path: '/f', replacements: 3 })).toBe('applied 3 replacements in /f')
    })

    it('surfaces old_string_not_found as Error: edit …', () => {
        expect(formatEditResult({ path: '/f', replacements: 0, error: 'old_string_not_found' })).toContain(
            'Error: edit /f — old_string_not_found'
        )
    })
})

describe('GlobTool', () => {
    it('forwards pattern/path to backend.glob', async () => {
        const backend = makeFakeBackend()
        const t = new GlobTool({ name: 'glob_test', description: '', backend })
        await t.invoke({ pattern: '**/*.json', path: '/r' })
        expect(backend._spies.glob).toHaveBeenCalledWith('**/*.json', '/r')
    })

    it('renders matches one per line', () => {
        expect(formatGlobResult({ pattern: '*.json', path: '/r', matches: ['/r/a.json', '/r/b.json'] })).toBe('/r/a.json\n/r/b.json')
    })

    it('renders empty matches as "(no matches …)"', () => {
        expect(formatGlobResult({ pattern: '*.json', path: '/r', matches: [] })).toBe('(no matches for *.json in /r)')
    })
})

describe('GrepTool', () => {
    it('forwards pattern/path/glob to backend.grep', async () => {
        const backend = makeFakeBackend()
        const t = new GrepTool({ name: 'grep_test', description: '', backend })
        await t.invoke({ pattern: 'import', path: '/r', glob: '*.py' })
        expect(backend._spies.grep).toHaveBeenCalledWith('import', '/r', '*.py')
    })

    it('renders hits as path:line: text', () => {
        const r = formatGrepResult({
            pattern: 'x',
            path: '/r',
            hits: [
                { path: '/r/a.py', line: 1, text: 'foo' },
                { path: '/r/a.py', line: 2, text: 'bar' }
            ]
        })
        expect(r).toBe('/r/a.py:1: foo\n/r/a.py:2: bar')
    })
})

describe('buildStructuredFsTools', () => {
    it('returns six tools with skill-suffixed names', () => {
        const backend = makeFakeBackend()
        const tools = buildStructuredFsTools({
            backend,
            skillSlug: 'recruiting',
            skillsDir: '/home/user/skills',
            outputDir: '/home/user/output'
        })
        const names = tools.map((t) => t.name).sort()
        expect(names).toEqual(
            [
                'ls_recruiting',
                'read_file_recruiting',
                'write_file_recruiting',
                'edit_file_recruiting',
                'glob_recruiting',
                'grep_recruiting'
            ].sort()
        )
        for (const t of tools) {
            expect(typeof t.description).toBe('string')
            expect(t.description.length).toBeGreaterThan(0)
        }
    })
})
