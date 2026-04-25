import React from 'react'

import { renderHook } from '@testing-library/react'

import { ObserveProvider, useObserveApi, useObserveConfig } from './ObserveContext'

jest.mock('axios')

const wrapper = (isDarkMode?: boolean) => {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <ObserveProvider apiBaseUrl='http://localhost:3000' token='test-token' isDarkMode={isDarkMode}>
                {children}
            </ObserveProvider>
        )
    }
    return Wrapper
}

describe('ObserveContext', () => {
    describe('useObserveApi', () => {
        it('provides an executions API with all four methods', () => {
            const { result } = renderHook(() => useObserveApi(), { wrapper: wrapper() })
            const { executions } = result.current
            expect(typeof executions.getAllExecutions).toBe('function')
            expect(typeof executions.getExecutionById).toBe('function')
            expect(typeof executions.deleteExecutions).toBe('function')
            expect(typeof executions.updateExecution).toBe('function')
        })

        it('throws when called outside ObserveProvider', () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            expect(() => renderHook(() => useObserveApi())).toThrow('useObserveApi must be used inside ObserveProvider')
            consoleError.mockRestore()
        })
    })

    describe('useObserveConfig', () => {
        it('returns isDarkMode: false by default', () => {
            const { result } = renderHook(() => useObserveConfig(), { wrapper: wrapper() })
            expect(result.current.isDarkMode).toBe(false)
        })

        it('returns isDarkMode: true when prop is true', () => {
            const { result } = renderHook(() => useObserveConfig(), { wrapper: wrapper(true) })
            expect(result.current.isDarkMode).toBe(true)
        })
    })
})
