/**
 * Placeholder parser for Skill content.
 *
 * We reuse Flowise's `{{…}}` grammar and introduce two new namespaces on top:
 *
 *   {{tool.<provider>.<toolName>.<uuid>}}     — resolved at compile time
 *   {{skill.<nodeId>}}                         — resolved at compile time
 *
 * All other `{{…}}` tokens are left verbatim so the runtime resolver
 * (`getVariableValue` in `packages/server/src/utils/index.ts:870`) can handle
 * them (e.g. `{{question}}`, `{{$vars.x}}`, `{{$flow.…}}`).
 *
 * Tool *groups* (`[{{tool.…}}, {{tool.…}}]`) are recognised as a higher-level
 * pattern for the resolver to drop disabled entries.
 *
 * Security: scanners are strictly regex-based, cap the number of matches, and
 * skip placeholder tokens that fall inside fenced or inline code spans.
 */

export const MAX_PLACEHOLDER_MATCHES = 10_000

// -----------------------------------------------------------------------------
// Raw placeholder token + position
// -----------------------------------------------------------------------------

export type PlaceholderKind = 'tool' | 'skill' | 'passthrough'

export interface PlaceholderToken {
    kind: PlaceholderKind
    raw: string // the full `{{…}}` substring as seen in source
    inner: string // contents between the braces, trimmed
    start: number // index into source string
    end: number // exclusive end index
    // Extracted only when kind === 'tool' or 'skill'
    tool?: { provider: string; toolName: string; uuid: string }
    skill?: { nodeId: string }
}

export interface ToolGroupToken {
    start: number
    end: number
    raw: string
    tools: PlaceholderToken[] // each has kind === 'tool'
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface ParseResult {
    tokens: PlaceholderToken[]
    toolGroups: ToolGroupToken[]
    codeSpans: Array<{ start: number; end: number }>
}

/**
 * Identify every placeholder token in `source`, classify it, and flag
 * code-span regions the compiler must not touch.
 */
export const parsePlaceholders = (source: string): ParseResult => {
    const codeSpans = findCodeSpans(source)
    const tokens = scanPlaceholders(source, codeSpans)
    const toolGroups = detectToolGroups(source, tokens)
    return { tokens, toolGroups, codeSpans }
}

// -----------------------------------------------------------------------------
// Scanners
// -----------------------------------------------------------------------------

const isInsideSpan = (pos: number, spans: Array<{ start: number; end: number }>): boolean => {
    for (const s of spans) if (pos >= s.start && pos < s.end) return true
    return false
}

const scanPlaceholders = (source: string, codeSpans: Array<{ start: number; end: number }>): PlaceholderToken[] => {
    const tokens: PlaceholderToken[] = []
    const re = /\{\{\s*([^{}]+?)\s*\}\}/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(source)) !== null) {
        if (++count > MAX_PLACEHOLDER_MATCHES) break
        const start = m.index
        const end = start + m[0].length
        if (isInsideSpan(start, codeSpans)) continue
        const inner = m[1].trim()
        const token: PlaceholderToken = {
            kind: 'passthrough',
            raw: m[0],
            inner,
            start,
            end
        }
        if (inner.startsWith('tool.')) {
            const parts = inner.slice(5).split('.')
            if (parts.length >= 3) {
                const uuid = parts[parts.length - 1]
                const toolName = parts[parts.length - 2]
                const provider = parts.slice(0, parts.length - 2).join('.')
                if (provider && toolName && uuid) {
                    token.kind = 'tool'
                    token.tool = { provider, toolName, uuid }
                }
            }
        } else if (inner.startsWith('skill.')) {
            const nodeId = inner.slice(6).trim()
            if (nodeId) {
                token.kind = 'skill'
                token.skill = { nodeId }
            }
        }
        tokens.push(token)
    }
    return tokens
}

/**
 * Detect `[{{tool....}}, {{tool....}}, ...]` groups — used to drop disabled
 * entries, or collapse to empty string when every candidate is disabled.
 */
const detectToolGroups = (source: string, tokens: PlaceholderToken[]): ToolGroupToken[] => {
    const groups: ToolGroupToken[] = []
    // Match from `[` up to the closing `]`, containing only tool tokens, commas, and whitespace.
    const re = /\[\s*(?:\{\{\s*tool\.[^{}]+?\s*\}\}\s*)(?:,\s*\{\{\s*tool\.[^{}]+?\s*\}\}\s*)*\]/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(source)) !== null) {
        if (++count > MAX_PLACEHOLDER_MATCHES) break
        const start = m.index
        const end = start + m[0].length
        const inside = tokens.filter((t) => t.kind === 'tool' && t.start >= start && t.end <= end)
        if (inside.length) {
            groups.push({ start, end, raw: m[0], tools: inside })
        }
    }
    return groups
}

/**
 * Find fenced-code (``` or ~~~) and inline-code (`…`) spans so that
 * placeholders appearing inside user examples are preserved verbatim.
 */
const findCodeSpans = (source: string): Array<{ start: number; end: number }> => {
    const spans: Array<{ start: number; end: number }> = []
    // Fenced code blocks (``` or ~~~, possibly with language hint).
    const fenced = /(^|\n)(```|~~~)[^\n]*\n([\s\S]*?)(^|\n)\2/g
    let m: RegExpExecArray | null
    while ((m = fenced.exec(source)) !== null) {
        spans.push({ start: m.index, end: m.index + m[0].length })
    }
    // Inline code (`…`), excluding escaped backticks.
    const inline = /`[^`\n]+`/g
    while ((m = inline.exec(source)) !== null) {
        const s = m.index
        const e = s + m[0].length
        // Skip if already covered by a fenced span.
        if (spans.some((sp) => s >= sp.start && e <= sp.end)) continue
        spans.push({ start: s, end: e })
    }
    return spans.sort((a, b) => a.start - b.start)
}
