/**
 * Integration tests for Agentflow component
 * Focus on dark mode styling and theme integration
 */

import { createRef } from 'react'

import { fireEvent, render, waitFor } from '@testing-library/react'

import type { AgentFlowInstance, FlowData } from './core/types'
import { Agentflow } from './Agentflow'

// Mock external dependencies - implementations in __mocks__/
jest.mock('reactflow')
jest.mock('axios')

// Mock GenerateFlowDialog to expose callbacks for testing
jest.mock('./features/generator', () => ({
    GenerateFlowDialog: ({
        open,
        onClose,
        onGenerated
    }: {
        open: boolean
        onClose: () => void
        onGenerated: (nodes: FlowData['nodes'], edges: FlowData['edges']) => void
    }) =>
        open ? (
            <div data-testid='generate-dialog'>
                <button data-testid='close-dialog' onClick={onClose}>
                    Close
                </button>
                <button data-testid='trigger-generate' onClick={() => onGenerated([], [])}>
                    Generate
                </button>
            </div>
        ) : null
}))

describe('Agentflow Component', () => {
    const mockFlow: FlowData = {
        nodes: [
            {
                id: 'test-node',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    id: 'test-node',
                    name: 'startAgentflow',
                    label: 'Start',
                    color: '#7EE787',
                    outputAnchors: []
                }
            }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
    }

    const defaultProps = {
        apiBaseUrl: 'https://example.com',
        initialFlow: mockFlow
    }

    describe('Dark Mode Integration', () => {
        it('should render in light mode by default', async () => {
            const { container } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                const canvas = container.querySelector('.agentflow-canvas')
                expect(canvas).toBeInTheDocument()
                expect(canvas?.getAttribute('data-dark-mode')).toBe('false')
            })
        })

        it('should render in dark mode when isDarkMode is true', async () => {
            const { container } = render(<Agentflow {...defaultProps} isDarkMode={true} />)

            await waitFor(() => {
                const canvas = container.querySelector('.agentflow-canvas')
                expect(canvas).toBeInTheDocument()
                expect(canvas?.getAttribute('data-dark-mode')).toBe('true')
            })
        })

        it('should apply dark mode class to container', async () => {
            const { container } = render(<Agentflow {...defaultProps} isDarkMode={true} />)

            await waitFor(() => {
                const agentflowContainer = container.querySelector('.agentflow-container')
                expect(agentflowContainer).toBeInTheDocument()
                expect(agentflowContainer).toHaveClass('dark')
            })
        })

        it('should not apply dark class in light mode', async () => {
            const { container } = render(<Agentflow {...defaultProps} isDarkMode={false} />)

            await waitFor(() => {
                const agentflowContainer = container.querySelector('.agentflow-container')
                expect(agentflowContainer).toBeInTheDocument()
                expect(agentflowContainer).not.toHaveClass('dark')
            })
        })

        it('should apply dark-mode-controls class to Controls component', async () => {
            const { getByTestId } = render(<Agentflow {...defaultProps} isDarkMode={true} />)

            await waitFor(() => {
                expect(getByTestId('controls')).toHaveClass('dark-mode-controls')
            })
        })

        it('should not apply dark-mode-controls class in light mode', async () => {
            const { getByTestId } = render(<Agentflow {...defaultProps} isDarkMode={false} />)

            await waitFor(() => {
                expect(getByTestId('controls')).not.toHaveClass('dark-mode-controls')
            })
        })
    })

    describe('Theme Provider Integration', () => {
        it('should wrap content with ThemeProvider', async () => {
            const { container } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(container.firstChild).toBeInTheDocument()
            })
        })

        it('should support theme switching', async () => {
            const { container, rerender } = render(<Agentflow {...defaultProps} isDarkMode={false} />)

            await waitFor(() => {
                const canvas = container.querySelector('.agentflow-canvas')
                expect(canvas).toBeInTheDocument()
            })

            const canvas = container.querySelector('.agentflow-canvas')
            expect(canvas?.getAttribute('data-dark-mode')).toBe('false')

            rerender(<Agentflow {...defaultProps} isDarkMode={true} />)

            await waitFor(() => {
                expect(canvas?.getAttribute('data-dark-mode')).toBe('true')
            })
        })
    })

    describe('Component Structure', () => {
        it('should render main container', async () => {
            const { container } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })

        it('should render canvas area', async () => {
            const { container } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-canvas')).toBeInTheDocument()
            })
        })

        it('should render ReactFlow components', async () => {
            const { getByTestId } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(getByTestId('react-flow')).toBeInTheDocument()
                expect(getByTestId('controls')).toBeInTheDocument()
                expect(getByTestId('minimap')).toBeInTheDocument()
                expect(getByTestId('background')).toBeInTheDocument()
            })
        })
    })

    describe('Header Rendering', () => {
        it('should render default header when showDefaultHeader is true', async () => {
            const { container } = render(<Agentflow {...defaultProps} showDefaultHeader={true} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-header')).toBeInTheDocument()
            })
        })

        it('should not render default header when showDefaultHeader is false', async () => {
            const { container } = render(<Agentflow {...defaultProps} showDefaultHeader={false} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })

            expect(container.querySelector('.agentflow-header')).not.toBeInTheDocument()
        })

        it('should render custom header when renderHeader is provided', async () => {
            const customHeader = () => <div data-testid='custom-header'>Custom Header</div>
            const { getByTestId } = render(<Agentflow {...defaultProps} renderHeader={customHeader} />)

            await waitFor(() => {
                expect(getByTestId('custom-header')).toBeInTheDocument()
            })
        })
    })

    describe('Read-Only Mode', () => {
        it('should support read-only mode', async () => {
            const { container } = render(<Agentflow {...defaultProps} readOnly={true} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })

        it('should not show generate button in read-only mode', async () => {
            const { container } = render(<Agentflow {...defaultProps} readOnly={true} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })

            // Generate button should not be rendered
            expect(container.querySelector('[aria-label="generate"]')).not.toBeInTheDocument()
        })
    })

    describe('Props Integration', () => {
        it('should accept apiBaseUrl prop', async () => {
            const { container } = render(<Agentflow apiBaseUrl='https://test.com' />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })

        it('should accept token prop', async () => {
            const { container } = render(<Agentflow apiBaseUrl='https://test.com' token='test-token' />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })

        it('should accept initialFlow prop', async () => {
            const { container } = render(<Agentflow {...defaultProps} initialFlow={mockFlow} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })

        it('should accept components filter prop', async () => {
            const { container } = render(<Agentflow {...defaultProps} components={['llmAgentflow', 'agentAgentflow']} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
        })
    })

    describe('Callback Props', () => {
        it('should accept onFlowChange callback', async () => {
            const onFlowChange = jest.fn()
            const { container } = render(<Agentflow {...defaultProps} onFlowChange={onFlowChange} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
            // Callback should be registered (actual invocation tested in flow handlers)
        })

        it('should accept onSave callback', async () => {
            const onSave = jest.fn()
            const { container, getByText } = render(<Agentflow {...defaultProps} onSave={onSave} showDefaultHeader={true} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })

            // Find and click the save button
            const saveButton = getByText('Save')
            fireEvent.click(saveButton)

            // Verify the callback was called
            expect(onSave).toHaveBeenCalledTimes(1)
            expect(onSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    nodes: expect.any(Array),
                    edges: expect.any(Array)
                })
            )
        })

        it('should accept onFlowGenerated callback', async () => {
            const onFlowGenerated = jest.fn()
            const { container } = render(<Agentflow {...defaultProps} onFlowGenerated={onFlowGenerated} />)

            await waitFor(() => {
                expect(container.querySelector('.agentflow-container')).toBeInTheDocument()
            })
            // Callback should be registered
        })
    })

    describe('Generate Flow', () => {
        it('should open generate dialog when button is clicked', async () => {
            const { container, getByTestId } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(container.querySelector('[aria-label="generate"]')).toBeInTheDocument()
            })

            fireEvent.click(container.querySelector('[aria-label="generate"]')!)

            await waitFor(() => {
                expect(getByTestId('generate-dialog')).toBeInTheDocument()
            })
        })

        it('should close generate dialog via onClose', async () => {
            const { container, getByTestId, queryByTestId } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(container.querySelector('[aria-label="generate"]')).toBeInTheDocument()
            })

            fireEvent.click(container.querySelector('[aria-label="generate"]')!)

            await waitFor(() => {
                expect(getByTestId('generate-dialog')).toBeInTheDocument()
            })

            fireEvent.click(getByTestId('close-dialog'))

            await waitFor(() => {
                expect(queryByTestId('generate-dialog')).not.toBeInTheDocument()
            })
        })

        it('should call onFlowGenerated when flow is generated', async () => {
            const onFlowGenerated = jest.fn()
            const { container, getByTestId } = render(<Agentflow {...defaultProps} onFlowGenerated={onFlowGenerated} />)

            await waitFor(() => {
                expect(container.querySelector('[aria-label="generate"]')).toBeInTheDocument()
            })

            fireEvent.click(container.querySelector('[aria-label="generate"]')!)

            await waitFor(() => {
                expect(getByTestId('generate-dialog')).toBeInTheDocument()
            })

            fireEvent.click(getByTestId('trigger-generate'))

            await waitFor(() => {
                expect(onFlowGenerated).toHaveBeenCalledWith({
                    nodes: [],
                    edges: [],
                    viewport: { x: 0, y: 0, zoom: 1 }
                })
            })
        })
    })

    describe('Imperative Ref', () => {
        it('should expose agentflow instance via ref', async () => {
            const ref = createRef<AgentFlowInstance>()
            render(<Agentflow {...defaultProps} ref={ref} />)

            await waitFor(() => {
                expect(ref.current).toBeDefined()
                expect(ref.current?.getFlow).toBeInstanceOf(Function)
            })
        })
    })

    describe('CSS Variables Injection', () => {
        it('should inject CSS variables into document head', async () => {
            render(<Agentflow {...defaultProps} />)

            // CSS variables should be injected
            await waitFor(() => {
                const styleElement = document.getElementById('agentflow-css-variables')
                expect(styleElement).toBeInTheDocument()
                expect(styleElement?.textContent).toContain('--agentflow-canvas-bg')
            })
        })

        it('should update CSS variables when dark mode changes', async () => {
            const { rerender } = render(<Agentflow {...defaultProps} isDarkMode={false} />)

            // Wait for initial async operations to complete
            await waitFor(() => {
                expect(document.getElementById('agentflow-css-variables')).toBeInTheDocument()
            })

            const lightContent = document.getElementById('agentflow-css-variables')?.textContent

            rerender(<Agentflow {...defaultProps} isDarkMode={true} />)

            // Wait for useEffect to update the CSS variables
            let darkContent: string | null | undefined
            await waitFor(() => {
                darkContent = document.getElementById('agentflow-css-variables')?.textContent
                expect(darkContent).toBeTruthy()
                expect(darkContent).not.toBe(lightContent)
            })
        })

        it('should clean up CSS variables on unmount', async () => {
            const { unmount } = render(<Agentflow {...defaultProps} />)

            await waitFor(() => {
                expect(document.getElementById('agentflow-css-variables')).toBeInTheDocument()
            })

            unmount()

            expect(document.getElementById('agentflow-css-variables')).not.toBeInTheDocument()
        })
    })
})
