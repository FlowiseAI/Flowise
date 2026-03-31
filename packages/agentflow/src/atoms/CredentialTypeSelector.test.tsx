import { fireEvent, render, screen } from '@testing-library/react'

import type { ComponentCredentialSchema } from '@/core/types'

import { CredentialTypeSelector } from './CredentialTypeSelector'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@tabler/icons-react', () => ({
    IconKey: () => <span data-testid='icon-key-fallback' />,
    IconSearch: () => <span data-testid='icon-search' />,
    IconX: (props: { onClick?: () => void }) => <button data-testid='icon-x' onClick={props.onClick} />
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const schemas: ComponentCredentialSchema[] = [
    { label: 'HTTP Basic Auth', name: 'httpBasicAuth', inputs: [] },
    { label: 'HTTP Bearer Token', name: 'httpBearerToken', inputs: [] },
    { label: 'HTTP Api Key', name: 'httpApiKey', inputs: [] }
]

const apiBaseUrl = 'http://localhost:3000'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CredentialTypeSelector', () => {
    it('renders search input with placeholder', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        expect(screen.getByPlaceholderText('Search credential')).toBeInTheDocument()
    })

    it('renders all credential cards with labels and icons', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        expect(screen.getByText('HTTP Basic Auth')).toBeInTheDocument()
        expect(screen.getByText('HTTP Bearer Token')).toBeInTheDocument()
        expect(screen.getByText('HTTP Api Key')).toBeInTheDocument()

        const images = screen.getAllByRole('img')
        expect(images).toHaveLength(3)
        expect(images[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/components-credentials-icon/httpBasicAuth')
        expect(images[0]).toHaveAttribute('alt', 'httpBasicAuth')
    })

    it('calls onSelect with the clicked schema', () => {
        const onSelect = jest.fn()
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={onSelect} />)

        fireEvent.click(screen.getByText('HTTP Bearer Token'))

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith(schemas[1])
    })

    it('filters schemas by search input', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        const searchInput = screen.getByPlaceholderText('Search credential')
        fireEvent.change(searchInput, { target: { value: 'bearer' } })

        expect(screen.getByText('HTTP Bearer Token')).toBeInTheDocument()
        expect(screen.queryByText('HTTP Basic Auth')).not.toBeInTheDocument()
        expect(screen.queryByText('HTTP Api Key')).not.toBeInTheDocument()
    })

    it('search is case-insensitive', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('Search credential'), { target: { value: 'API' } })

        expect(screen.getByText('HTTP Api Key')).toBeInTheDocument()
        expect(screen.queryByText('HTTP Basic Auth')).not.toBeInTheDocument()
    })

    it('clears search when clear button is clicked', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        const searchInput = screen.getByPlaceholderText('Search credential')
        fireEvent.change(searchInput, { target: { value: 'bearer' } })

        expect(screen.queryByText('HTTP Basic Auth')).not.toBeInTheDocument()

        fireEvent.click(screen.getByTestId('icon-x'))

        expect(screen.getByText('HTTP Basic Auth')).toBeInTheDocument()
        expect(screen.getByText('HTTP Bearer Token')).toBeInTheDocument()
        expect(screen.getByText('HTTP Api Key')).toBeInTheDocument()
    })

    it('shows no cards when search matches nothing', () => {
        render(<CredentialTypeSelector schemas={schemas} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('Search credential'), { target: { value: 'nonexistent' } })

        expect(screen.queryByText('HTTP Basic Auth')).not.toBeInTheDocument()
        expect(screen.queryByText('HTTP Bearer Token')).not.toBeInTheDocument()
        expect(screen.queryByText('HTTP Api Key')).not.toBeInTheDocument()
        expect(screen.queryAllByRole('img')).toHaveLength(0)
    })

    it('renders empty list when schemas is empty', () => {
        render(<CredentialTypeSelector schemas={[]} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        expect(screen.getByPlaceholderText('Search credential')).toBeInTheDocument()
        expect(screen.queryAllByRole('img')).toHaveLength(0)
    })

    it('shows fallback key icon when credential icon fails to load', () => {
        render(<CredentialTypeSelector schemas={[schemas[0]]} apiBaseUrl={apiBaseUrl} onSelect={jest.fn()} />)

        const img = screen.getByAltText('httpBasicAuth')
        fireEvent.error(img)

        expect(screen.queryByAltText('httpBasicAuth')).not.toBeInTheDocument()
        expect(screen.getByTestId('icon-key-fallback')).toBeInTheDocument()
    })
})
