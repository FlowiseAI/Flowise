import { createElement, forwardRef } from 'react'

export const useEditor = (config?: Record<string, unknown>) => ({
    getHTML: () => (config?.content as string) ?? '<p></p>',
    getMarkdown: () => (config?.content as string) ?? '',
    setEditable: jest.fn(),
    commands: { focus: jest.fn(), setContent: jest.fn() },
    _onUpdate: config?.onUpdate
})

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
