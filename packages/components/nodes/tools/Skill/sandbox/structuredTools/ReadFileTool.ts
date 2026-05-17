/**
 * Structured filesystem tool — `read_file`.
 *
 * Reads a (sliced) text file through the backend's `read(path, offset,
 * limit)` method. The slicing happens at the backend layer so large
 * files don't traverse the network whole.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, ReadResult } from '../../../../../src/sandbox'

const schema = z.object({
    path: z.string().min(1).describe('Absolute path to the file to read.'),
    offset: z.number().int().positive().optional().describe('1-based line number to start reading from.'),
    limit: z.number().int().positive().optional().describe('Maximum number of lines to read.')
})

export interface ReadFileToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class ReadFileTool extends StructuredTool {
    static lc_name() {
        return 'SkillReadFileTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: ReadFileToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const r = await Promise.resolve(this.backend.read(input.path, input.offset, input.limit))
        return formatReadResult(r)
    }
}

export const formatReadResult = (r: ReadResult): string => {
    if (r.error) return `Error: read ${r.path} — ${r.error}`
    if (r.content === null) return `Error: read ${r.path} — empty response`
    const header: string[] = []
    if (typeof r.offset === 'number' || typeof r.limit === 'number') {
        const from = r.offset ?? 1
        const to = typeof r.limit === 'number' ? from + r.limit - 1 : from
        header.push(`[Showing lines ${from}-${to}${typeof r.totalLines === 'number' ? ` of ${r.totalLines}` : ''}]`)
    }
    return header.length ? `${header.join('\n')}\n${r.content}` : r.content
}
