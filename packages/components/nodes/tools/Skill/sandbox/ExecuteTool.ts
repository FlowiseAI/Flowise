/**
 * Skill — LLM-facing `execute` tool (Layer 4).
 *
 * One `StructuredTool` that takes one shell command and runs it through
 * the resolved sandbox backend. Replaces the legacy `SandboxBashTool`
 * with the architecture-canonical contract from
 * `docs/BASH_EXECUTION_ARCHITECTURE.md` §6:
 *
 *   - Schema is `{ command: string }` only. The legacy `timeout_ms`
 *     parameter is parsed but stripped from the public description.
 *   - The response is rendered as a single text block:
 *
 *       <output>
 *       [Command succeeded with exit code 0]
 *
 *     With optional trailing lines:
 *
 *       [Command failed with exit code N]
 *       [Output was truncated due to size limits]
 *
 *   - `_call` NEVER throws out to the agent — shell-level failures,
 *     timeouts, and host errors all flow through the text envelope.
 *     This keeps the function-calling loop deterministic.
 *
 * Backwards compatibility:
 *   - Tool name defaults to `bash_<SkillName>` so prompts written
 *     against the legacy tool continue to bind. Set
 *     `SKILL_EXEC_TOOL_NAME=execute` to switch to the architecture-
 *     canonical name.
 *   - Set `SKILL_LEGACY_BASH_ENVELOPE=true` to receive the historical
 *     JSON envelope (`{ status, stdout, stderr, exitCode, error?,
 *     durationMs, engine }`) instead of the new text format.
 */

import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { FamilyDef, formatTaskCommand, groupByRecipeFamily, RecipeTask, renderHelperCatalog } from './commandRecipes'
import { absolutePath, SandboxManifest } from './SandboxManifest'
import { CommandRunResult, SandboxSession } from './SandboxSession'

// ---------------------------------------------------------------------------
// Once-per-process deprecation warnings — surfaced when legacy switches
// are consulted so we have a window to sunset them.
// ---------------------------------------------------------------------------

let warnedLegacyEnvelope = false

const parseBool = (v: string | undefined, fallback: boolean): boolean => {
    if (v === undefined || v === null) return fallback
    const t = String(v).trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(t)) return true
    if (['0', 'false', 'no', 'off'].includes(t)) return false
    return fallback
}

const legacyEnvelopeEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => {
    const on = parseBool(env.SKILL_LEGACY_BASH_ENVELOPE, false)
    if (on && !warnedLegacyEnvelope) {
        warnedLegacyEnvelope = true
        console.warn(
            '[Skill sandbox] SKILL_LEGACY_BASH_ENVELOPE=true is deprecated; new prompts should consume the text-formatted execute response.'
        )
    }
    return on
}

// ---------------------------------------------------------------------------
// Tool argument schema (LLM-visible)
// ---------------------------------------------------------------------------

const executeSchema = z.object({
    command: z
        .string()
        .min(1)
        .describe(
            'Shell command to run inside the skill sandbox. ' +
                'Working directory is /home/user; reachable skill files live under skills/ and outputs should be written into output/.'
        ),
    timeout_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Deprecated. The per-call timeout is clamped by the server; this argument is ignored in the new envelope.')
})

export type ExecuteToolArgs = z.infer<typeof executeSchema>

// ---------------------------------------------------------------------------
// Legacy JSON envelope — retained behind an env switch.
// ---------------------------------------------------------------------------

interface LegacyBashEnvelope {
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

export interface ExecuteToolFields extends ToolParams {
    name: string
    description: string
    session: SandboxSession
    /** Resolves to a backend-flavoured engine label (e.g. `e2b-bash`). Used by the legacy envelope. */
    engineLabel?: string
}

// ---------------------------------------------------------------------------
// The tool
// ---------------------------------------------------------------------------

export class ExecuteTool extends StructuredTool {
    static lc_name() {
        return 'SkillExecuteTool'
    }

    name: string
    description: string
    schema = executeSchema

    private readonly session: SandboxSession
    private readonly engineLabel: string

    constructor(fields: ExecuteToolFields) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.session = fields.session
        this.engineLabel = fields.engineLabel ?? 'e2b-bash'
    }

    protected async _call(input: ExecuteToolArgs): Promise<string> {
        const started = Date.now()
        const command = typeof input?.command === 'string' ? input.command.trim() : ''
        console.log(`[ExecuteTool] Executing command: ${command} (timeout_ms=${input.timeout_ms ?? 'none'})`)
        if (!command) {
            return legacyEnvelopeEnabled()
                ? JSON.stringify({
                      status: 'error',
                      stdout: '',
                      stderr: '',
                      exitCode: 1,
                      error: { kind: 'unsupported', message: 'Missing "command" argument' },
                      durationMs: Date.now() - started,
                      engine: this.engineLabel
                  } satisfies LegacyBashEnvelope)
                : formatExecuteResponse('', 1, false, '[Command failed with exit code 1 — missing "command" argument]')
        }

        const result = await this.session.exec(command, input?.timeout_ms)
        if (legacyEnvelopeEnabled()) {
            return JSON.stringify(toLegacyEnvelope(result, this.engineLabel))
        }
        return formatExecuteResponseFromRun(result)
    }
}

// ---------------------------------------------------------------------------
// Architecture-canonical response formatter (§6.1)
// ---------------------------------------------------------------------------

export const formatExecuteResponse = (output: string, exitCode: number | null, truncated: boolean, overrideTrailer?: string): string => {
    const lines: string[] = [output]
    if (overrideTrailer) {
        lines.push('')
        lines.push(overrideTrailer)
        return trimLeadingNewlines(lines.join('\n'))
    }
    if (exitCode === null) {
        lines.push('')
        lines.push('[Command killed before reporting an exit code]')
    } else if (exitCode === 0) {
        lines.push('')
        lines.push('[Command succeeded with exit code 0]')
    } else {
        lines.push('')
        lines.push(`[Command failed with exit code ${exitCode}]`)
    }
    if (truncated) {
        lines.push('[Output was truncated due to size limits]')
    }
    return trimLeadingNewlines(lines.join('\n'))
}

