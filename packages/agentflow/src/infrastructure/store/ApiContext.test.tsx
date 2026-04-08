import type { ReactNode } from 'react'

import { renderHook } from '@testing-library/react'

import type { RequestInterceptor } from '@/core/types'

import { ApiProvider, useApiContext } from './ApiContext'

jest.mock('../api', () => ({
    bindApiClient: jest.fn(() => 'mock-client'),
    bindNodesApi: jest.fn(() => ({ getAllNodes: jest.fn() })),
    bindChatflowsApi: jest.fn(() => ({ getAll: jest.fn() })),
    bindChatModelsApi: jest.fn(() => ({ getChatModels: jest.fn() })),
    bindToolsApi: jest.fn(() => ({ getAllTools: jest.fn() })),
    bindCredentialsApi: jest.fn(() => ({ getAllCredentials: jest.fn() })),
    bindStoresApi: jest.fn(() => ({ getStores: jest.fn(), getVectorStores: jest.fn() })),
    bindEmbeddingsApi: jest.fn(() => ({ getEmbeddings: jest.fn() }))
}))

const {
    bindApiClient,
    bindNodesApi,
    bindChatflowsApi,
    bindChatModelsApi,
    bindToolsApi,
    bindCredentialsApi,
    bindStoresApi,
    bindEmbeddingsApi
} = jest.requireMock('../api')

describe('ApiContext', () => {
    beforeEach(() => jest.clearAllMocks())

    describe('useApiContext', () => {
        it('should throw when used outside ApiProvider', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
            expect(() => renderHook(() => useApiContext())).toThrow('useApiContext must be used within AgentflowProvider')
            spy.mockRestore()
        })

        it('should provide api client and services', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000'>{children}</ApiProvider>
            )
            const { result } = renderHook(() => useApiContext(), { wrapper })

            expect(result.current.apiBaseUrl).toBe('http://localhost:3000')
            expect(result.current.client).toBe('mock-client')
            expect(result.current.nodesApi).toBeDefined()
            expect(result.current.chatflowsApi).toBeDefined()
            expect(result.current.chatModelsApi).toBeDefined()
            expect(result.current.toolsApi).toBeDefined()
            expect(result.current.credentialsApi).toBeDefined()
            expect(result.current.storesApi).toBeDefined()
            expect(result.current.embeddingsApi).toBeDefined()
            expect(bindApiClient).toHaveBeenCalledWith('http://localhost:3000', undefined, expect.any(Function))
        })

        it('should pass token to bindApiClient', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000' token='my-token'>
                    {children}
                </ApiProvider>
            )
            renderHook(() => useApiContext(), { wrapper })

            expect(bindApiClient).toHaveBeenCalledWith('http://localhost:3000', 'my-token', expect.any(Function))
        })

        it('should create nodesApi and chatflowsApi from client', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000'>{children}</ApiProvider>
            )
            renderHook(() => useApiContext(), { wrapper })

            expect(bindNodesApi).toHaveBeenCalledWith('mock-client')
            expect(bindChatflowsApi).toHaveBeenCalledWith('mock-client')
            expect(bindChatModelsApi).toHaveBeenCalledWith('mock-client')
            expect(bindToolsApi).toHaveBeenCalledWith('mock-client')
            expect(bindCredentialsApi).toHaveBeenCalledWith('mock-client')
            expect(bindStoresApi).toHaveBeenCalledWith('mock-client')
            expect(bindEmbeddingsApi).toHaveBeenCalledWith('mock-client')
        })

        it('should use updated requestInterceptor without recreating client', () => {
            const interceptorA = jest.fn((config) => ({ ...config, headers: { ...config.headers, 'X-A': '1' } }))
            const interceptorB = jest.fn((config) => ({ ...config, headers: { ...config.headers, 'X-B': '2' } }))

            let activeInterceptor: RequestInterceptor = interceptorA
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000' requestInterceptor={activeInterceptor}>
                    {children}
                </ApiProvider>
            )

            const { rerender } = renderHook(() => useApiContext(), { wrapper })

            // Capture the wrapper function passed to bindApiClient
            const wrapperFn = bindApiClient.mock.calls[0][2]
            expect(bindApiClient).toHaveBeenCalledTimes(1)

            // Re-render with a different interceptor but same apiBaseUrl/token
            activeInterceptor = interceptorB
            rerender()

            // Client should NOT be recreated
            expect(bindApiClient).toHaveBeenCalledTimes(1)

            // The wrapper should now delegate to interceptorB
            const config = { url: '/test', headers: {} }
            wrapperFn(config)
            expect(interceptorB).toHaveBeenCalledWith(config)
            expect(interceptorA).not.toHaveBeenCalled()
        })

        it('should memoize value across re-renders with same props', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000'>{children}</ApiProvider>
            )
            const { result, rerender } = renderHook(() => useApiContext(), { wrapper })
            const first = result.current
            rerender()

            expect(result.current).toBe(first)
            // Only created once despite re-render
            expect(bindApiClient).toHaveBeenCalledTimes(1)
        })
    })
})
