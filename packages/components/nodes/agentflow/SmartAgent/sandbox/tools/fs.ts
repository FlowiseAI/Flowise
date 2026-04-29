import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { BackendProtocol } from '../protocol'
import { formatWithLineNumbers } from '../utils'

export function buildFsTools(backend: BackendProtocol): DynamicStructuredTool[] {
    const readFileTool = new DynamicStructuredTool({
        name: 'read_file',
        description: 'Read a text file from the sandbox filesystem. Returns file contents with line numbers.',
        schema: z.object({
            file_path: z.string().describe('Absolute path of the file to read (e.g. /workspace/hello.txt)'),
            offset: z.number().int().min(0).optional().describe('Line number to start reading from (0-indexed)'),
            limit: z.number().int().min(1).optional().describe('Maximum number of lines to return')
        }),
        func: async ({ file_path, offset, limit }) => {
            const result = await backend.read(file_path, offset, limit)
            if ('error' in result) return `Error: ${result.error}`
            if (result.content instanceof Uint8Array) return 'Error: binary files not supported in demo slice'
            return formatWithLineNumbers(result.content, offset ?? 0)
        }
    })

    const writeFileTool = new DynamicStructuredTool({
        name: 'write_file',
        description:
            'Create a new text file in the sandbox filesystem. write_file is create-only — it will error if the file already exists.',
        schema: z.object({
            file_path: z.string().describe('Absolute path of the file to create (e.g. /workspace/hello.txt)'),
            content: z.string().describe('Text content to write to the file')
        }),
        func: async ({ file_path, content }) => {
            const result = await backend.write(file_path, content)
            if ('error' in result) return `Error: ${result.error}`
            return `Successfully wrote ${result.path}`
        }
    })

    return [readFileTool, writeFileTool]
}
