import { render, screen } from '@testing-library/react'

import { JsonInput } from './JsonInput'

// Mock ReactJson
jest.mock('flowise-react-json-view', () => {
    const MockReactJson = (props: {
        src: object
        theme?: string
        name?: false | null
        enableClipboard?: unknown
        onEdit?: unknown
        onAdd?: unknown
        onDelete?: unknown
    }) => <div data-testid='react-json' data-src={JSON.stringify(props.src)} data-theme={props.theme} data-editable={!!props.onEdit} />
    MockReactJson.displayName = 'MockReactJson'
    return { __esModule: true, default: MockReactJson }
})

describe('JsonInput', () => {
    it('renders ReactJson with parsed value', () => {
        render(<JsonInput value='{"name":"test"}' onChange={jest.fn()} />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-src', '{"name":"test"}')
    })

    it('renders {} for empty value', () => {
        render(<JsonInput value='' onChange={jest.fn()} />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-src', '{}')
    })

    it('renders {} for invalid JSON', () => {
        render(<JsonInput value='not json' onChange={jest.fn()} />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-src', '{}')
    })

    it('is editable when not disabled', () => {
        render(<JsonInput value='{}' onChange={jest.fn()} />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-editable', 'true')
    })

    it('is read-only when disabled', () => {
        render(<JsonInput value='{}' onChange={jest.fn()} disabled />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-editable', 'false')
    })

    it('uses rjv-default theme in light mode', () => {
        render(<JsonInput value='{}' onChange={jest.fn()} />)

        const jsonView = screen.getByTestId('react-json')
        expect(jsonView).toHaveAttribute('data-theme', 'rjv-default')
    })

    it('renders stopPropagation wrapper when not disabled', () => {
        render(<JsonInput value='{}' onChange={jest.fn()} />)

        expect(screen.getByRole('button', { name: 'JSON Editor' })).toBeInTheDocument()
    })

    it('does not render wrapper div when disabled', () => {
        render(<JsonInput value='{}' onChange={jest.fn()} disabled />)

        expect(screen.queryByRole('button', { name: 'JSON Editor' })).not.toBeInTheDocument()
    })
})
