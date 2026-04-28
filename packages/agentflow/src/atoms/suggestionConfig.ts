/**
 * TipTap suggestion render lifecycle using tippy.js and ReactRenderer.
 *
 * Port of packages/ui/src/ui-component/input/suggestionOption.js render() to TypeScript,
 * adapted for the agentflow SuggestionDropdown component.
 */
import type { Editor, Range } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

import { SuggestionDropdown, type SuggestionDropdownRef, type SuggestionItem } from './SuggestionDropdown'

interface SuggestionCallbackProps {
    editor: Editor
    range: Range
    query: string
    text: string
    items: SuggestionItem[]
    command: (props: SuggestionItem) => void
    decorationNode: Element | null
    clientRect?: (() => DOMRect | null) | null
}

interface SuggestionKeyDownCallbackProps {
    view: EditorView
    event: KeyboardEvent
    range: Range
}

/**
 * Workaround for the typing incompatibility between Tippy.js and TipTap Suggestion utility.
 * @see https://github.com/ueberdosis/tiptap/issues/2795#issuecomment-1160623792
 */
const DOM_RECT_FALLBACK: DOMRect = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON() {
        return {}
    }
}

export interface SuggestionConfigOptions {
    items: SuggestionItem[]
}

/**
 * Creates the TipTap suggestion config object for the CustomMention extension.
 *
 * @param suggestionItems - The full list of available variable items.
 *   Filtering by query is done inside the `items` callback.
 */
export function createSuggestionConfig(suggestionItems: SuggestionItem[]) {
    return {
        char: '{{',

        items: ({ query }: { query: string }) => {
            if (!query) return suggestionItems
            const q = query.toLowerCase()
            return suggestionItems.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
        },

        render: () => {
            let component: ReactRenderer<SuggestionDropdownRef> | undefined
            let popup: TippyInstance | undefined

            return {
                onStart: (props: SuggestionCallbackProps) => {
                    component = new ReactRenderer(SuggestionDropdown, {
                        props,
                        editor: props.editor
                    })

                    const [instance] = tippy('body', {
                        getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start'
                    })
                    popup = instance
                },

                onUpdate(props: SuggestionCallbackProps) {
                    component?.updateProps(props)
                    popup?.setProps({
                        getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK
                    })
                },

                onKeyDown(props: SuggestionKeyDownCallbackProps) {
                    if (props.event.key === 'Escape') {
                        popup?.hide()
                        return true
                    }
                    if (!component?.ref) return false
                    return component.ref.onKeyDown(props)
                },

                onExit() {
                    popup?.destroy()
                    component?.destroy()
                    popup = undefined
                    component = undefined
                }
            }
        }
    }
}
