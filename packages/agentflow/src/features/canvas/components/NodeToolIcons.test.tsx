import { darken } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { Mock } from 'jest-mock'

import { useConfigContext } from '@/infrastructure/store'

import { NodeToolIcons } from './NodeToolIcons'

// --- Mocks ---
jest.mock('@/infrastructure/store', () => ({
    useApiContext: () => ({ apiBaseUrl: 'http://localhost:3000' }),
    useConfigContext: jest.fn(() => ({ isDarkMode: false }))
}))

jest.mock('@mui/material/styles', () => ({
    ...jest.requireActual('@mui/material/styles'),
    darken: jest.fn((color: string, coefficient: number) => `darken(${color},${coefficient})`)
}))

jest.mock('../nodeIcons', () => ({
    getBuiltInOpenAIToolIcon: (toolName: string) => {
        const icons: Record<string, React.ReactElement> = {
            web_search_preview: <span data-testid='openai-web-search' />,
            code_interpreter: <span data-testid='openai-code-interpreter' />,
            image_generation: <span data-testid='openai-image-generation' />
        }
        return icons[toolName] ?? null
    },
    getBuiltInGeminiToolIcon: (toolName: string) => {
        const icons: Record<string, React.ReactElement> = {
            urlContext: <span data-testid='gemini-url-context' />,
            googleSearch: <span data-testid='gemini-google-search' />,
            codeExecution: <span data-testid='gemini-code-execution' />
        }
        return icons[toolName] ?? null
    },
    getBuiltInAnthropicToolIcon: (toolName: string) => {
        const icons: Record<string, React.ReactElement> = {
            web_search_20250305: <span data-testid='anthropic-web-search' />,
            web_fetch_20250910: <span data-testid='anthropic-web-fetch' />
        }
        return icons[toolName] ?? null
    }
}))

// --- Helpers ---
function renderToolIcons(inputs: Record<string, unknown>, nodeColor = '#4A90D9') {
    return render(<NodeToolIcons inputs={inputs} nodeColor={nodeColor} />)
}

// --- Tests ---

