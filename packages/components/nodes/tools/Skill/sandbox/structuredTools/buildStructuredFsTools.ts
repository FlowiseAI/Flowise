/**
 * Skill — structured filesystem tool builder.
 *
 * One call returns the canonical six-tool toolbelt (`ls`, `read_file`,
 * `write_file`, `edit_file`, `glob`, `grep`) wired to a single
 * `BackendProtocol`. Each tool name is suffixed with the skill slug so
 * multi-Skill chatflows don't collide.
 *
 * Following the architecture (§7.1 + §7.2), structured tools are
 * registered *before* the `execute` tool in the agent's toolbelt — the
 * implicit hierarchy is "structured tools first, shell as escape
 * hatch".
 */

import { StructuredTool } from '@langchain/core/tools'
import { BackendProtocol } from '../../../../../src/sandbox'
import { formatToolName } from '../../utils'
import { LsTool } from './LsTool'
import { ReadFileTool } from './ReadFileTool'
import { WriteFileTool } from './WriteFileTool'
import { EditFileTool } from './EditFileTool'
import { GlobTool } from './GlobTool'
import { GrepTool } from './GrepTool'

export interface BuildStructuredFsToolsOptions {
    backend: BackendProtocol
    /** Skill slug used to suffix tool names. */
    skillSlug: string
    /** Canonical skills root inside the sandbox; surfaced in tool descriptions. */
    skillsDir: string
    /** Canonical output root inside the sandbox; surfaced in write/edit tool descriptions. */
    outputDir: string
}

export const buildStructuredFsTools = (options: BuildStructuredFsToolsOptions): StructuredTool[] => {
    const { backend, skillSlug, skillsDir, outputDir } = options
    const slug = formatToolName(skillSlug || 'skill')

    return [
        new LsTool({
            name: formatToolName(`ls_${slug}`),
            description:
                `List the entries directly under an absolute path inside the skill sandbox. ` +
                `Skill assets live under ${skillsDir}/; LLM-produced artefacts belong under ${outputDir}/. ` +
                `Prefer this over running \`ls\` through the execute tool.`,
            backend
        }),
        new ReadFileTool({
            name: formatToolName(`read_file_${slug}`),
            description:
                `Read the text contents of a file in the skill sandbox. Supports 1-based line ` +
                `\`offset\` and \`limit\` so large files don't poison the context. Prefer this over ` +
                `\`cat\` / \`head\` / \`tail\` through the execute tool.`,
            backend
        }),
        new WriteFileTool({
            name: formatToolName(`write_file_${slug}`),
            description:
                `Write a text file in the skill sandbox. Parent directories are created automatically. ` +
                `Use this to persist results under ${outputDir}/ instead of running \`tee\` or shell ` +
                `redirects through the execute tool.`,
            backend
        }),
        new EditFileTool({
            name: formatToolName(`edit_file_${slug}`),
            description:
                `Replace a substring inside an existing text file in the skill sandbox. Prefer this ` +
                `over \`sed\` / \`awk\` rewrites through the execute tool — the operation is ` +
                `byte-exact and never goes through the shell.`,
            backend
        }),
        new GlobTool({
            name: formatToolName(`glob_${slug}`),
            description:
                `Find files matching a glob pattern (e.g. '**/*.json', '*.py'). Supports *, **, ?, ` +
                `[chars], {a,b}. Defaults the search root to the skills directory.`,
            backend
        }),
        new GrepTool({
            name: formatToolName(`grep_${slug}`),
            description:
                `Search file contents in the skill sandbox for an extended-regex pattern. Returns ` +
                `\`path:line: text\` hits. Prefer this over \`grep -r\` through the execute tool.`,
            backend
        })
    ]
}
