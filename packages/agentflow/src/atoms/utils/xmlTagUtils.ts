/**
 * Utilities for preserving XML/HTML tags in prompt text through TipTap's markdown round-trip,
 * plus editor helpers for content-type detection and markdown serialisation.
 *
 * Problem: When content like `<instructions>text</instructions>` is parsed by marked
 * (via @tiptap/markdown), the lexer tokenises tags as HTML tokens. TipTap's parseHTMLToken
 * then calls generateJSON which creates DOM elements — unrecognised tags are stripped and
 * only inner text survives.
 *
 * Solution: Three-step process:
 *   1. escapeXmlTags    — Convert all tags to HTML entities before setContent so marked
 *                         treats them as plain text, not HTML tokens.
 *   2. unescapeXmlEntities — After TipTap builds the ProseMirror document, walk the JSON tree
 *                         and decode &lt;/&gt; back to </> in text nodes for proper display.
 *   3. unescapeXmlTags  — After getMarkdown(), reverse any remaining entity-escaped tags
 *                         in the serialised output (safety net — typically a no-op).
 *
 * Ported from packages/ui/src/utils/xmlTagUtils.js (PR #6095).
 */

// ── Content-type detection ─────────────────────────────────────────────────────

/**
 * Returns true when `content` looks like legacy HTML (saved by the old getHTML()
 * serialiser), so callers can choose the right TipTap `setContent` contentType.
 *
 * The regex is anchored with `^\s*` so a user prompt that merely *contains* a
 * standard HTML tag (e.g. `<instructions><div>…</div></instructions>`) is not
 * misclassified as legacy HTML.
 *
 * Ported from packages/ui/src/ui-component/input/RichInput.jsx (PR #6021).
 */
export function isHtmlContent(content: unknown): boolean {
    if (!content || typeof content !== 'string') return false
    return /^\s*<(?:p|div|span|h[1-6]|ul|ol|li|br|code|pre|blockquote|table|strong|em)\b/i.test(content)
}

// ── Markdown serialisation ─────────────────────────────────────────────────────

/**
 * Safely serialise a TipTap editor to markdown, falling back to HTML when
 * `getMarkdown()` returns an empty string for a non-empty document — a known
 * issue in `@tiptap/markdown` v3 where the MarkdownManager may silently fail
 * to serialise certain node types.
 */
export function getEditorMarkdown(editor: { getMarkdown(): string; getHTML(): string; isEmpty: boolean }): string {
    try {
        const markdown = editor.getMarkdown()
        if (markdown) return markdown
        if (editor.isEmpty) return ''
        return editor.getHTML()
    } catch {
        return editor.getHTML()
    }
}

// ── XML tag escape / unescape ──────────────────────────────────────────────────

/** Regex matching opening, closing, and self-closing XML/HTML tags. */
const XML_TAG_REGEX = /<(\/?)([a-zA-Z][a-zA-Z0-9_.-]*)(\s[^>]*)?(\/?)>/g

/**
 * Escape all XML/HTML tags to HTML entities so marked doesn't parse them as HTML.
 * In prompt editing context, users want tags preserved literally, not rendered.
 *
 * @example
 * escapeXmlTags('<instructions>Be helpful</instructions>')
 * // → '&lt;instructions&gt;Be helpful&lt;/instructions&gt;'
 */
export function escapeXmlTags(text: string): string {
    if (!text || typeof text !== 'string') return text
    return text.replace(XML_TAG_REGEX, (_, slash, tagName, attrs, selfClose) => {
        return `&lt;${slash}${tagName}${attrs ?? ''}${selfClose}&gt;`
    })
}

/** Minimal interface for walking a ProseMirror JSON tree. */
interface PmNode {
    text?: string
    content?: PmNode[]
    [key: string]: unknown
}

/**
 * ProseMirror JSON node type used when mention nodes (with `attrs`) may be present.
 * Superset of PmNode — the index signature covers any additional fields.
 */
export type JsonNode = { type?: string; text?: string; content?: JsonNode[]; attrs?: Record<string, unknown>; [k: string]: unknown }

/**
 * Unescape XML tag entities in ProseMirror JSON text nodes.
 * Call this after setContent() to fix the visual display in the editor.
 * Mutates the JSON in-place and returns it.
 *
 * @example
 * const json = { type: 'doc', content: [
 *   { type: 'paragraph', content: [{ type: 'text', text: '&lt;question&gt;What?&lt;/question&gt;' }] }
 * ]}
 * unescapeXmlEntities(json)
 * // json.content[0].content[0].text → '<question>What?</question>'
 */
export function unescapeXmlEntities(json: PmNode): PmNode {
    if (json.text) {
        json.text = unescapeXmlTags(json.text)
    }
    if (json.content) {
        json.content.forEach(unescapeXmlEntities)
    }
    return json
}

/**
 * Unescape all entity-escaped XML/HTML tags after markdown serialisation.
 * Typically a no-op — used as a safety net for any entities TipTap did not
 * convert back to angle brackets during getMarkdown().
 *
 * @example
 * unescapeXmlTags('&lt;question&gt;text&lt;/question&gt;')
 * // → '<question>text</question>'
 *
 * unescapeXmlTags('<question>text</question>')
 * // → '<question>text</question>'  (raw tags pass through unchanged)
 */
export function unescapeXmlTags(text: string): string {
    if (!text || typeof text !== 'string') return text
    return text.replace(/&lt;(\/?)([a-zA-Z][a-zA-Z0-9_.-]*)(\s.*?)?(\/?)&gt;/g, (_, slash, tagName, attrs, selfClose) => {
        return `<${slash}${tagName}${attrs ?? ''}${selfClose}>`
    })
}

// ── Mention restoration ────────────────────────────────────────────────────────

/**
 * Post-process the ProseMirror JSON after markdown setContent:
 * 1. Unescape XML tag entities in text nodes.
 * 2. When `hasMentions` is true, split any remaining `{{label}}` text patterns
 *    into proper mention nodes. This is needed because MarkedJS's URL tokenizer
 *    can swallow `{{variable}}` when it appears inside a URL
 *    (e.g. `https://example.com/{{question}}`), preventing the mention tokenizer
 *    from running. Walking the resulting JSON and splitting inline fixes the chip.
 *
 * Returns an array because one text node may expand into [text, mention, text, …].
 */
export function restoreTextMentions(node: JsonNode, hasMentions: boolean): JsonNode[] {
    if (node.type === 'text' && typeof node.text === 'string') {
        const unescaped = unescapeXmlTags(node.text)
        if (!hasMentions) return [{ ...node, text: unescaped }]

        const regex = /\{\{([^{}]+)\}\}/g
        const parts: JsonNode[] = []
        let lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = regex.exec(unescaped)) !== null) {
            if (match.index > lastIndex) parts.push({ ...node, text: unescaped.slice(lastIndex, match.index) })
            const label = match[1].trim()
            parts.push({ type: 'mention', attrs: { id: label, label } })
            lastIndex = regex.lastIndex
        }

        if (parts.length === 0) return [{ ...node, text: unescaped }]
        if (lastIndex < unescaped.length) parts.push({ ...node, text: unescaped.slice(lastIndex) })
        return parts
    }

    if (Array.isArray(node.content)) {
        const newContent: JsonNode[] = []
        for (const child of node.content) newContent.push(...restoreTextMentions(child, hasMentions))
        return [{ ...node, content: newContent }]
    }

    return [node]
}
