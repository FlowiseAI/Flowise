// Client-side placeholder helpers that mirror the backend parser in
// packages/server/src/services/skills/compiler/placeholderParser.ts.
//
// Canonical wire grammar:
//   {{skill.<nodeId>}}                               — skill file ref
//   {{tool.<provider>.<toolName>.<uuid>}}            — tool ref
//
// The UI only needs to produce canonical placeholder strings to insert into
// the editor. Authoritative resolution (including unresolved-ref counting)
// is done by the server at compile/validate time.

export const SKILL_PLACEHOLDER_RE = /\{\{\s*skill\.([A-Za-z0-9_-]+)\s*\}\}/g
export const TOOL_PLACEHOLDER_RE = /\{\{\s*tool\.([^{}]+?)\s*\}\}/g

export const buildSkillRef = (nodeId) => {
    if (!nodeId) return ''
    return `{{skill.${nodeId}}}`
}

export const buildToolRef = ({ provider, toolName, uuid }) => {
    if (!provider || !toolName || !uuid) return ''
    return `{{tool.${provider}.${toolName}.${uuid}}}`
}

// Returns an array of { kind: 'skill'|'tool', target, index } occurrences.
export const scanPlaceholders = (text) => {
    if (!text) return []
    const out = []
    let m
    SKILL_PLACEHOLDER_RE.lastIndex = 0
    while ((m = SKILL_PLACEHOLDER_RE.exec(text)) !== null) {
        out.push({ kind: 'skill', target: m[1], index: m.index })
    }
    TOOL_PLACEHOLDER_RE.lastIndex = 0
    while ((m = TOOL_PLACEHOLDER_RE.exec(text)) !== null) {
        out.push({ kind: 'tool', target: m[1], index: m.index })
    }
    return out.sort((a, b) => a.index - b.index)
}
