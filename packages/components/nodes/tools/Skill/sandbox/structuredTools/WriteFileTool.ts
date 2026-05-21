/**
 * Structured filesystem tool — `write_file`.
 *
 * Writes a text file through the backend's `write(path, content)`
 * method. The backend goes through `uploadFiles` under the hood so the
 * write is byte-exact and never touches the shell.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, WriteResult } from '../../../../../src/sandbox'

const schema = z.object({
    path: z.string().min(1).describe('Absolute path of the file to write. Parent directories are created automatically.'),
    content: z.string().describe('Full file contents. Existing files are overwritten.')
})

export interface WriteFileToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class WriteFileTool extends StructuredTool {
    static lc_name() {
        return 'SkillWriteFileTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: WriteFileToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const r = await Promise.resolve(this.backend.write(input.path, input.content))
        return formatWriteResult(r)
    }
}

export const formatWriteResult = (r: WriteResult): string => {
    if (r.error) return `Error: write ${r.path} — ${r.error}`
    const verb = r.overwrote ? 'overwrote' : 'created'
    const size = typeof r.bytesWritten === 'number' ? ` (${r.bytesWritten} bytes)` : ''
    return `${verb} ${r.path}${size}`
}
