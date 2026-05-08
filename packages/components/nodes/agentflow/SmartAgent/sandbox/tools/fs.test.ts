import { buildExecuteTool, buildFsTools } from './fs'
import { StateBackend } from '../backends/StateBackend'
import { FilesUpdate } from '../BackendProtocol'
import type { ExecuteResult, ShellBackendProtocol } from '../BackendProtocol'
import { MAX_BINARY_READ_SIZE_BYTES } from '../utils'

function findTool(tools: ReturnType<typeof buildFsTools>, name: string) {
    const tool = tools.find((t) => t.name === name)
    if (!tool) throw new Error(`tool not found: ${name}`)
    return tool
}

describe('buildFsTools — onFilesUpdate', () => {
    it('write_file invokes onFilesUpdate with backend FilesUpdate on success', async () => {
        const backend = new StateBackend()
        const updates: FilesUpdate[] = []
        const tools = buildFsTools(backend, (update) => updates.push(update))
        const writeFile = findTool(tools, 'write_file')

        const result = await writeFile.invoke({ file_path: '/x.txt', content: 'hello' })

        expect(result).toContain('Successfully wrote')
        expect(updates).toHaveLength(1)
        expect(updates[0]['/x.txt']).toBeDefined()
        expect(updates[0]['/x.txt']!.content).toBe('hello')
    })

    it('write_file does NOT invoke onFilesUpdate when path already exists', async () => {
        const backend = new StateBackend()
        const updates: FilesUpdate[] = []
        const tools = buildFsTools(backend, (update) => updates.push(update))
        const writeFile = findTool(tools, 'write_file')

        await writeFile.invoke({ file_path: '/dup.txt', content: 'first' })
        const second = await writeFile.invoke({ file_path: '/dup.txt', content: 'second' })

        expect(second).toMatch(/Error/i)
        // First successful write should have produced one update; the failing duplicate must NOT add another.
        expect(updates).toHaveLength(1)
    })

    it('read_file never invokes onFilesUpdate', async () => {
        const backend = new StateBackend()
        await backend.write('/r.txt', 'content')
        const updates: FilesUpdate[] = []
        const tools = buildFsTools(backend, (update) => updates.push(update))
        const readFile = findTool(tools, 'read_file')

        await readFile.invoke({ file_path: '/r.txt' })

        expect(updates).toHaveLength(0)
    })
})

describe('buildFsTools — read_file binary content blocks', () => {
    it('returns image content block for png', async () => {
        const backend = new StateBackend()
        const png = new Uint8Array([137, 80, 78, 71])
        await backend.write('/img.png', png)
        const tools = buildFsTools(backend)
        const readFile = findTool(tools, 'read_file')

        const result = await readFile.invoke({ file_path: '/img.png' })

        expect(Array.isArray(result)).toBe(true)
        const arr = result as Array<{ type: string; mimeType: string; data: string }>
        expect(arr).toHaveLength(1)
        expect(arr[0].type).toBe('image')
        expect(arr[0].mimeType).toBe('image/png')
        expect(arr[0].data).toBe(Buffer.from([137, 80, 78, 71]).toString('base64'))
    })

    it('returns audio content block for mp3', async () => {
        const backend = new StateBackend()
        await backend.write('/song.mp3', new Uint8Array([255, 251, 144]))
        const tools = buildFsTools(backend)
        const readFile = findTool(tools, 'read_file')
        const result = await readFile.invoke({ file_path: '/song.mp3' })
        const arr = result as Array<{ type: string }>
        expect(Array.isArray(result)).toBe(true)
        expect(arr[0].type).toBe('audio')
    })

    it('returns generic file content block for non-media binary mime', async () => {
        const backend = new StateBackend()
        await backend.write('/module.wasm', new Uint8Array([0, 97, 115, 109]))
        const tools = buildFsTools(backend)
        const readFile = findTool(tools, 'read_file')
        const result = await readFile.invoke({ file_path: '/module.wasm' })
        const arr = result as Array<{ type: string }>
        expect(Array.isArray(result)).toBe(true)
        expect(arr[0].type).toBe('file')
    })

    it('returns error string for binary file exceeding the size cap', async () => {
        const backend = new StateBackend()
        const oversize = new Uint8Array(MAX_BINARY_READ_SIZE_BYTES + 1)
        await backend.write('/big.png', oversize)
        const tools = buildFsTools(backend)
        const readFile = findTool(tools, 'read_file')
        const result = await readFile.invoke({ file_path: '/big.png' })
        expect(typeof result).toBe('string')
        expect(result as string).toContain('exceeds')
    })

    it('still returns line-numbered string for text files', async () => {
        const backend = new StateBackend()
        await backend.write('/hello.txt', 'line1\nline2')
        const tools = buildFsTools(backend)
        const readFile = findTool(tools, 'read_file')
        const result = await readFile.invoke({ file_path: '/hello.txt' })
        expect(typeof result).toBe('string')
        expect(result as string).toContain('line1')
    })
})

function stubShellBackend(execute: (cmd: string) => Promise<ExecuteResult>): ShellBackendProtocol {
    return { execute } as unknown as ShellBackendProtocol
}

describe('buildExecuteTool', () => {
    it('forwards command to backend.execute and returns the output string', async () => {
        let received = ''
        const backend = stubShellBackend(async (cmd) => {
            received = cmd
            return { output: 'hello\n', exitCode: 0, truncated: false }
        })
        const tool = buildExecuteTool(backend)
        const result = await tool.invoke({ command: 'echo hello' })
        expect(received).toBe('echo hello')
        expect(result).toBe('hello\n')
    })

    it('returns the output verbatim when truncated (the [output truncated] suffix is already in output)', async () => {
        const backend = stubShellBackend(async () => ({ output: 'a'.repeat(100) + '\n\n[output truncated]', exitCode: 0, truncated: true }))
        const tool = buildExecuteTool(backend)
        const result = await tool.invoke({ command: 'irrelevant' })
        expect(result).toContain('[output truncated]')
    })

    it('exposes the tool name "execute" and a non-empty description', () => {
        const tool = buildExecuteTool(stubShellBackend(async () => ({ output: '', exitCode: 0, truncated: false })))
        expect(tool.name).toBe('execute')
        expect(tool.description.length).toBeGreaterThan(0)
    })
})
