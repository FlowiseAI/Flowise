import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { BackendProtocol, FilesUpdate, ShellBackendProtocol } from '../BackendProtocol'
import { formatWithLineNumbers, MAX_BINARY_READ_SIZE_BYTES, toMultimodalContentBlock } from '../utils'

export function buildFsTools(backend: BackendProtocol, onFilesUpdate?: (update: FilesUpdate) => void): DynamicStructuredTool[] {
    const readFileTool = new DynamicStructuredTool({
        name: 'read_file',
        description:
            'Read a file from the sandbox filesystem. Text files return line-numbered contents. Image files are forwarded to the model and readable by any vision-capable model. Audio, video, and PDF files are forwarded as multimodal blocks but are only readable by models with native support for that modality (e.g. Anthropic for PDFs, Gemini for audio/video) — calling this on such files with a non-supporting model will error. Subject to a 5 MB cap.',
        schema: z.object({
            file_path: z.string().describe('Absolute path of the file to read (e.g. /workspace/hello.txt)'),
            offset: z.number().int().min(0).optional().describe('Line number to start reading from (0-indexed). Ignored for binary files.'),
            limit: z.number().int().min(1).optional().describe('Maximum number of lines to return. Ignored for binary files.')
        }),
        func: async ({ file_path, offset, limit }) => {
            const result = await backend.read(file_path, offset, limit)
            if ('error' in result) return `Error: ${result.error}`
            if (result.content instanceof Uint8Array) {
                if (result.content.byteLength > MAX_BINARY_READ_SIZE_BYTES) {
                    return `Error: ${file_path} is ${result.content.byteLength} bytes; exceeds the ${MAX_BINARY_READ_SIZE_BYTES}-byte cap.`
                }
                return [toMultimodalContentBlock(result.content, result.mimeType)]
            }
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
            if (result.filesUpdate) onFilesUpdate?.(result.filesUpdate)
            return `Successfully wrote ${result.path}`
        }
    })

    const editFileTool = new DynamicStructuredTool({
        name: 'edit_file',
        description:
            'Edit an existing text file by replacing a specific string. Fails if the string appears more than once unless replace_all is true.',
        schema: z.object({
            file_path: z.string().describe('Absolute path of the file to edit (e.g. /workspace/hello.txt)'),
            old_str: z.string().min(1).describe('Exact string to find and replace'),
            new_str: z.string().describe('String to replace it with'),
            replace_all: z.boolean().optional().describe('Replace every occurrence instead of requiring exactly one (default false)')
        }),
        func: async ({ file_path, old_str, new_str, replace_all }) => {
            const result = await backend.edit(file_path, old_str, new_str, replace_all ?? false)
            if ('error' in result) return `Error: ${result.error}`
            if (result.filesUpdate) onFilesUpdate?.(result.filesUpdate)
            return `Edited ${result.path} (${result.occurrences} replacement${result.occurrences === 1 ? '' : 's'})`
        }
    })

    const listFilesTool = new DynamicStructuredTool({
        name: 'list_files',
        description: 'List files and directories at a given path in the sandbox filesystem.',
        schema: z.object({
            dir_path: z.string().describe('Absolute directory path to list (e.g. /workspace or /)')
        }),
        func: async ({ dir_path }) => {
            const result = await backend.ls(dir_path)
            if ('error' in result) return `Error: ${result.error}`
            if (!result.files.length) return `(empty directory)`
            return result.files.map((f) => `${f.isDirectory ? 'd' : 'f'}  ${f.path}${f.isDirectory ? '/' : ''}  ${f.size}b`).join('\n')
        }
    })

    const globFilesTool = new DynamicStructuredTool({
        name: 'glob_files',
        description: 'Find files matching a glob pattern (e.g. **/*.ts) within a base directory.',
        schema: z.object({
            pattern: z.string().describe('Glob pattern (e.g. **/*.ts, *.txt)'),
            base_path: z.string().optional().describe('Base directory to search from (default /)')
        }),
        func: async ({ pattern, base_path }) => {
            const result = await backend.glob(pattern, base_path ?? '/')
            if ('error' in result) return `Error: ${result.error}`
            if (!result.files.length) return `No files matched pattern "${pattern}"`
            return result.files.map((f) => f.path).join('\n')
        }
    })

    const grepFilesTool = new DynamicStructuredTool({
        name: 'grep_files',
        description: 'Search file contents for a regex pattern. Returns matching lines with file path and line number.',
        schema: z.object({
            pattern: z.string().min(1).describe('Regex pattern to search for (e.g. "function|const")'),
            dir_path: z.string().optional().describe('Directory to search in (default /). Pass null to search all files.'),
            glob: z.string().optional().describe('Optional glob to filter filenames (e.g. *.ts)')
        }),
        func: async ({ pattern, dir_path, glob }) => {
            const result = await backend.grep(pattern, dir_path ?? '/', glob ?? null)
            if ('error' in result) return `Error: ${result.error}`
            if (!result.matches.length) return `No matches for "${pattern}"`
            return result.matches.map((m) => `${m.path}:${m.line}  ${m.content}`).join('\n')
        }
    })

    return [readFileTool, writeFileTool, editFileTool, listFilesTool, globFilesTool, grepFilesTool]
}

export function buildExecuteTool(backend: ShellBackendProtocol): DynamicStructuredTool {
    return new DynamicStructuredTool({
        name: 'execute',
        description:
            'Run a shell command in the sandbox. Returns combined stdout/stderr (stderr lines prefixed "[stderr] "), exit code annotated when non-zero, output truncated at ~100 KB, 30-second timeout.',
        schema: z.object({
            command: z.string().min(1).describe('Shell command to execute (e.g. "npm test", "cd /workspace && python script.py")')
        }),
        func: async ({ command }) => {
            const result = await backend.execute(command)
            return result.output
        }
    })
}
