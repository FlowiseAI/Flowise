import { render, screen } from '@testing-library/react'

import type { InputParam, NodeData } from '@/core/types'

import { HttpBodyInput } from './HttpBodyInput'

// --- Mocks ---
const mockOnDataChange = jest.fn()
let mockRichTextOnChange: ((html: string) => void) | undefined

jest.mock('./RichTextEditor.lazy', () => ({
    RichTextEditor: ({ value, onChange, placeholder, disabled, rows }: Record<string, unknown>) => {
        // Capture onChange so tests can invoke it
        mockRichTextOnChange = onChange as (html: string) => void
        return (
            <div data-testid='rich-text-editor' data-value={value} data-placeholder={placeholder} data-disabled={disabled} data-rows={rows}>
                RichTextEditor
            </div>
        )
    }
}))

jest.mock('./ArrayInput', () => ({
    ArrayInput: ({ inputParam, disabled }: { inputParam: InputParam; disabled: boolean }) => (
        <div data-testid='array-input' data-param-name={inputParam.name} data-disabled={disabled}>
            ArrayInput
        </div>
    )
}))

jest.mock('./NodeInputHandler', () => ({
    NodeInputHandler: () => null
}))

const baseInputParam: InputParam = {
    id: 'body',
    name: 'body',
    label: 'Body',
    type: 'string',
    acceptVariable: true,
    rows: 4,
    optional: true
}

const makeNodeData = (inputValues: Record<string, unknown>): NodeData =>
    ({
        id: 'http-node-1',
        name: 'httpAgentflow',
        label: 'HTTP',
        inputValues
    } as NodeData)

describe('HttpBodyInput', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockRichTextOnChange = undefined
    })

    // --- Rendering nothing when bodyType is absent ---
    it('should render nothing when bodyType is not set', () => {
        const data = makeNodeData({})
        const { container } = render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)
        expect(container.innerHTML).toBe('')
    })

    it('should render nothing when bodyType is unrecognized', () => {
        const data = makeNodeData({ bodyType: 'xml' })
        const { container } = render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)
        expect(container.innerHTML).toBe('')
    })

    // --- JSON body type -> textarea ---
    it('should render RichTextEditor when bodyType is json', () => {
        const data = makeNodeData({ bodyType: 'json', body: '{"key":"value"}' })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        const editor = screen.getByTestId('rich-text-editor')
        expect(editor).toBeInTheDocument()
        expect(editor).toHaveAttribute('data-value', '{"key":"value"}')
        expect(editor).toHaveAttribute('data-rows', '4')
    })

    // --- Raw body type -> textarea ---
    it('should render RichTextEditor when bodyType is raw', () => {
        const data = makeNodeData({ bodyType: 'raw', body: 'plain text content' })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        const editor = screen.getByTestId('rich-text-editor')
        expect(editor).toBeInTheDocument()
        expect(editor).toHaveAttribute('data-value', 'plain text content')
    })

    // --- formData body type -> array editor ---
    it('should render ArrayInput when bodyType is formData', () => {
        const data = makeNodeData({ bodyType: 'formData', body: [{ key: 'file', value: 'test.txt' }] })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        const arrayInput = screen.getByTestId('array-input')
        expect(arrayInput).toBeInTheDocument()
        expect(arrayInput).toHaveAttribute('data-param-name', 'body')
    })

    // --- xWwwFormUrlencoded body type -> array editor ---
    it('should render ArrayInput when bodyType is xWwwFormUrlencoded', () => {
        const data = makeNodeData({ bodyType: 'xWwwFormUrlencoded', body: [{ key: 'username', value: 'test' }] })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        const arrayInput = screen.getByTestId('array-input')
        expect(arrayInput).toBeInTheDocument()
    })

    // --- Disabled prop ---
    it('should pass disabled to RichTextEditor', () => {
        const data = makeNodeData({ bodyType: 'json', body: '' })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} disabled={true} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-disabled', 'true')
    })

    it('should pass disabled to ArrayInput', () => {
        const data = makeNodeData({ bodyType: 'formData', body: [] })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} disabled={true} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('array-input')).toHaveAttribute('data-disabled', 'true')
    })

    // --- onChange callback ---
    it('should call onDataChange when RichTextEditor value changes', () => {
        const data = makeNodeData({ bodyType: 'json', body: '' })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        // Simulate editor change via captured onChange
        expect(mockRichTextOnChange).toBeDefined()
        mockRichTextOnChange!('{"updated": true}')

        expect(mockOnDataChange).toHaveBeenCalledWith({
            inputParam: baseInputParam,
            newValue: '{"updated": true}'
        })
    })

    // --- Non-string body value coercion ---
    it('should coerce non-string body value to empty string for textarea mode', () => {
        const data = makeNodeData({ bodyType: 'raw', body: 123 })
        render(<HttpBodyInput inputParam={baseInputParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-value', '')
    })

    // --- Uses rows from inputParam ---
    it('should use custom rows from inputParam', () => {
        const customParam = { ...baseInputParam, rows: 8 }
        const data = makeNodeData({ bodyType: 'json', body: '' })
        render(<HttpBodyInput inputParam={customParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-rows', '8')
    })

    // --- Default rows fallback ---
    it('should default to 4 rows when inputParam has no rows', () => {
        const noRowsParam = { ...baseInputParam, rows: undefined }
        const data = makeNodeData({ bodyType: 'json', body: '' })
        render(<HttpBodyInput inputParam={noRowsParam} data={data} onDataChange={mockOnDataChange} />)

        expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-rows', '4')
    })
})
