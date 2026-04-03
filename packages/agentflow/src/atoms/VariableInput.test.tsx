import { createTheme, ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import * as TiptapReact from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

import { VariableInput, type VariableInputProps } from './VariableInput'

const theme = createTheme()

function renderVariableInput(props: Partial<VariableInputProps> = {}) {
    const defaultProps: VariableInputProps = {
        value: '',
        onChange: jest.fn(),
        ...props
    }

    const result = render(
        <ThemeProvider theme={theme}>
            <VariableInput {...defaultProps} />
        </ThemeProvider>
    )

    return { ...result, ...defaultProps }
}

describe('VariableInput', () => {
    it('renders the TipTap editor container', () => {
        renderVariableInput()

        expect(screen.getByTestId('variable-input')).toBeInTheDocument()
    })

    it('renders the TipTap editor content element', () => {
        renderVariableInput()

        // The mocked EditorContent renders a div with data-testid="tiptap-editor-content"
        expect(screen.getByTestId('tiptap-editor-content')).toBeInTheDocument()
    })

    it('passes editor instance to EditorContent', () => {
        renderVariableInput({ value: 'Hello' })

        const editorContent = screen.getByTestId('tiptap-editor-content')
        expect(editorContent).toHaveAttribute('data-has-editor', 'true')
    })

    it('renders without suggestion items', () => {
        renderVariableInput({ suggestionItems: undefined })

        expect(screen.getByTestId('variable-input')).toBeInTheDocument()
    })

    it('renders with suggestion items', () => {
        renderVariableInput({
            suggestionItems: [{ id: 'question', label: 'question', description: "User's question", category: 'Chat Context' }]
        })

        expect(screen.getByTestId('variable-input')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
        renderVariableInput({ placeholder: 'Type here...' })

        expect(screen.getByTestId('variable-input')).toBeInTheDocument()
    })

    it('renders in disabled state', () => {
        renderVariableInput({ disabled: true })

        expect(screen.getByTestId('variable-input')).toBeInTheDocument()
    })

    it('always initialises the editor with empty content (value is loaded via setContent effect)', () => {
        // The editor always starts empty; value is loaded once via editor.commands.setContent
        // after the editor instance is ready — this avoids content flicker on re-renders.
        const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
        renderVariableInput({ value: 'Hello world' })
        expect(useEditorSpy).toHaveBeenCalledWith(expect.objectContaining({ content: '' }))
        useEditorSpy.mockRestore()
    })

    it('passes autofocus:"end" to useEditor when autoFocus is true', () => {
        const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
        renderVariableInput({ autoFocus: true })
        expect(useEditorSpy).toHaveBeenCalledWith(expect.objectContaining({ autofocus: 'end' }))
        useEditorSpy.mockRestore()
    })

    it('passes autofocus:false to useEditor when autoFocus is false (default)', () => {
        const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
        renderVariableInput({ autoFocus: false })
        expect(useEditorSpy).toHaveBeenCalledWith(expect.objectContaining({ autofocus: false }))
        useEditorSpy.mockRestore()
    })

    it('calls onEditorReady with the editor instance after mount', () => {
        const onEditorReady = jest.fn()
        renderVariableInput({ onEditorReady })
        // The mock editor has getHTML/getMarkdown/commands etc.
        expect(onEditorReady).toHaveBeenCalledWith(expect.objectContaining({ getHTML: expect.any(Function) }))
    })

    describe('useMarkdown derived from rows — StarterKit link extension', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        it('passes link:false to StarterKit when rows is not set (single-line field)', () => {
            renderVariableInput({ rows: undefined })

            expect(StarterKit.configure).toHaveBeenCalledWith(expect.objectContaining({ link: false }))
        })

        it('does not pass link:false to StarterKit when rows is set (multiline/markdown field)', () => {
            renderVariableInput({ rows: 4 })

            expect(StarterKit.configure).not.toHaveBeenCalledWith(expect.objectContaining({ link: false }))
        })
    })

    describe('onUpdate always emits markdown regardless of rows', () => {
        it('calls onChange with getEditorMarkdown output when rows is not set', () => {
            const onChange = jest.fn()
            const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
            renderVariableInput({ onChange, rows: undefined })

            const config = useEditorSpy.mock.calls[0][0] as { onUpdate: (args: { editor: unknown }) => void }
            const mockEditor = { getMarkdown: () => 'plain url text', getHTML: jest.fn() }
            config.onUpdate({ editor: mockEditor })

            expect(onChange).toHaveBeenCalledWith('plain url text')
            expect(mockEditor.getHTML).not.toHaveBeenCalled()
            useEditorSpy.mockRestore()
        })

        it('calls onChange with getEditorMarkdown output when rows is set', () => {
            const onChange = jest.fn()
            const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
            renderVariableInput({ onChange, rows: 4 })

            const config = useEditorSpy.mock.calls[0][0] as { onUpdate: (args: { editor: unknown }) => void }
            const mockEditor = { getMarkdown: () => '**bold**', getHTML: jest.fn() }
            config.onUpdate({ editor: mockEditor })

            expect(onChange).toHaveBeenCalledWith('**bold**')
            expect(mockEditor.getHTML).not.toHaveBeenCalled()
            useEditorSpy.mockRestore()
        })
    })

    describe('XML tag preservation in onUpdate', () => {
        it('should unescape entity-escaped XML tags before calling onChange', () => {
            const onChange = jest.fn()
            const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
            renderVariableInput({ onChange })

            const config = useEditorSpy.mock.calls[0][0] as { onUpdate: (args: { editor: unknown }) => void }
            config.onUpdate({ editor: { getMarkdown: () => '&lt;instructions&gt;Be helpful&lt;/instructions&gt;', getHTML: jest.fn() } })

            expect(onChange).toHaveBeenCalledWith('<instructions>Be helpful</instructions>')
            useEditorSpy.mockRestore()
        })

        it('should pass through raw XML tags unchanged', () => {
            const onChange = jest.fn()
            const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
            renderVariableInput({ onChange })

            const config = useEditorSpy.mock.calls[0][0] as { onUpdate: (args: { editor: unknown }) => void }
            config.onUpdate({ editor: { getMarkdown: () => '<question>What?</question>', getHTML: jest.fn() } })

            expect(onChange).toHaveBeenCalledWith('<question>What?</question>')
            useEditorSpy.mockRestore()
        })

        it('should preserve XML tags mixed with variables', () => {
            const onChange = jest.fn()
            const useEditorSpy = jest.spyOn(TiptapReact, 'useEditor')
            renderVariableInput({ onChange })

            const config = useEditorSpy.mock.calls[0][0] as { onUpdate: (args: { editor: unknown }) => void }
            config.onUpdate({
                editor: { getMarkdown: () => '&lt;context&gt;{{question}}&lt;/context&gt;', getHTML: jest.fn() }
            })

            expect(onChange).toHaveBeenCalledWith('<context>{{question}}</context>')
            useEditorSpy.mockRestore()
        })
    })
})
