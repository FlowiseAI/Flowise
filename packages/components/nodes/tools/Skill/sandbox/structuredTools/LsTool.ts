/**
 * Structured filesystem tool — `ls`.
 *
 * Lists the entries directly under a directory. Delegates to the
 * backend's `ls(path)` which already abstracts away GNU vs. busybox vs.
 * BSD probing.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, LsResult } from '../../../../../src/sandbox'

const schema = z.object({
    path: z.string().min(1).describe('Absolute path to list. Defaults to the skills directory if you pass /home/user/skills.')
})

export interface LsToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class LsTool extends StructuredTool {
    static lc_name() {
        return 'SkillLsTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: LsToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const result = await Promise.resolve(this.backend.ls(input.path))
        return formatLsResult(result)
    }
}

export const formatLsResult = (r: LsResult): string => {
    if (r.error) {
        return `Error: ls ${r.path} — ${r.error}`
    }
    if (!r.entries.length) {
        return `(empty) ${r.path}`
    }
    const lines = [`${r.path}:`]
    for (const e of r.entries) {
        const sz = typeof e.size === 'number' ? String(e.size) : '-'
        const tag = e.type === 'dir' ? 'd' : e.type === 'symlink' ? 'l' : e.type === 'file' ? 'f' : '?'
        lines.push(`  ${tag}  ${sz.padStart(10)}  ${e.name}`)
    }
    return lines.join('\n')
}
