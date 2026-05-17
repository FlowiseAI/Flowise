/**
 * Structured filesystem tool — `edit_file`.
 *
 * Replace `oldString` with `newString` inside an existing text file via
 * the backend's `edit(path, old, new, replaceAll)`. The backend pulls
 * the file through `downloadFiles`, edits in-process, and pushes it
 * back through `uploadFiles` so writes are byte-exact regardless of
 * shell-quoting hazards.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { BackendProtocol, EditResult } from '../../../../../src/sandbox'

const schema = z.object({
    path: z.string().min(1).describe('Absolute path of the file to edit. The file must already exist.'),
    oldString: z.string().min(1).describe('Substring to replace. Must be unique unless replaceAll is true.'),
    newString: z.string().describe('Replacement substring.'),
    replaceAll: z
        .boolean()
        .optional()
        .describe('When true, every occurrence of oldString is replaced. When false (default), only the first match is replaced.')
})

export interface EditFileToolFields extends ToolParams {
    name: string
    description: string
    backend: BackendProtocol
}

export class EditFileTool extends StructuredTool {
    static lc_name() {
        return 'SkillEditFileTool'
    }

    name: string
    description: string
    schema = schema

    private readonly backend: BackendProtocol

    constructor(fields: EditFileToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.backend = fields.backend
    }

    protected async _call(input: z.infer<typeof schema>): Promise<string> {
        const r = await Promise.resolve(this.backend.edit(input.path, input.oldString, input.newString, input.replaceAll ?? false))
        return formatEditResult(r)
    }
}

export const formatEditResult = (r: EditResult): string => {
    if (r.error) return `Error: edit ${r.path} — ${r.error}`
    return `applied ${r.replacements} replacement${r.replacements === 1 ? '' : 's'} in ${r.path}`
}
