/**
 * Custom TipTap Mention extension for `{{ variable }}` syntax.
 *
 * Port of packages/ui/src/utils/customMention.js to TypeScript.
 * Includes markdown tokenizer/parser/renderer for @tiptap/markdown integration.
 */
import { type JSONContent, type MarkdownToken, PasteRule } from '@tiptap/core'
import Mention from '@tiptap/extension-mention'

export const CustomMention = Mention.extend({
    /**
     * Render mention nodes as `{{label}}` in plain text output.
     */
    renderText({ node }) {
        return `{{${node.attrs.label ?? node.attrs.id}}}`
    },

    // ── @tiptap/markdown integration ─────────────────────────────────────────
    // These properties are read by @tiptap/markdown's MarkdownManager via
    // getExtensionField() to enable markdown round-tripping of {{variable}} syntax.
    // Ported from packages/ui/src/utils/customMention.js.

    /** Token name for the custom markdown tokenizer. */
    markdownTokenName: 'mention',

    /** Custom MarkedJS tokenizer to recognize {{...}} syntax in markdown input. */
    markdownTokenizer: {
        name: 'mention',
        level: 'inline',
        start: '{{',
        tokenize(src: string) {
            const match = src.match(/^\{\{([^{}]+)\}\}/)
            if (match) {
                return {
                    type: 'mention',
                    raw: match[0],
                    label: match[1].trim()
                }
            }
            return undefined
        }
    },

    /** Parse a markdown mention token into a TipTap mention node. */
    parseMarkdown(token: MarkdownToken) {
        return {
            type: 'mention',
            attrs: {
                id: token.label,
                label: token.label
            }
        }
    },

    /** Serialize a mention node back to {{label}} in markdown output. */
    renderMarkdown(node: JSONContent) {
        return `{{${node.attrs?.label ?? node.attrs?.id}}}`
    },

    /**
     * Paste rule: auto-convert `{{variable}}` text into mention nodes on paste.
     */
    addPasteRules() {
        return [
            new PasteRule({
                find: /\{\{([^{}]+)\}\}/g,
                handler: ({ match, chain, range }) => {
                    const label = match[1].trim()
                    if (label) {
                        chain()
                            .deleteRange(range)
                            .insertContentAt(range.from, {
                                type: this.name,
                                attrs: { id: label, label }
                            })
                    }
                }
            })
        ]
    }
})