describe('NodeToolIcons', () => {
    describe('renders nothing', () => {
        it('returns null when inputs is undefined', () => {
            const { container } = render(<NodeToolIcons />)
            expect(container.firstChild).toBeNull()
        })

        it('returns null when inputs has no tool fields', () => {
            const { container } = renderToolIcons({ llmModel: 'gpt-4', someOtherField: 'value' })
            expect(container.firstChild).toBeNull()
        })

        it('returns null when tool arrays are empty', () => {
            const { container } = renderToolIcons({ llmTools: [], agentTools: [] })
            expect(container.firstChild).toBeNull()
        })

        it('returns null when llmTools is a non-array (JSON string guard)', () => {
            // Non-array values should be ignored, not crash
            const { container } = renderToolIcons({ llmTools: '[{"llmSelectedTool":"customTool"}]' })
            expect(container.firstChild).toBeNull()
        })

        it('returns null when agentKnowledgeVSEmbeddings is a non-array', () => {
            const { container } = renderToolIcons({ agentKnowledgeVSEmbeddings: 'not-an-array' })
            expect(container.firstChild).toBeNull()
        })
    })

    describe('llmTools', () => {
        it('renders icon for each tool in llmTools', () => {
            renderToolIcons({
                llmTools: [{ llmSelectedTool: 'customTool1' }, { llmSelectedTool: 'customTool2' }]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(2)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/customTool1')
            expect(imgs[1]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/customTool2')
        })

        it('skips entries without llmSelectedTool property', () => {
            renderToolIcons({
                llmTools: [{ llmSelectedTool: 'toolA' }, { someOtherProp: 'value' }]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(1)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/toolA')
        })
    })

    describe('agentTools', () => {
        it('renders icon for each tool in agentTools', () => {
            renderToolIcons({
                agentTools: [{ agentSelectedTool: 'agentToolX' }]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(1)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/agentToolX')
        })
    })

    describe('selectedTool / toolAgentflowSelectedTool', () => {
        it('renders icon for selectedTool', () => {
            renderToolIcons({ selectedTool: 'myTool' })
            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/myTool')
        })

        it('falls back to toolAgentflowSelectedTool when selectedTool is absent', () => {
            renderToolIcons({ toolAgentflowSelectedTool: 'fallbackTool' })
            const img = screen.getByRole('img')
            expect(img).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/fallbackTool')
        })

        it('prefers selectedTool over toolAgentflowSelectedTool', () => {
            renderToolIcons({ selectedTool: 'primary', toolAgentflowSelectedTool: 'secondary' })
            const imgs = screen.getAllByRole('img')
            // Only one icon should render (the resolved single tool)
            expect(imgs).toHaveLength(1)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/primary')
        })

        it('renders nothing when both selectedTool and toolAgentflowSelectedTool are absent', () => {
            const { container } = renderToolIcons({ llmModel: 'gpt-4' })
            expect(container.firstChild).toBeNull()
        })
    })

    describe('agentKnowledgeVSEmbeddings', () => {
        it('renders vectorStore and embeddingModel icons per entry', () => {
            renderToolIcons({
                agentKnowledgeVSEmbeddings: [{ vectorStore: 'pinecone', embeddingModel: 'openaiEmbeddings' }]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(2)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/pinecone')
            expect(imgs[1]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/openaiEmbeddings')
        })

        it('renders only vectorStore icon when embeddingModel is absent', () => {
            renderToolIcons({
                agentKnowledgeVSEmbeddings: [{ vectorStore: 'pinecone' }]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(1)
            expect(imgs[0]).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/pinecone')
        })

        it('renders icons for multiple knowledge entries', () => {
            renderToolIcons({
                agentKnowledgeVSEmbeddings: [
                    { vectorStore: 'pinecone', embeddingModel: 'openaiEmbeddings' },
                    { vectorStore: 'weaviate', embeddingModel: 'cohereEmbeddings' }
                ]
            })
            const imgs = screen.getAllByRole('img')
            expect(imgs).toHaveLength(4)
        })
    })

    describe('built-in OpenAI tools', () => {
        it('renders icon for web_search_preview as array', () => {
            renderToolIcons({ agentToolsBuiltInOpenAI: ['web_search_preview'] })
            expect(screen.getByTestId('openai-web-search')).toBeInTheDocument()
        })

        it('renders icon for code_interpreter', () => {
            renderToolIcons({ agentToolsBuiltInOpenAI: ['code_interpreter'] })
            expect(screen.getByTestId('openai-code-interpreter')).toBeInTheDocument()
        })

        it('renders icon for image_generation', () => {
            renderToolIcons({ agentToolsBuiltInOpenAI: ['image_generation'] })
            expect(screen.getByTestId('openai-image-generation')).toBeInTheDocument()
        })

        it('accepts JSON string input', () => {
            renderToolIcons({ agentToolsBuiltInOpenAI: '["web_search_preview","code_interpreter"]' })
            expect(screen.getByTestId('openai-web-search')).toBeInTheDocument()
            expect(screen.getByTestId('openai-code-interpreter')).toBeInTheDocument()
        })

        it('renders no icons for unknown built-in tool names', () => {
            renderToolIcons({ agentToolsBuiltInOpenAI: ['unknown_tool'] })
            expect(screen.queryByRole('img')).not.toBeInTheDocument()
            expect(screen.queryByTestId(/^openai-/)).not.toBeInTheDocument()
        })
    })

    describe('built-in Gemini tools', () => {
        it('renders icon for urlContext', () => {
            renderToolIcons({ agentToolsBuiltInGemini: ['urlContext'] })
            expect(screen.getByTestId('gemini-url-context')).toBeInTheDocument()
        })

        it('renders icon for googleSearch', () => {
            renderToolIcons({ agentToolsBuiltInGemini: ['googleSearch'] })
            expect(screen.getByTestId('gemini-google-search')).toBeInTheDocument()
        })

        it('renders icon for codeExecution', () => {
            renderToolIcons({ agentToolsBuiltInGemini: ['codeExecution'] })
            expect(screen.getByTestId('gemini-code-execution')).toBeInTheDocument()
        })

        it('accepts JSON string input', () => {
            renderToolIcons({ agentToolsBuiltInGemini: '["googleSearch"]' })
            expect(screen.getByTestId('gemini-google-search')).toBeInTheDocument()
        })
    })

    describe('built-in Anthropic tools', () => {
        it('renders icon for web_search_20250305', () => {
            renderToolIcons({ agentToolsBuiltInAnthropic: ['web_search_20250305'] })
            expect(screen.getByTestId('anthropic-web-search')).toBeInTheDocument()
        })

        it('renders icon for web_fetch_20250910', () => {
            renderToolIcons({ agentToolsBuiltInAnthropic: ['web_fetch_20250910'] })
            expect(screen.getByTestId('anthropic-web-fetch')).toBeInTheDocument()
        })

        it('accepts JSON string input', () => {
            renderToolIcons({ agentToolsBuiltInAnthropic: '["web_search_20250305","web_fetch_20250910"]' })
            expect(screen.getByTestId('anthropic-web-search')).toBeInTheDocument()
            expect(screen.getByTestId('anthropic-web-fetch')).toBeInTheDocument()
        })

        it('renders no icons for unknown built-in tool names', () => {
            renderToolIcons({ agentToolsBuiltInAnthropic: ['unknown_anthropic_tool'] })
            expect(screen.queryByRole('img')).not.toBeInTheDocument()
            expect(screen.queryByTestId(/^anthropic-/)).not.toBeInTheDocument()
        })
    })

    describe('multiple tool groups', () => {
        it('renders icons from multiple tool groups simultaneously', () => {
            renderToolIcons({
                llmTools: [{ llmSelectedTool: 'customTool' }],
                agentToolsBuiltInOpenAI: ['web_search_preview'],
                agentToolsBuiltInGemini: ['googleSearch']
            })
            expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:3000/api/v1/node-icon/customTool')
            expect(screen.getByTestId('openai-web-search')).toBeInTheDocument()
            expect(screen.getByTestId('gemini-google-search')).toBeInTheDocument()
        })
    })

    describe('dark mode', () => {
        afterEach(() => {
            ;(useConfigContext as Mock).mockReturnValue({ isDarkMode: false })
        })

        it('renders built-in tool icons in dark mode without crashing', () => {
            ;(useConfigContext as Mock).mockReturnValue({ isDarkMode: true })
            expect(() => renderToolIcons({ agentToolsBuiltInOpenAI: ['web_search_preview'] })).not.toThrow()
        })

        it('uses a higher darken coefficient in dark mode than in light mode', () => {
            const nodeColor = '#4A90D9'

            ;(useConfigContext as Mock).mockReturnValue({ isDarkMode: true })
            renderToolIcons({ agentToolsBuiltInOpenAI: ['web_search_preview'] }, nodeColor)
            expect(darken).toHaveBeenCalledWith(nodeColor, 0.5)
            ;(useConfigContext as Mock).mockReturnValue({ isDarkMode: false })
            renderToolIcons({ agentToolsBuiltInOpenAI: ['web_search_preview'] }, nodeColor)
            expect(darken).toHaveBeenCalledWith(nodeColor, 0.2)
        })
    })

    describe('edge cases', () => {
        it('handles invalid JSON string for built-in tools gracefully', () => {
            const { container } = renderToolIcons({ agentToolsBuiltInOpenAI: 'not-valid-json' })
            expect(container.firstChild).toBeNull()
        })

        it('handles empty JSON array string', () => {
            const { container } = renderToolIcons({ agentToolsBuiltInOpenAI: '[]' })
            expect(container.firstChild).toBeNull()
        })

        it('does not crash when nodeColor is undefined', () => {
            expect(() => render(<NodeToolIcons inputs={{ agentToolsBuiltInOpenAI: ['web_search_preview'] }} />)).not.toThrow()
        })
    })
})
