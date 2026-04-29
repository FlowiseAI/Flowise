// Import after mocks are declared
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TestFlowDialog } from './TestFlowDialog'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@microsoft/fetch-event-source', () => ({
    EventStreamContentType: 'text/event-stream',
    fetchEventSource: jest.fn()
}))

const mockSetNodeExecutionStatus = jest.fn()
const mockClearExecutionState = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { chatflow: { id: 'flow-123' }, executionState: null },
        setNodeExecutionStatus: mockSetNodeExecutionStatus,
        clearExecutionState: mockClearExecutionState
    }),
    useApiContext: () => ({
        apiBaseUrl: 'http://localhost:3000',
        token: 'test-token'
    })
}))

const mockFetchEventSource = fetchEventSource as jest.Mock

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(open = true, onClose = jest.fn()) {
    return render(
        <ThemeProvider theme={createTheme()}>
            <TestFlowDialog chatflowId='flow-123' open={open} onClose={onClose} />
        </ThemeProvider>
    )
}

type SSEHandlers = {
    onopen: (response: Response) => Promise<void>
    onmessage: (ev: { data: string }) => void
    onclose: () => void
    onerror: (err: unknown) => void
}

// Simulate SSE: capture handler references from the fetchEventSource call
function captureSSEHandlers() {
    let capturedHandlers: SSEHandlers = {
        onopen: async () => {},
        onmessage: () => {},
        onclose: () => {},
        onerror: () => {
            throw new Error()
        }
    }
    mockFetchEventSource.mockImplementation(async (_url: string, opts: SSEHandlers) => {
        capturedHandlers = {
            onopen: opts.onopen ?? (async () => {}),
            onmessage: opts.onmessage ?? (() => {}),
            onclose: opts.onclose ?? (() => {}),
            onerror:
                opts.onerror ??
                (() => {
                    throw new Error()
                })
        }
    })
    return () => capturedHandlers
}

function makeEvent(event: string, data: unknown) {
    return { data: JSON.stringify({ event, data }) }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks()
})

describe('TestFlowDialog', () => {
    describe('rendering', () => {
        it('renders welcome message when open', () => {
            renderDialog()
            expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument()
        })

        it('renders the dialog title', () => {
            renderDialog()
            expect(screen.getByText('Test Flow')).toBeInTheDocument()
        })

        it('renders input placeholder and clear/close buttons', () => {
            renderDialog()
            expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
            expect(screen.getByTitle('Clear chat')).toBeInTheDocument()
            expect(screen.getByTitle('Close')).toBeInTheDocument()
        })

        it('does not render dialog content when open is false', () => {
            renderDialog(false)
            expect(screen.queryByText('Test Flow')).not.toBeInTheDocument()
        })
    })

    describe('sending a message', () => {
        it('adds user message on Enter', async () => {
            mockFetchEventSource.mockResolvedValue(undefined)
            renderDialog()
            const input = screen.getByPlaceholderText('Type a message...')

            fireEvent.change(input, { target: { value: 'Hello' } })
            fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())
        })

        it('calls fetchEventSource with correct URL and Authorization header', async () => {
            mockFetchEventSource.mockResolvedValue(undefined)
            renderDialog()
            const input = screen.getByPlaceholderText('Type a message...')

            fireEvent.change(input, { target: { value: 'Test' } })
            fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

            await waitFor(() =>
                expect(mockFetchEventSource).toHaveBeenCalledWith(
                    'http://localhost:3000/api/v1/internal-prediction/flow-123',
                    expect.objectContaining({
                        method: 'POST',
                        headers: expect.objectContaining({
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer test-token'
                        })
                    })
                )
            )
        })

        it('skips send when input is empty', () => {
            renderDialog()
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })
            expect(mockFetchEventSource).not.toHaveBeenCalled()
        })

        it('does not send on Shift+Enter', () => {
            renderDialog()
            const input = screen.getByPlaceholderText('Type a message...')
            fireEvent.change(input, { target: { value: 'Hello' } })
            fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
            expect(mockFetchEventSource).not.toHaveBeenCalled()
        })

        it('calls clearExecutionState before sending', async () => {
            mockFetchEventSource.mockResolvedValue(undefined)
            renderDialog()
            const input = screen.getByPlaceholderText('Type a message...')

            fireEvent.change(input, { target: { value: 'Hi' } })
            fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockClearExecutionState).toHaveBeenCalled())
        })
    })

    describe('SSE event handling', () => {
        it('streams bot tokens into a message', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Go' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) })
                onmessage(makeEvent('start', null))
                onmessage(makeEvent('token', 'Hello'))
                onmessage(makeEvent('token', ' world'))
            })

            expect(screen.getByText('Hello world')).toBeInTheDocument()
        })

        it('calls setNodeExecutionStatus on nextAgentFlow', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Run' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) })
                onmessage(makeEvent('nextAgentFlow', { nodeId: 'node1', status: 'INPROGRESS' }))
            })

            expect(mockSetNodeExecutionStatus).toHaveBeenCalledWith('node1', 'INPROGRESS', undefined)
        })

        it('passes error field on nextAgentFlow ERROR', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Fail' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) })
                onmessage(makeEvent('nextAgentFlow', { nodeId: 'node2', status: 'ERROR', error: 'timeout' }))
            })

            expect(mockSetNodeExecutionStatus).toHaveBeenCalledWith('node2', 'ERROR', 'timeout')
        })

        it('shows error message on SSE error event', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Oops' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) })
                onmessage(makeEvent('start', null))
                onmessage(makeEvent('error', 'Something went wrong'))
            })

            expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument()
        })
    })

    describe('clear chat', () => {
        it('resets messages to welcome text on clear', async () => {
            mockFetchEventSource.mockResolvedValue(undefined)
            renderDialog()
            const input = screen.getByPlaceholderText('Type a message...')

            fireEvent.change(input, { target: { value: 'Hi' } })
            fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })
            await waitFor(() => expect(screen.getByText('Hi')).toBeInTheDocument())

            act(() => fireEvent.click(screen.getByTitle('Clear chat')))

            expect(screen.queryByText('Hi')).not.toBeInTheDocument()
            expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument()
        })

        it('calls clearExecutionState on clear', () => {
            renderDialog()
            act(() => fireEvent.click(screen.getByTitle('Clear chat')))
            expect(mockClearExecutionState).toHaveBeenCalled()
        })
    })

    describe('close button', () => {
        it('calls onClose when close button is clicked', () => {
            const onClose = jest.fn()
            renderDialog(true, onClose)
            fireEvent.click(screen.getByTitle('Close'))
            expect(onClose).toHaveBeenCalled()
        })
    })
})
