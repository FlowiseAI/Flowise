import { createElement, forwardRef } from 'react'

/** Extract all text from a ProseMirror JSON node recursively. */
function extractPmText(node: { text?: string; content?: unknown[] }): string {
    if (node.text) return node.text
    if (node.content) return (node.content as { text?: string; content?: unknown[] }[]).map(extractPmText).join('')
    return ''
}

export const useEditor = (config?: Record<string, unknown>) => {
    // Track the current content so getMarkdown/getHTML reflect setContent() calls,
    // mirroring real TipTap behaviour where setContent updates the editor state.
    let currentContent: string = (config?.content as string) ?? ''
    return {
        getHTML: () => currentContent || '<p></p>',
        getMarkdown: () => currentContent,
        isEmpty: !currentContent,
        setEditable: jest.fn(),
        // Returns a minimal ProseMirror JSON for the current string content.
        // Allows unescapeXmlEntities() to walk and mutate the text node.
        getJSON: () => ({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: currentContent }] }]
        }),
        commands: {
            focus: jest.fn(),
            // Accepts both string content and ProseMirror JSON objects (second setContent call
            // in the two-step XML escape/unescape load sequence).
            setContent: jest.fn((content: string | { text?: string; content?: unknown[] }) => {
                if (typeof content === 'string') {
                    currentContent = content
                } else if (content && typeof content === 'object') {
                    currentContent = extractPmText(content)
                }
            })
        },
        _onUpdate: config?.onUpdate
    }
}

export const EditorContent = forwardRef<HTMLDivElement, { editor?: unknown; [k: string]: unknown }>(({ editor, ...rest }, ref) =>
    createElement('div', { ref, 'data-testid': 'tiptap-editor-content', 'data-has-editor': !!editor, ...rest })
)
EditorContent.displayName = 'EditorContent'

export const ReactRenderer = jest.fn().mockImplementation(() => ({
    element: document.createElement('div'),
    ref: null,
    updateProps: jest.fn(),
    destroy: jest.fn()
}))
