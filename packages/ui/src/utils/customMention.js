import Mention from '@tiptap/extension-mention'
import { PasteRule } from '@tiptap/core'

export const CustomMention = Mention.extend({
    renderText({ node }) {
        return `{{${node.attrs.label ?? node.attrs.id}}}`
    },

    // Markdown extension: token name for the custom tokenizer
    markdownTokenName: 'mention',

    // Markdown extension: custom MarkedJS tokenizer to recognize {{...}} syntax
    markdownTokenizer: {
        name: 'mention',
        level: 'inline',
        start: '{{',
        tokenize(src) {
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

    // Markdown extension: parse the token into a TipTap mention node
    parseMarkdown(token) {
        return {
            type: 'mention',
            attrs: {
                id: token.label,
                label: token.label
            }
        }
    },

    // Markdown extension: serialize mention node back to {{label}}
    renderMarkdown(node) {
        return `{{${node.attrs.label ?? node.attrs.id}}}`
    },

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
                                attrs: { id: label, label: label }
                            })
                    }
                }
            })
        ]
    }
})
