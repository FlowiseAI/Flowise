import type { ReactNode } from 'react'

import { renderHook } from '@testing-library/react'

import type { RequestInterceptor } from '@/core/types'

import { ApiProvider, useApiContext } from './ApiContext'

jest.mock('../api', () => ({
    createApiClient: jest.fn(() => 'mock-client'),
    createNodesApi: jest.fn(() => ({ getAllNodes: jest.fn() })),
    createChatflowsApi: jest.fn(() => ({ getAll: jest.fn() }))
}))

const { createApiClient, createNodesApi, createChatflowsApi } = jest.requireMock('../api')

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
            expect(createApiClient).toHaveBeenCalledWith('http://localhost:3000', undefined, expect.any(Function))
        })

        it('should pass token to createApiClient', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000' token='my-token'>
                    {children}
                </ApiProvider>
            )
            renderHook(() => useApiContext(), { wrapper })

            expect(createApiClient).toHaveBeenCalledWith('http://localhost:3000', 'my-token', expect.any(Function))
        })

        it('should create nodesApi and chatflowsApi from client', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ApiProvider apiBaseUrl='http://localhost:3000'>{children}</ApiProvider>
            )
            renderHook(() => useApiContext(), { wrapper })

            expect(createNodesApi).toHaveBeenCalledWith('mock-client')
            expect(createChatflowsApi).toHaveBeenCalledWith('mock-client')
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

            // Capture the wrapper function passed to createApiClient
            const wrapperFn = createApiClient.mock.calls[0][2]
            expect(createApiClient).toHaveBeenCalledTimes(1)

            // Re-render with a different interceptor but same apiBaseUrl/token
            activeInterceptor = interceptorB
            rerender()

            // Client should NOT be recreated
            expect(createApiClient).toHaveBeenCalledTimes(1)

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
            expect(createApiClient).toHaveBeenCalledTimes(1)
        })
    })
})
