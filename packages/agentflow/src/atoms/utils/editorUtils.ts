/**
 * Returns true when `content` looks like legacy HTML (saved by the old getHTML()
 * serializer), so callers can choose the right TipTap `setContent` contentType.
 *
 * Ported from packages/ui/src/ui-component/input/RichInput.jsx (PR #6021).
 * A simple tag-presence check is intentionally used here — it is fast, has no
 * dependencies, and the false-positive/negative risk for agentflow node inputs
 * is negligible (users don't normally write raw HTML into prompt fields).
 */
export function isHtmlContent(content: unknown): boolean {
    if (!content || typeof content !== 'string') return false
    return /<(?:p|div|span|h[1-6]|ul|ol|li|br|code|pre|blockquote|table|strong|em)\b/i.test(content)
}

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
