import type { ReactNode } from 'react'

import { renderHook } from '@testing-library/react'

import { ConfigProvider, useConfigContext } from './ConfigContext'

describe('ConfigContext', () => {
    describe('useConfigContext', () => {
        it('should throw when used outside ConfigProvider', () => {
            // Suppress console.error from React for the expected error
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
            expect(() => renderHook(() => useConfigContext())).toThrow('useConfigContext must be used within AgentflowProvider')
            spy.mockRestore()
        })

        it('should return default values', () => {
            const wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider>{children}</ConfigProvider>
            const { result } = renderHook(() => useConfigContext(), { wrapper })

            expect(result.current.isDarkMode).toBe(false)
            expect(result.current.readOnly).toBe(false)
            expect(result.current.components).toBeUndefined()
        })

        it('should return custom isDarkMode and readOnly', () => {
            const wrapper = ({ children }: { children: ReactNode }) => (
                <ConfigProvider isDarkMode={true} readOnly={true}>
                    {children}
                </ConfigProvider>
            )
            const { result } = renderHook(() => useConfigContext(), { wrapper })

            expect(result.current.isDarkMode).toBe(true)
            expect(result.current.readOnly).toBe(true)
        })

        it('should pass through components array', () => {
            const components = ['llmAgentflow', 'toolAgentflow']
            const wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider components={components}>{children}</ConfigProvider>
            const { result } = renderHook(() => useConfigContext(), { wrapper })

            expect(result.current.components).toEqual(components)
        })
    })
})
