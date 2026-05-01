import { buildFsTools } from './fs'
import { StateBackend } from '../backends/StateBackend'
import { FilesUpdate } from '../BackendProtocol'

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
