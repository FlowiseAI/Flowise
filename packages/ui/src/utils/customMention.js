import Mention from '@tiptap/extension-mention'
import { PasteRule } from '@tiptap/core'

export const CustomMention = Mention.extend({
    renderText({ node }) {
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
