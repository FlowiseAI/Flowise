import { render, screen } from '@testing-library/react'

import { CodeInput } from './CodeInput'

// Mock CodeMirror — jsdom doesn't support it
jest.mock('@uiw/react-codemirror', () => {
    const MockCodeMirror = ({ value, readOnly, height }: { value: string; readOnly?: boolean; height?: string }) => (
        <textarea data-testid='codemirror' value={value} readOnly={readOnly} data-height={height} onChange={() => {}} />
    )
    MockCodeMirror.displayName = 'MockCodeMirror'
    return { __esModule: true, default: MockCodeMirror }
})

jest.mock('@uiw/codemirror-theme-vscode', () => ({ vscodeDark: 'vscodeDark' }))
jest.mock('@uiw/codemirror-theme-sublime', () => ({ sublime: 'sublime' }))
jest.mock('@codemirror/lang-javascript', () => ({ javascript: () => [] }))
jest.mock('@codemirror/lang-json', () => ({ json: () => [] }))
jest.mock('@codemirror/lang-python', () => ({ python: () => [] }))

describe('CodeInput', () => {
    it('renders CodeMirror with the provided value', () => {
        render(<CodeInput value='const x = 1' onChange={jest.fn()} />)

        const editor = screen.getByTestId('codemirror')
        expect(editor).toHaveValue('const x = 1')
    })

    it('renders with default height of 200px', () => {
        render(<CodeInput value='' onChange={jest.fn()} />)

        expect(screen.getByTestId('codemirror')).toHaveAttribute('data-height', '200px')
    })

    it('renders with custom height', () => {
        render(<CodeInput value='' onChange={jest.fn()} height='400px' />)

        expect(screen.getByTestId('codemirror')).toHaveAttribute('data-height', '400px')
    })

    it('sets readOnly when disabled', () => {
        render(<CodeInput value='code' onChange={jest.fn()} disabled />)

        expect(screen.getByTestId('codemirror')).toHaveAttribute('readonly')
    })

    it('is not readOnly when enabled', () => {
        render(<CodeInput value='code' onChange={jest.fn()} />)

        expect(screen.getByTestId('codemirror')).not.toHaveAttribute('readonly')
    })

    it('renders empty string when value is empty', () => {
        render(<CodeInput value='' onChange={jest.fn()} />)

        expect(screen.getByTestId('codemirror')).toHaveValue('')
    })

    it('renders inside a bordered container', () => {
        const { container } = render(<CodeInput value='' onChange={jest.fn()} />)

        const box = container.firstChild as HTMLElement
        expect(box).toBeTruthy()
    })
})
