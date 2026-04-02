import { createElement, forwardRef } from 'react'

export const useEditor = (config?: Record<string, unknown>) => {
    // Track the current content so getMarkdown/getHTML reflect setContent() calls,
    // mirroring real TipTap behaviour where setContent updates the editor state.
    let currentContent: string = (config?.content as string) ?? ''
    return {
        getHTML: () => currentContent || '<p></p>',
        getMarkdown: () => currentContent,
        isEmpty: !currentContent,
        setEditable: jest.fn(),
        commands: {
            focus: jest.fn(),
            // Capture the first argument (the content string) so getMarkdown/getHTML
            // return the value that was last loaded into the editor.
            setContent: jest.fn((content: string) => {
                currentContent = content
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
