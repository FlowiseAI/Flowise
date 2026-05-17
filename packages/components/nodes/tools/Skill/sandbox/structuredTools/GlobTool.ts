/**
 * Structured filesystem tool — `glob`.
 *
 * Enumerate files matching a glob pattern, rooted at an optional path.
 * Delegates to the backend's `glob(pattern, path)` which handles the
 * shell-side enumeration and in-process glob-to-regex matching.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, GlobResult } from '../../../../../src/sandbox'

const schema = z.object({
    pattern: z.string().min(1).describe("Glob pattern (e.g. '**/*.json' or '*.py'). Supports *, **, ?, [chars], {a,b}."),
    path: z.string().optional().describe('Optional search root; defaults to the sandbox skills directory.')
})

export interface GlobToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class GlobTool extends StructuredTool {
    static lc_name() {
        return 'SkillGlobTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: GlobToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const r = await Promise.resolve(this.backend.glob(input.pattern, input.path))
        return formatGlobResult(r)
    }
}

export const formatGlobResult = (r: GlobResult): string => {
    if (r.error) return `Error: glob ${r.pattern} (in ${r.path}) — ${r.error}`
    if (!r.matches.length) return `(no matches for ${r.pattern} in ${r.path})`
    return r.matches.join('\n')
}
