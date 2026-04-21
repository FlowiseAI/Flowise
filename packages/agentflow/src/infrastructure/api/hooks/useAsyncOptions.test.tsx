import { act, renderHook, waitFor } from '@testing-library/react'

import { useAsyncOptions } from './useAsyncOptions'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetChatModels = jest.fn()
const mockGetAllTools = jest.fn()
const mockGetCredentialsByName = jest.fn()
const mockGetAllChatflows = jest.fn()

// Stable API objects — same reference on every render so they don't re-trigger the effect
const mockApiContext = {
    chatflowsApi: { getAllChatflows: mockGetAllChatflows },
    chatModelsApi: { getChatModels: mockGetChatModels },
    toolsApi: { getAllTools: mockGetAllTools },
    credentialsApi: { getAllCredentials: jest.fn(), getCredentialsByName: mockGetCredentialsByName },
    apiBaseUrl: 'http://localhost:3000'
}

jest.mock('../../store/ApiContext', () => ({
    useApiContext: () => mockApiContext
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAsyncOptions', () => {
    it('starts in loading state', async () => {
        mockGetChatModels.mockResolvedValue([])
        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listModels' }))

        expect(result.current.loading).toBe(true)
        expect(result.current.options).toEqual([])
        expect(result.current.error).toBeNull()

        // Drain pending async state updates to avoid act() warnings
        await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('listModels: populates options on success', async () => {
        mockGetChatModels.mockResolvedValue([
            { name: 'gpt-4o', label: 'GPT-4o' },
            { name: 'claude-3', label: 'Claude 3', description: 'Fast model' }
        ])

        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listModels' }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mockGetChatModels).toHaveBeenCalledTimes(1)
        expect(result.current.options).toEqual([
            { name: 'gpt-4o', label: 'GPT-4o', description: undefined },
            { name: 'claude-3', label: 'Claude 3', description: 'Fast model' }
        ])
        expect(result.current.error).toBeNull()
    })

    it('listTools: populates options on success', async () => {
        mockGetAllTools.mockResolvedValue([{ name: 'calculator', label: 'Calculator' }])

        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listTools' }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mockGetAllTools).toHaveBeenCalledTimes(1)
        expect(result.current.options).toEqual([{ name: 'calculator', label: 'Calculator', description: undefined }])
    })

    it('credentialNames (single): calls getCredentialsByName with the name', async () => {
        mockGetCredentialsByName.mockResolvedValue([{ id: 'cred-1', name: 'My OpenAI Key', credentialName: 'openAIApi' }])

        const { result } = renderHook(() => useAsyncOptions({ credentialNames: ['openAIApi'] }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mockGetCredentialsByName).toHaveBeenCalledWith('openAIApi')
        // Credentials are mapped to {label: name, name: id}
        expect(result.current.options).toEqual([{ label: 'My OpenAI Key', name: 'cred-1' }])
    })

    it('credentialNames (multiple): passes names as array to getCredentialsByName', async () => {
        mockGetCredentialsByName.mockResolvedValue([
            { id: 'c1', name: 'OpenAI Key', credentialName: 'openAIApi' },
            { id: 'c2', name: 'Anthropic Key', credentialName: 'anthropicApi' }
        ])

        const { result } = renderHook(() => useAsyncOptions({ credentialNames: ['openAIApi', 'anthropicApi'] }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mockGetCredentialsByName).toHaveBeenCalledWith(['openAIApi', 'anthropicApi'])
        expect(result.current.options).toHaveLength(2)
        expect(result.current.options[0]).toEqual({ label: 'OpenAI Key', name: 'c1' })
    })

    it('listFlows: populates options with label/name/description mapped from chatflows', async () => {
        mockGetAllChatflows.mockResolvedValue([
            { id: 'cf-1', name: 'Support Bot', type: 'CHATFLOW' },
            { id: 'cf-2', name: 'Sales Agent', type: 'AGENTFLOW' },
            { id: 'cf-3', name: 'Multi Agent', type: 'MULTIAGENT' }
        ])

        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listFlows' }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(mockGetAllChatflows).toHaveBeenCalledTimes(1)
        expect(result.current.options).toEqual([
            { name: 'cf-1', label: 'Support Bot', description: 'Chatflow' },
            { name: 'cf-2', label: 'Sales Agent', description: 'Agentflow V2' },
            { name: 'cf-3', label: 'Multi Agent', description: 'Agentflow V1' }
        ])
        expect(result.current.error).toBeNull()
    })

    it('API error: sets error message, loading false', async () => {
        mockGetChatModels.mockRejectedValue(new Error('Network failure'))

        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listModels' }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBe('Network failure')
        expect(result.current.options).toEqual([])
    })

    it('refetch: re-triggers fetch and resets loading', async () => {
        mockGetChatModels.mockResolvedValueOnce([{ name: 'gpt-4o', label: 'GPT-4o' }]).mockResolvedValueOnce([
            { name: 'gpt-4o', label: 'GPT-4o' },
            { name: 'claude-3', label: 'Claude 3' }
        ])

        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'listModels' }))
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.options).toHaveLength(1)

        act(() => {
            result.current.refetch()
        })

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(mockGetChatModels).toHaveBeenCalledTimes(2)
        expect(result.current.options).toHaveLength(2)
    })

    it('unknown loadMethod: sets error state without throwing', async () => {
        const { result } = renderHook(() => useAsyncOptions({ loadMethod: 'nonExistentMethod' }))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toContain('nonExistentMethod')
        expect(result.current.options).toEqual([])
    })

    it('no loadMethod and no credentialNames: sets error state immediately', async () => {
        const { result } = renderHook(() => useAsyncOptions({}))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBeTruthy()
        expect(result.current.options).toEqual([])
    })
})
