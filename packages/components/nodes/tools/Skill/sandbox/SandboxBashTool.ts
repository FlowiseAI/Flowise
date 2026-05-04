/**
 * Skill — LLM-facing bash tool.
 *
 * A single `StructuredTool` that takes one shell command and runs it
 * inside the shared [`SandboxSession`](./SandboxSession.ts). The tool
 * *is* the LLM's entire execution surface in sandbox mode — `python3`,
 * `node`, `cat`, `pdftotext`, `curl`, `ls`, …, whatever the author's
 * skill documentation tells the model to do, it goes through here.
 *
 * Contract with the agent runtime:
 *   - The tool name follows `bash_<skillSlug>` so multiple Skill nodes
 *     in a flow don't collide.
 *   - The returned string is JSON-stringified with the same envelope
 *     shape as the legacy `exec_skill_code` (`{status, stdout, stderr,
 *     exitCode, error?, durationMs, engine}`). Prompts written for
 *     exec_skill_code continue to parse correctly.
 *   - `_call` NEVER throws out to the agent — shell-level failures,
 *     timeouts, and host errors all flow through the envelope. This
 *     keeps the function-calling loop deterministic.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { FamilyDef, formatTaskCommand, groupByRecipeFamily, RecipeTask, renderHelperCatalog } from './commandRecipes'
import { absolutePath, SandboxManifest } from './SandboxManifest'
import { SandboxSession } from './SandboxSession'

// ---------------------------------------------------------------------------
// Tool argument schema (LLM-visible)
// ---------------------------------------------------------------------------

const bashSchema = z.object({
    command: z
        .string()
        .min(1)
        .describe(
            'Bash command to run inside the sandbox VM. ' +
                'Working directory is /home/user; all skill files live under skills/ and any files you create for the user should go under output/.'
        ),
    timeout_ms: z.number().int().positive().optional().describe('Optional per-call timeout in milliseconds. Clamped to the server ceiling.')
})

export type SandboxBashArgs = z.infer<typeof bashSchema>

// ---------------------------------------------------------------------------
// Envelope shape returned to the LLM
// ---------------------------------------------------------------------------

interface BashEnvelope {
    status: 'ok' | 'error'
    stdout: string
    stderr: string
    exitCode: number
    error?: {
        kind: 'timeout' | 'runtime' | 'internal' | 'disabled' | 'unsupported'
        message: string
    }
    durationMs: number
    engine: string
}

// ---------------------------------------------------------------------------
// Constructor options
// ---------------------------------------------------------------------------

export interface SandboxBashToolFields extends ToolParams {
    name: string
    description: string
    session: SandboxSession
}

// ---------------------------------------------------------------------------
// The tool
// ---------------------------------------------------------------------------

export class SandboxBashTool extends StructuredTool {
    static lc_name() {
        return 'SandboxBashTool'
    }

    name: string
    description: string
    schema = bashSchema

    private readonly session: SandboxSession

    constructor(fields: SandboxBashToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.session = fields.session
    }

    protected async _call(input: SandboxBashArgs): Promise<string> {
        const envelope = await this.run(input)
        return JSON.stringify(envelope)
    }

    /**
     * Public test seam — the pipeline is identical to `_call` but returns
     * the typed envelope instead of a JSON string.
     */
    async run(input: SandboxBashArgs): Promise<BashEnvelope> {
        const started = Date.now()
        const command = typeof input?.command === 'string' ? input.command.trim() : ''
        console.log(`[SandboxBashTool] Executing command: ${command} (timeout_ms=${input.timeout_ms ?? 'none'})`)
        if (!command) {
            return {
                status: 'error',
                stdout: '',
                stderr: '',
                exitCode: 1,
                error: { kind: 'unsupported', message: 'Missing "command" argument' },
                durationMs: Date.now() - started,
                engine: 'e2b-bash'
            }
        }

        const result = await this.session.exec(command, input?.timeout_ms)
        return {
            status: result.ok ? 'ok' : 'error',
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            // When the guest itself exited non-zero but no host error was
            // hit, we synthesise a small `runtime` descriptor so the LLM
            // has a stable signal; skip it when the envelope is already
            // clean (ok=true) to keep the JSON compact.
            error: result.error
                ? { kind: result.error.kind, message: result.error.message }
                : result.ok
                ? undefined
                : { kind: 'runtime', message: firstLine(result.stderr) || 'non-zero exit' },
            durationMs: result.durationMs,
            engine: 'e2b-bash'
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const firstLine = (s: string): string => {
    if (!s) return ''
    const i = s.indexOf('\n')
    return i === -1 ? s : s.slice(0, i)
}

/**
 * Compose the description the LLM sees for the bash tool.
 *
 * The description is assembled in four sections so the model can:
 *   1. Understand the contract (`intro`).
 *   2. Reach for productive commands first (`productivity`).
 *   3. See the canonical primary command for every reachable file
 *      (`per-file primary`).
 *   4. Discover per-family alternatives like `grep -nE`, `jq`, `pdfgrep`,
 *      `head -n N` — taught once per family rather than per file
 *      (`per-family productive`).
 *
 * Per-file groups are capped at `MAX_ENTRIES_PER_GROUP`; productive
 * blocks are capped at `MAX_PRODUCTIVE_PER_FAMILY`. Together they keep
 * the description well under ~3 KB even with a manifest that touches
 * every family.
 */
const MAX_ENTRIES_PER_GROUP = 8
const MAX_PRODUCTIVE_PER_FAMILY = 4

export const buildBashToolDescription = (manifest: SandboxManifest, engineLabel: string): string => {
    const intro =
        `Run a shell command inside the skill sandbox VM (engine: ${engineLabel}). ` +
        `Working directory is /home/user; all reachable skill files live under ${manifest.skillsDir}/ ` +
        `and any artefacts you want to hand back to the user should go into ${manifest.outputDir}/. ` +
        `Returns a JSON envelope { status, stdout, stderr, exitCode, error?, durationMs, engine }; ` +
        `stdout/stderr are clipped, so pipe large outputs through head/tail or write them to ${manifest.outputDir}/ and inspect with cat.`

    if (!manifest.entries.length) {
        return `${intro}\n\nNo skill files were reachable — the sandbox is empty beyond the default image.`
    }

    const helpersAvailable = manifest.helpers.length > 0
    const groups = groupByRecipeFamily(manifest.entries, { helpersAvailable })

    // Section 2 — productivity tips. Always rendered (cheap to keep).
    const productivity: string[] = [
        '',
        '',
        'Productivity rules — DO NOT default to `cat` for data files:',
        '- Always peek first: the per-file commands below are deliberately `head`/`tail` probes, not full reads. Run those before anything else.',
        "- To find specific content, use `grep -nE '<pattern>' <path>` (or `pdfgrep` for PDFs, `jq` for JSON, `yq` for YAML, `xmllint --xpath` for XML) — never re-read the whole file.",
        '- Need the entire file? Confirm size first with `wc -c <path>` and only then escalate to the explicit `cat <path>` alternative listed under "Productive commands per family" below.',
        '- For markdown skill files, you usually already have the content from the per-skill tool response — re-reading them with `cat` is wasted tokens.',
        '- Pipe noisy outputs through `head -n 200` or write to ' +
            manifest.outputDir +
            '/ and re-read selectively to stay under the stdout clamp.'
    ]

    // Section 3 — per-file starter commands. Headline emphasises that
    // these are productive defaults (peek/probe/list), NOT authoritative
    // full-reads — escalate via the per-family block when peeks aren't
    // enough.
    const perFile: string[] = [
        '',
        '',
        'Starter commands per file (productive peeks/probes — escalate via "Productive commands per family" below for full reads, search, or query):'
    ]
    for (const { def, entries } of groups) {
        const shown = entries.slice(0, MAX_ENTRIES_PER_GROUP)
        const omitted = entries.length - shown.length
        perFile.push(`- ${def.label}:`)
        for (const entry of shown) {
            const cmd = formatTaskCommand(def.primary, absolutePath(manifest, entry), undefined, manifest.helpersDir)
            perFile.push(`    • ${entry.relPath} → ${cmd}`)
        }
        if (omitted > 0) {
            perFile.push(`    • …and ${omitted} more; run \`ls ${manifest.skillsDir}\` to list them.`)
        }
    }

    // Section 4 — built-in helpers (only when materialised in the VM).
    // Surfaced before the per-family productive block so the LLM sees
    // the canonical helper invocation before the fallback alternatives.
    const helperLines = renderHelperCatalog(manifest)
    const helperSection: string[] = []
    if (helperLines.length) {
        helperSection.push('', '', `Built-in helpers (always available under ${manifest.helpersDir}):`, ...helperLines)
    }

    // Section 5 — per-family productive commands. Skip families with no
    // alternatives (the four exec-* families): the primary command IS
    // the productive move.
    const productiveFamilies = groups.filter(({ def }) => def.alternatives.length > 0)
    const perFamily: string[] = []
    if (productiveFamilies.length) {
        perFamily.push('', '', 'Productive commands per family (template-only — substitute <pattern> / <query> / <inner-path>):')
        for (const { def } of productiveFamilies) {
            perFamily.push(`- ${def.label}:`)
            const tasks = pickFamilyProductive(def, MAX_PRODUCTIVE_PER_FAMILY)
            for (const task of tasks) {
                perFamily.push(
                    `    • ${task.template
                        .replace('{path}', '<path>')
                        .replace('{args}', '')
                        .replace('{helpers_dir}', manifest.helpersDir)} — ${task.description}`
                )
            }
        }
    }

    const description = intro + productivity.join('\n') + perFile.join('\n') + helperSection.join('\n') + perFamily.join('\n')
    console.log('[buildBashToolDescription] Generated bash tool description:\n' + description)
    return description
}

/**
 * Collapse the family's `alternatives` (and bubble the primary up when
 * there is no useful alternative ordering, e.g. `cat` is already the
 * recommended baseline) into a deduplicated list of up to `n` tasks.
 */
const pickFamilyProductive = (def: FamilyDef, n: number): RecipeTask[] => {
    if (n <= 0) return []
    const seen = new Set<string>()
    const out: RecipeTask[] = []
    for (const task of def.alternatives) {
        if (seen.has(task.template)) continue
        seen.add(task.template)
        out.push(task)
        if (out.length >= n) break
    }
    return out
}
