import { alpha, darken, lighten } from '@mui/material/styles'
import { renderHook } from '@testing-library/react'

import { useNodeColors } from './useNodeColors'

describe('useNodeColors', () => {
    describe('nodeColor', () => {
        it('should use provided nodeColor', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: '#ff0000', isDarkMode: false, isHovered: false }))
            expect(result.current.nodeColor).toBe('#ff0000')
        })

        it('should default to #666666 when nodeColor is undefined', () => {
            const { result } = renderHook(() => useNodeColors({ isDarkMode: false, isHovered: false }))
            expect(result.current.nodeColor).toBe('#666666')
        })
    })

    describe('stateColor', () => {
        const color = '#3366cc'

        it('should return full nodeColor when selected', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, selected: true, isDarkMode: false, isHovered: false }))
            expect(result.current.stateColor).toBe(color)
        })

        it('should return alpha 0.8 when hovered (not selected)', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, selected: false, isDarkMode: false, isHovered: true }))
            expect(result.current.stateColor).toBe(alpha(color, 0.8))
        })

        it('should return alpha 0.5 when neither selected nor hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, selected: false, isDarkMode: false, isHovered: false }))
            expect(result.current.stateColor).toBe(alpha(color, 0.5))
        })

        it('should prioritize selected over hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, selected: true, isDarkMode: false, isHovered: true }))
            expect(result.current.stateColor).toBe(color)
        })
    })

    describe('backgroundColor', () => {
        const color = '#3366cc'

        it('should darken by 0.7 in dark mode when hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, isDarkMode: true, isHovered: true }))
            expect(result.current.backgroundColor).toBe(darken(color, 0.7))
        })

        it('should darken by 0.8 in dark mode when not hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, isDarkMode: true, isHovered: false }))
            expect(result.current.backgroundColor).toBe(darken(color, 0.8))
        })

        it('should lighten by 0.8 in light mode when hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, isDarkMode: false, isHovered: true }))
            expect(result.current.backgroundColor).toBe(lighten(color, 0.8))
        })

        it('should lighten by 0.9 in light mode when not hovered', () => {
            const { result } = renderHook(() => useNodeColors({ nodeColor: color, isDarkMode: false, isHovered: false }))
            expect(result.current.backgroundColor).toBe(lighten(color, 0.9))
        })
    })
})