const formatExecuteResponseFromRun = (r: CommandRunResult): string => {
    // The legacy session envelope packs the combined output in `stdout`
    // and surfaces a truncation marker in `stderr`. Translate back to
    // the architecture's exitCode / truncated representation.
    const output = r.stdout || ''
    const truncated = (r.stderr || '').includes('Output was truncated')
    let exitCode: number | null = r.exitCode
    if (r.error?.kind === 'timeout' && r.exitCode === 1) exitCode = null
    if (r.error?.kind === 'disabled') return formatExecuteResponse(output, exitCode, truncated, `[Sandbox unavailable: ${r.error.message}]`)
    return formatExecuteResponse(output, exitCode, truncated)
}

const trimLeadingNewlines = (s: string): string => s.replace(/^\n+/, '')

// ---------------------------------------------------------------------------
// Legacy envelope helper
// ---------------------------------------------------------------------------

const toLegacyEnvelope = (r: CommandRunResult, engine: string): LegacyBashEnvelope => {
    return {
        status: r.ok ? 'ok' : 'error',
        stdout: r.stdout,
        stderr: r.stderr,
        exitCode: r.exitCode,
        error: r.error
            ? { kind: r.error.kind, message: r.error.message }
            : r.ok
            ? undefined
            : { kind: 'runtime', message: firstLine(r.stderr) || 'non-zero exit' },
        durationMs: r.durationMs,
        engine
    }
}

const firstLine = (s: string): string => {
    if (!s) return ''
    const i = s.indexOf('\n')
    return i === -1 ? s : s.slice(0, i)
}

// ---------------------------------------------------------------------------
// Description builder — preserved from the legacy SandboxBashTool because
// the user explicitly wants to keep the per-file/per-family recipe block.
// ---------------------------------------------------------------------------

const MAX_ENTRIES_PER_GROUP = 8
const MAX_PRODUCTIVE_PER_FAMILY = 4

export const buildExecuteToolDescription = (manifest: SandboxManifest, engineLabel: string): string => {
    const intro =
        `Run a shell command inside the skill sandbox VM (engine: ${engineLabel}). ` +
        `Working directory is /home/user; reachable skill files live under ${manifest.skillsDir}/ ` +
        `and any artefacts you want to hand back to the user should go into ${manifest.outputDir}/. ` +
        `Prefer the structured filesystem tools (read_file, grep, glob, ls, write_file, edit_file) for any ` +
        `read / write / search task — this tool is the escape hatch for tests, builds, scripts, and pipelines ` +
        `the structured tools cannot express. The response is a plain-text block ending with a ` +
        `\`[Command succeeded/failed with exit code N]\` line (and optionally \`[Output was truncated …]\`).`

    if (!manifest.entries.length) {
        return `${intro}\n\nNo skill files were reachable — the sandbox is empty beyond the default image.`
    }

    const helpersAvailable = manifest.helpers.length > 0
    const groups = groupByRecipeFamily(manifest.entries, { helpersAvailable })

    // Productivity rules now focus on the cases the structured tools
    // *cannot* cover: code execution, binary extraction, and managing
    // noisy stdout. Reading / searching / listing plain-text files is
    // delegated to `read_file_*`, `grep_*`, `glob_*`, `ls_*`.
    const productivity: string[] = [
        '',
        '',
        'Productivity rules — reach for the structured tools first:',
        '- Reading text? Use `read_file_*` (it auto-truncates large files) instead of `cat` / `head` / `tail`.',
        '- Searching? Use `grep_*` (regex, returns line numbers) instead of `grep` / `awk`.',
        '- Locating files? Use `glob_*` / `ls_*` instead of `find` / `ls`.',
        '- This tool is the right answer for: running scripts (`node`/`python3`/`bash`/`ruby`), extracting binary content (PDF/DOCX/XLSX/PPTX/ZIP/images), and any test/build/pipeline command.',
        '- Pipe noisy outputs through `head -n 200` or write to ' +
            manifest.outputDir +
            '/ and re-read selectively to stay under the stdout clamp.'
    ]

    const perFile: string[] = []
    if (groups.length) {
        perFile.push(
            '',
            '',
            'Starter commands per file (only exec / binary files surface here — text-shaped files belong to the structured tools):'
        )
        for (const { def, entries } of groups) {
            const shown = entries.slice(0, MAX_ENTRIES_PER_GROUP)
            const omitted = entries.length - shown.length
            perFile.push(`- ${def.label}:`)
            for (const entry of shown) {
                const cmd = formatTaskCommand(def.primary, absolutePath(manifest, entry), undefined, manifest.helpersDir)
                perFile.push(`    • ${entry.relPath} → ${cmd}`)
            }
            if (omitted > 0) {
                perFile.push(`    • …and ${omitted} more; run \`ls_<Skill>\` on ${manifest.skillsDir} to enumerate them.`)
            }
        }
    }

    const helperLines = renderHelperCatalog(manifest)
    const helperSection: string[] = []
    if (helperLines.length) {
        helperSection.push('', '', `Built-in helpers (always available under ${manifest.helpersDir}):`, ...helperLines)
    }

    const productiveFamilies = groups.filter(({ def }) => def.alternatives.length > 0)
    const perFamily: string[] = []
    if (productiveFamilies.length) {
        perFamily.push('', '', 'Productive commands per family (template-only — substitute <pattern> / <inner-path>):')
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
    return description
}

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
