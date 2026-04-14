/**
 * Utilities for preserving XML/HTML tags in prompt text through TipTap's markdown roundtrip.
 *
 * Problem: When content like `<question>text</question>` is parsed by marked (via @tiptap/markdown),
 * the lexer tokenizes tags as HTML tokens. TipTap's parseHTMLToken then calls generateJSON which
 * creates DOM elements — unrecognized tags are stripped and only inner text survives.
 *
 * Solution: Three-step process:
 *   1. escapeXmlTags: Convert all tags to HTML entities before markdown parsing
 *      so marked treats them as text, not HTML tokens.
 *   2. unescapeXmlEntities: After TipTap builds the ProseMirror document, walk the JSON tree
 *      and decode &lt;/&gt; back to </>  in text nodes for proper visual display.
 *   3. unescapeXmlTags: After getMarkdown(), reverse any remaining entity-escaped tags
 *      in the serialized output (safety net — typically a no-op).
 */

/**
 * Detect if content is legacy HTML from old getHTML() storage vs markdown.
 * Legacy content always starts with a block-level tag like <p>.
 * Anchored with ^ to avoid matching intentional HTML tags inside user prompts.
 *
 * @example
 * isHtmlContent('<p>some text</p>')       // → true  (legacy getHTML output)
 * isHtmlContent('<instruction>text</instruction>') // → false (user prompt)
 *
 * @param {string} content - Content to check
 * @returns {boolean} True if content looks like legacy HTML
 */
export const isHtmlContent = (content) => {
    if (!content || typeof content !== 'string') return false
    return /^\s*<(?:p|div|h[1-6]|ul|ol|blockquote|pre|table)\b/i.test(content)
}

/**
 * Regex matching opening, closing, and self-closing XML/HTML tags.
 * Captures: (1) optional slash, (2) tag name, (3) optional attributes, (4) optional self-close slash
 */
const XML_TAG_REGEX = /<(\/?)([a-zA-Z][a-zA-Z0-9_.-]*)(\s[^>]*)?(\/?)>/g

/**
 * Escape all XML/HTML tags to HTML entities so marked doesn't parse them as HTML.
 * In prompt editing context, users want tags preserved literally, not rendered.
 *
 * @example
 * escapeXmlTags('<instructions>Be helpful</instructions>')
 * // → '&lt;instructions&gt;Be helpful&lt;/instructions&gt;'
 *
 * escapeXmlTags('<div><question>text</question></div>')
 * // → '&lt;div&gt;&lt;question&gt;text&lt;/question&gt;&lt;/div&gt;'
 *
 * @param {string} text - Raw markdown/text content
 * @returns {string} Content with tags escaped to HTML entities
 */
export function escapeXmlTags(text) {
    if (!text || typeof text !== 'string') return text
    return text.replace(XML_TAG_REGEX, (match, slash, tagName, attrs, selfClose) => {
        return `&lt;${slash}${tagName}${attrs || ''}${selfClose}&gt;`
    })
}

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
 *
 * @param {object} json - ProseMirror document JSON from editor.getJSON()
 * @returns {object} The same JSON with decoded entities in text nodes
 */
export function unescapeXmlEntities(json) {
    if (json.text) {
        json.text = unescapeXmlTags(json.text)
    }
    if (json.content) {
        json.content.forEach(unescapeXmlEntities)
    }
    return json
}

/**
 * Unescape all entity-escaped XML/HTML tags after markdown serialization.
 *
 * @example
 * unescapeXmlTags('&lt;question&gt;text&lt;/question&gt;')
 * // → '<question>text</question>'
 *
 * unescapeXmlTags('&lt;div&gt;text&lt;/div&gt;')
 * // → '<div>text</div>'
 *
 * unescapeXmlTags('<question>text</question>')
 * // → '<question>text</question>'  (raw tags pass through unchanged)
 *
 * @param {string} text - Markdown output from TipTap
 * @returns {string} Content with tags restored to angle brackets
 */
export function unescapeXmlTags(text) {
    if (!text || typeof text !== 'string') return text
    return text.replace(/&lt;(\/?)([a-zA-Z][a-zA-Z0-9_.-]*)(\s.*?)?(\/?)&gt;/g, (match, slash, tagName, attrs, selfClose) => {
        return `<${slash}${tagName}${attrs || ''}${selfClose}>`
    })
}
