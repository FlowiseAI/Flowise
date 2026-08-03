import { render, screen } from '@testing-library/react'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

import { RichTextEditor } from './RichTextEditor'

// --- Mock TipTap ---
// editor.getMarkdown() is added directly on the Editor interface by @tiptap/markdown
// via module augmentation — it is NOT nested under storage.markdown.
let capturedOnUpdate: ((args: { editor: { getMarkdown: () => string } }) => void) | undefined
let capturedExtensions: unknown[] | undefined

jest.mock('@tiptap/react', () => ({
    useEditor: (config: Record<string, unknown>) => {
        // Capture the onUpdate callback so tests can simulate edits
        capturedOnUpdate = config.onUpdate as typeof capturedOnUpdate
        capturedExtensions = config.extensions as unknown[]
        return {
            setEditable: jest.fn(),
            commands: { focus: jest.fn(), setContent: jest.fn() },
            getMarkdown: () => 'mock markdown',
            getJSON: () => ({ type: 'doc', content: [] })
        }
    },
    EditorContent: ({ editor, ...rest }: { editor: unknown; [key: string]: unknown }) => (
        <div data-testid='tiptap-editor-content' data-has-editor={!!editor} {...rest} />
    )
}))

jest.mock('@tiptap/starter-kit', () => ({
    __esModule: true,
    default: { configure: jest.fn(() => 'StarterKit') }
}))

jest.mock('@tiptap/extension-code-block-lowlight', () => ({
    __esModule: true,
    default: {
        configure: jest.fn(() => 'CodeBlockLowlight'),
        extend: jest.fn(() => 'CodeBlockLowlightExtended')
    }
}))

jest.mock('@tiptap/extension-placeholder', () => ({
    __esModule: true,
    default: { configure: jest.fn(() => 'Placeholder') }
}))

jest.mock('@tiptap/markdown', () => ({
    Markdown: { configure: jest.fn(() => 'Markdown') }
}))

jest.mock('lowlight', () => ({
    common: {},
    createLowlight: jest.fn(() => ({ register: jest.fn() }))
}))

describe('RichTextEditor', () => {
    let mockOnChange: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        capturedOnUpdate = undefined
        capturedExtensions = undefined
        mockOnChange = jest.fn()
    })

    it('should render the editor container', () => {
        render(<RichTextEditor value='Hello' onChange={mockOnChange} />)

        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
        expect(screen.getByTestId('tiptap-editor-content')).toBeInTheDocument()
    })

    it('should pass the editor instance to EditorContent', () => {
        render(<RichTextEditor value='Hello' onChange={mockOnChange} />)

        expect(screen.getByTestId('tiptap-editor-content')).toHaveAttribute('data-has-editor', 'true')
    })

    it('should call onChange with markdown when editor content updates', () => {
        render(<RichTextEditor value='' onChange={mockOnChange} />)

        expect(capturedOnUpdate).toBeDefined()
        capturedOnUpdate!({ editor: { getMarkdown: () => '**Updated**' } })

        expect(mockOnChange).toHaveBeenCalledWith('**Updated**')
    })

    it('should call onChange with Markdown', () => {
        render(<RichTextEditor value='' onChange={mockOnChange} />)

        capturedOnUpdate!({ editor: { getMarkdown: () => '## Heading' } })

        // Must be the markdown string, not wrapped in HTML tags
        expect(mockOnChange).toHaveBeenCalledWith('## Heading')
        expect(mockOnChange).not.toHaveBeenCalledWith(expect.stringContaining('<h2>'))
    })

    it('should render with rows prop', () => {
        render(<RichTextEditor value='' onChange={mockOnChange} rows={15} />)

        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
    })

    it('should render in disabled state', () => {
        render(<RichTextEditor value='' onChange={mockOnChange} disabled={true} />)

        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
    })

    describe('buildExtensions — useMarkdown flag', () => {
        it('includes Markdown extension when useMarkdown is true (default)', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} useMarkdown={true} />)

            expect(capturedExtensions).toContain(Markdown)
        })

        it('excludes Markdown extension when useMarkdown is false', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} useMarkdown={false} />)

            expect(capturedExtensions).not.toContain(Markdown)
        })

        it('passes link:false to StarterKit when useMarkdown is false', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} useMarkdown={false} />)

            expect(StarterKit.configure).toHaveBeenCalledWith(expect.objectContaining({ link: false }))
        })

        it('does not pass link:false to StarterKit when useMarkdown is true (default)', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} useMarkdown={true} />)

            expect(StarterKit.configure).not.toHaveBeenCalledWith(expect.objectContaining({ link: false }))
        })
    })

    describe('XML tag preservation in onUpdate', () => {
        it('should unescape entity-escaped XML tags before calling onChange', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} />)

            // Simulate getMarkdown() returning entity-escaped tags (safety-net path)
            capturedOnUpdate!({
                editor: { getMarkdown: () => '&lt;instructions&gt;Be helpful&lt;/instructions&gt;' }
            })

            expect(mockOnChange).toHaveBeenCalledWith('<instructions>Be helpful</instructions>')
        })

        it('should pass through raw XML tags in markdown unchanged', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} />)

            capturedOnUpdate!({
                editor: { getMarkdown: () => '<instructions>Be helpful</instructions>' }
            })

            expect(mockOnChange).toHaveBeenCalledWith('<instructions>Be helpful</instructions>')
        })

        it('should preserve XML tags mixed with markdown', () => {
            render(<RichTextEditor value='' onChange={mockOnChange} />)

            capturedOnUpdate!({
                editor: { getMarkdown: () => '# Title\n&lt;question&gt;{{input}}&lt;/question&gt;\n**bold**' }
            })

            expect(mockOnChange).toHaveBeenCalledWith('# Title\n<question>{{input}}</question>\n**bold**')
        })

        it('should render without error when useMarkdown is false', () => {
            // HTML mode is exercised by other tests; this guards the component mounts cleanly.
            render(<RichTextEditor value='' onChange={mockOnChange} useMarkdown={false} />)

            expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
        })
    })
})
