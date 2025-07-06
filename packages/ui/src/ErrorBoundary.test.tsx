import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import ErrorBoundary from './ErrorBoundary'

const mockAxiosError = new AxiosError('TEST', '404', undefined, undefined, {
    status: 404,
    statusText: '',
    config: {} as any,
    headers: {},
    data: { message: 'MESSAGE' }
})

test('renders', () => {
    render(<ErrorBoundary error={mockAxiosError} />)
    expect(screen.getByRole('heading', { name: /Oh snap!/ })).toBeInTheDocument()
    expect(screen.getByText(`Status: ${mockAxiosError.status}`)).toBeInTheDocument()
})

test('copies error to clipboard on click', async () => {
    const user = userEvent.setup()
    render(<ErrorBoundary error={mockAxiosError} />)

    const copyButton = screen.getByRole('button', { name: /Copy error to clipboard/ })
    await user.click(copyButton)

    const clipboardText = await navigator.clipboard.readText()
    expect(clipboardText).toEqual(`Status: ${mockAxiosError.status}\n${mockAxiosError.response.data.message}`)
})
