import { Tool, ToolParams } from '@langchain/core/tools'

/**
 * Thin LangChain `Tool` wrapper around one pre-compiled `SkillBundleEntry`.
 *
 * All compilation work is already done server-side by `SkillCompiler.compileAll`;
 * at runtime we just return the stored resolved markdown (verbatim — Flowise
 * runtime placeholders such as `{{question}}` are left for the call-site
 * resolver in `packages/server/src/utils/index.ts#getVariableValue`).
 */
export class SkillFileTool extends Tool {
    name: string
    description: string
    private readonly content: string
    private readonly toolHint: string | null
    // Surfaced so callers (e.g. the filtering step in `Skill.init`) can identify
    // which tree-node this tool wraps without reaching into private state.
    readonly nodeId: string

    constructor(
        fields: ToolParams & {
            name: string
            description: string
            content: string
            toolHint?: string | null
            nodeId: string
        }
    ) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.content = fields.content
        this.toolHint = fields.toolHint ?? null
        this.nodeId = fields.nodeId
    }

    /**
     * Return the resolved markdown content, optionally with a tool hint appended.
     * The tool hint is a human-readable reminder of what tools the LLM can call
     * from this file node.
     * Examples:
        ```markdown
        Suggested invocations (one command per file, use these as starting points):
        - Execute with Node.js:
            • scoring_algorithm.js → node /home/user/skills/scoring_algorithm.js [args...]
        - Read as text:
            • email-drafter.md → cat /home/user/skills/email-drafter.md
            • interview-questions.md → cat /home/user/skills/interview-questions.md
            • job-description.txt → cat /home/user/skills/job-description.txt
            • resume-screener.md → cat /home/user/skills/resume-screener.md
        ```
     */
    async _call(_input: string): Promise<string> {
        if (this.toolHint) {
            return `${this.content}\n\n${this.toolHint}`
        }
        return this.content
    }
}
