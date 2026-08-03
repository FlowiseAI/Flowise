/**
 * Tagged result for tryParseJson. We can't use `null`/`undefined` as a "not
 * parseable" sentinel because `JSON.parse('null')` legitimately returns null,
 * which is a value worth surfacing through the JSON viewer.
 */
export type ParseResult = { ok: true; value: unknown } | { ok: false }

/**
 * Try to parse a string as JSON. Accepts ANY parseable value — objects,
 * arrays, numbers, booleans, null. Plain text like "hello" fails JSON.parse
 * and falls through (`ok: false`).
 */
export function tryParseJson(value: string): ParseResult {
    // JSON.parse('') returns undefined and JSON.parse('  ') throws — guard both.
    if (value.trim() === '') return { ok: false }
    try {
        return { ok: true, value: JSON.parse(value) }
    } catch {
        return { ok: false }
    }
}

export type JsonTokenType = 'punctuation' | 'key' | 'string' | 'boolean' | 'null' | 'number'

export interface JsonToken {
    type: JsonTokenType
    text: string
}

const TOKEN_REGEX = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?(?:[eE][+-]?\d+)?)/g

export function tokenizeJson(json: string): JsonToken[] {
    const out: JsonToken[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    const regex = new RegExp(TOKEN_REGEX.source, TOKEN_REGEX.flags)
    while ((match = regex.exec(json)) !== null) {
        if (match.index > lastIndex) {
            out.push({ type: 'punctuation', text: json.slice(lastIndex, match.index) })
        }
        const m = match[0]
        let type: JsonTokenType
        if (/^"/.test(m)) {
            type = /:$/.test(m) ? 'key' : 'string'
        } else if (/^(true|false)$/.test(m)) {
            type = 'boolean'
        } else if (/^null$/.test(m)) {
            type = 'null'
        } else {
            type = 'number'
        }
        out.push({ type, text: m })
        lastIndex = match.index + m.length
    }
    if (lastIndex < json.length) out.push({ type: 'punctuation', text: json.slice(lastIndex) })
    return out
}
