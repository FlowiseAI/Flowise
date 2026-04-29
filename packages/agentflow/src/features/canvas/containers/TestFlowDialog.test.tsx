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
const mockAbortMessage = jest.fn().mockResolvedValue(undefined)
const mockGetAllExecutions = jest.fn().mockResolvedValue({ data: [], total: 0 })
const mockGetChatflow = jest.fn().mockResolvedValue({ id: 'flow-123', flowData: '{"nodes":[],"edges":[]}' })

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: { chatflow: { id: 'flow-123' }, executionState: null },
        setNodeExecutionStatus: mockSetNodeExecutionStatus,
        clearExecutionState: mockClearExecutionState
    }),
    useApiContext: () => ({
        apiBaseUrl: 'http://localhost:3000',
        token: 'test-token',
        chatflowsApi: {
            abortMessage: mockAbortMessage,
            getChatflow: mockGetChatflow
        },
        executionsApi: {
            getAllExecutions: mockGetAllExecutions
        }
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
    mockGetAllExecutions.mockResolvedValue({ data: [], total: 0 })
    mockGetChatflow.mockResolvedValue({ id: 'flow-123', flowData: '{"nodes":[],"edges":[]}' })
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
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
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
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
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
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
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
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
                onmessage(makeEvent('start', null))
                onmessage(makeEvent('error', 'Something went wrong'))
            })

            expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument()
        })

        it('updates chatId from metadata event', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Meta' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage, onclose } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
                onmessage(makeEvent('metadata', { chatId: 'server-chat-id-xyz' }))
                onclose() // finish the stream so loading=false and input re-enables
            })

            // Subsequent send should use the server-provided chatId
            await waitFor(() => expect(screen.getByPlaceholderText('Type a message...')).not.toBeDisabled())
            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Next' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() =>
                expect(mockFetchEventSource).toHaveBeenLastCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: expect.stringContaining('server-chat-id-xyz')
                    })
                )
            )
        })

        it('renders follow-up prompt chips from metadata event', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Hi' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
                onmessage(makeEvent('metadata', { followUpPrompts: JSON.stringify(['Tell me more', 'Explain further']) }))
                onmessage(makeEvent('end', null))
            })

            await waitFor(() => expect(screen.getByText('Tell me more')).toBeInTheDocument())
            expect(screen.getByText('Explain further')).toBeInTheDocument()
        })

        it('renders action buttons on action event', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Approve?' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen, onmessage } = getHandlers()

            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
                onmessage(makeEvent('start', null))
                onmessage(
                    makeEvent('action', {
                        id: 'action-1',
                        elements: [
                            { label: 'Approve', type: 'agentflowv2-approve' },
                            { label: 'Reject', type: 'agentflowv2-reject' }
                        ]
                    })
                )
            })

            await waitFor(() => expect(screen.getByText('Approve')).toBeInTheDocument())
            expect(screen.getByText('Reject')).toBeInTheDocument()
        })
    })

    describe('stop button', () => {
        it('calls abortMessage when stop is clicked', async () => {
            const getHandlers = captureSSEHandlers()
            renderDialog()

            fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Long task' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter', shiftKey: false })

            await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalled())
            const { onopen } = getHandlers()
            await act(async () => {
                await onopen({ ok: true, headers: new Headers({ 'content-type': 'text/event-stream' }) } as unknown as Response)
            })

            const stopBtn = screen.getByTitle('Stop')
            await act(async () => {
                fireEvent.click(stopBtn)
            })

            await waitFor(() => expect(mockAbortMessage).toHaveBeenCalledWith('flow-123', expect.any(String)))
        })
    })

    describe('chat history', () => {
        it('loads and displays history from executions on open', async () => {
            mockGetAllExecutions.mockResolvedValue({
                data: [
                    {
                        id: 'exec-1',
                        sessionId: 'session-abc',
                        executionData: JSON.stringify([
                            {
                                nodeId: 'start_0',
                                nodeLabel: 'Start',
                                data: { name: 'startAgentflow', input: { question: 'What is AI?' }, output: { question: 'What is AI?' } },
                                status: 'FINISHED'
                            },
                            {
                                nodeId: 'llm_0',
                                nodeLabel: 'LLM',
                                data: { name: 'llmAgentflow', output: { content: 'AI stands for Artificial Intelligence.' } },
                                status: 'FINISHED'
                            }
                        ])
                    }
                ],
                total: 1
            })

            renderDialog()

            await waitFor(() => expect(screen.getByText('What is AI?')).toBeInTheDocument())
            expect(screen.getByText('AI stands for Artificial Intelligence.')).toBeInTheDocument()
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
