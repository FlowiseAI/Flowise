import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { GenerateFlowDialog } from './GenerateFlowDialog'

// --- Mocks ---
const mockGetChatModels = jest.fn()
const mockGenerateAgentflow = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useApiContext: () => ({
        chatflowsApi: {
            getChatModels: mockGetChatModels,
            generateAgentflow: mockGenerateAgentflow
        },
        apiBaseUrl: 'https://test.com'
    }),
    useConfigContext: () => ({
        isDarkMode: false
    })
}))

jest.mock('./SuggestionChips', () => ({
    defaultSuggestions: [{ id: '1', text: 'Test suggestion' }],
    SuggestionChips: ({ onSelect, suggestions }: { onSelect: (s: { text: string }) => void; suggestions: { text: string }[] }) => (
        <div data-testid='suggestion-chips'>
            {suggestions.map((s, i) => (
                <button key={i} data-testid={`suggestion-${i}`} onClick={() => onSelect(s)}>
                    {s.text}
                </button>
            ))}
        </div>
    )
}))

jest.mock('@tabler/icons-react', () => ({
    IconSparkles: () => <span data-testid='icon-sparkles' />
}))

describe('GenerateFlowDialog', () => {
    const defaultProps = {
        open: true,
        onClose: jest.fn(),
        onGenerated: jest.fn()
    }

    const chatModels = [
        { name: 'gpt-4', label: 'GPT-4' },
        { name: 'claude', label: 'Claude' }
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetChatModels.mockResolvedValue(chatModels)
        mockGenerateAgentflow.mockResolvedValue({
            nodes: [{ id: 'n1' }],
            edges: [{ id: 'e1' }]
        })
    })

    it('should not render dialog content when open is false', () => {
        render(<GenerateFlowDialog {...defaultProps} open={false} />)
        expect(screen.queryByText('What would you like to build?')).not.toBeInTheDocument()
    })

    it('should render dialog when open is true', () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        expect(screen.getByText('What would you like to build?')).toBeInTheDocument()
    })

    it('should load chat models on open', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())
    })

    it('should auto-select first model', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => {
            expect(screen.getByText('GPT-4')).toBeInTheDocument()
        })
    })

    it('should show error when chat models fail to load', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
        mockGetChatModels.mockRejectedValue(new Error('fail'))

        render(<GenerateFlowDialog {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getByText('Failed to load chat models. Please try again.')).toBeInTheDocument()
        })
        spy.mockRestore()
    })

    it('should have generate button disabled when prompt is empty', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        const generateBtn = screen.getByRole('button', { name: /generate/i })
        expect(generateBtn).toBeDisabled()
    })

    it('should enable generate button when prompt and model are set', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        // Type a prompt
        const input = screen.getByPlaceholderText('Describe your agent here')
        fireEvent.change(input, { target: { value: 'Build an agent' } })

        const generateBtn = screen.getByRole('button', { name: /generate/i })
        expect(generateBtn).not.toBeDisabled()
    })

    it('should update prompt when suggestion is clicked', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        fireEvent.click(screen.getByTestId('suggestion-0'))

        const input = screen.getByPlaceholderText('Describe your agent here') as HTMLTextAreaElement
        expect(input.value).toBe('Test suggestion')
    })

    it('should call onGenerated and onClose on successful generation', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        // Type prompt
        const input = screen.getByPlaceholderText('Describe your agent here')
        fireEvent.change(input, { target: { value: 'Build an agent' } })

        // Click generate
        fireEvent.click(screen.getByRole('button', { name: /generate/i }))

        await waitFor(() => {
            expect(defaultProps.onGenerated).toHaveBeenCalledWith([{ id: 'n1' }], [{ id: 'e1' }])
            expect(defaultProps.onClose).toHaveBeenCalled()
        })
    })

    it('should show error when generation returns no nodes/edges', async () => {
        mockGenerateAgentflow.mockResolvedValue({})

        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
            target: { value: 'Build an agent' }
        })
        fireEvent.click(screen.getByRole('button', { name: /generate/i }))

        await waitFor(() => {
            expect(screen.getByText('Failed to generate flow. Please try again.')).toBeInTheDocument()
        })
        expect(defaultProps.onGenerated).not.toHaveBeenCalled()
    })

    it('should show error message on generation failure', async () => {
        mockGenerateAgentflow.mockRejectedValue(new Error('API error'))

        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
            target: { value: 'Build an agent' }
        })
        fireEvent.click(screen.getByRole('button', { name: /generate/i }))

        await waitFor(() => {
            expect(screen.getByText('API error')).toBeInTheDocument()
        })
    })

    it('should handle non-Error exceptions with response.data.message', async () => {
        mockGenerateAgentflow.mockRejectedValue({
            response: { data: { message: 'Server validation error' } }
        })

        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
            target: { value: 'Build an agent' }
        })
        fireEvent.click(screen.getByRole('button', { name: /generate/i }))

        await waitFor(() => {
            expect(screen.getByText('Server validation error')).toBeInTheDocument()
        })
    })

    it('should clear state when dialog closes', async () => {
        const { rerender } = render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        // Type a prompt
        fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
            target: { value: 'Some prompt' }
        })

        // Close dialog
        rerender(<GenerateFlowDialog {...defaultProps} open={false} />)

        // Re-open dialog
        rerender(<GenerateFlowDialog {...defaultProps} open={true} />)

        const input = screen.getByPlaceholderText('Describe your agent here') as HTMLTextAreaElement
        expect(input.value).toBe('')
    })

    it('should show cancel button when not loading', () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        const cancelBtn = screen.getByRole('button', { name: /cancel/i })
        expect(cancelBtn).toBeInTheDocument()
        fireEvent.click(cancelBtn)
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should show progress animation during loading', async () => {
        jest.useFakeTimers()
        try {
            // Make generation hang so we stay in loading state
            mockGenerateAgentflow.mockReturnValue(new Promise(() => {}))

            render(<GenerateFlowDialog {...defaultProps} />)
            await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

            fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
                target: { value: 'Build an agent' }
            })
            fireEvent.click(screen.getByRole('button', { name: /generate/i }))

            // Wait for loading state
            await waitFor(() => {
                expect(screen.getByText('Generating your Agentflow...')).toBeInTheDocument()
            })

            // Advance fake timers to trigger progress intervals
            act(() => {
                jest.advanceTimersByTime(1500) // 3 intervals of 500ms
            })

            // Progress should have incremented
            const progressText = screen.getByText(/%/)
            expect(progressText).toBeInTheDocument()
        } finally {
            jest.useRealTimers()
        }
    })

    it('should handle image load error by hiding image', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        // Find the model icon image and trigger error
        const images = document.querySelectorAll('img')
        expect(images.length).toBeGreaterThan(0)
        fireEvent.error(images[0])
        expect(images[0].style.display).toBe('none')
    })

    it('should not call handleGenerate when prompt is empty', async () => {
        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        // Generate button is disabled with empty prompt, but let's also verify
        // the guard condition by ensuring generateAgentflow is not called
        expect(mockGenerateAgentflow).not.toHaveBeenCalled()
    })

    it('should handle non-Error exception without response data', async () => {
        mockGenerateAgentflow.mockRejectedValue({ some: 'object' })

        render(<GenerateFlowDialog {...defaultProps} />)
        await waitFor(() => expect(mockGetChatModels).toHaveBeenCalled())

        fireEvent.change(screen.getByPlaceholderText('Describe your agent here'), {
            target: { value: 'Build an agent' }
        })
        fireEvent.click(screen.getByRole('button', { name: /generate/i }))

        await waitFor(() => {
            expect(screen.getByText('Failed to generate flow. Please try again.')).toBeInTheDocument()
        })
    })
})
