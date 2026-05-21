/**
 * Structured filesystem tool — `grep`.
 *
 * Search file contents for an extended-regex pattern. Delegates to the
 * backend's `grep(pattern, path, glob)` which handles the host-portable
 * shell expansion (`grep -rnE` vs. `find … -exec grep -nE`).
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, GrepResult } from '../../../../../src/sandbox'

const schema = z.object({
    pattern: z.string().min(1).describe('Extended regex pattern to search for.'),
    path: z.string().optional().describe('Optional search root; defaults to the sandbox skills directory.'),
    glob: z.string().optional().describe("Optional glob restricting which files to search (e.g. '*.py').")
})

export interface GrepToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class GrepTool extends StructuredTool {
    static lc_name() {
        return 'SkillGrepTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: GrepToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const r = await Promise.resolve(this.backend.grep(input.pattern, input.path, input.glob))
        return formatGrepResult(r)
    }
}

export const formatGrepResult = (r: GrepResult): string => {
    if (r.error) return `Error: grep ${r.pattern} (in ${r.path}) — ${r.error}`
    if (!r.hits.length) return `(no hits for ${r.pattern} in ${r.path})`
    return r.hits.map((h) => `${h.path}:${h.line}: ${h.text}`).join('\n')
}
