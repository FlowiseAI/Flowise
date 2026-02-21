/**
 * Unit tests for MUI theme factory
 */

import { createAgentflowTheme } from './createAgentflowTheme'
import { tokens } from './tokens'

describe('createAgentflowTheme', () => {
    describe('Light Mode', () => {
        const theme = createAgentflowTheme(false)

        it('should create a theme object', () => {
            expect(theme).toBeDefined()
            expect(theme.palette).toBeDefined()
        })

        it('should set palette mode to light', () => {
            expect(theme.palette.mode).toBe('light')
        })

        it('should set correct background colors from tokens', () => {
            expect(theme.palette.background.default).toBe(tokens.colors.background.canvas.light)
            expect(theme.palette.background.paper).toBe(tokens.colors.background.card.light)
        })

        it('should set correct text colors from tokens', () => {
            expect(theme.palette.text.primary).toBe(tokens.colors.text.primary.light)
            expect(theme.palette.text.secondary).toBe(tokens.colors.text.secondary.light)
        })

        it('should set correct divider color from tokens', () => {
            expect(theme.palette.divider).toBe(tokens.colors.border.default.light)
        })

        it('should set primary color from agent node color', () => {
            expect(theme.palette.primary.main).toBe(tokens.colors.nodes.agent)
        })

        it('should set custom card palette color', () => {
            expect(theme.palette.card.main).toBe(tokens.colors.background.card.light)
        })

        it('should have correct spacing base unit', () => {
            expect(theme.spacing(1)).toBe('8px')
        })

        it('should set border radius from tokens', () => {
            expect(theme.shape.borderRadius).toBe(tokens.borderRadius.md)
        })
    })

    describe('Dark Mode', () => {
        const theme = createAgentflowTheme(true)

        it('should create a theme object', () => {
            expect(theme).toBeDefined()
            expect(theme.palette).toBeDefined()
        })

        it('should set palette mode to dark', () => {
            expect(theme.palette.mode).toBe('dark')
        })

        it('should set correct background colors from tokens', () => {
            expect(theme.palette.background.default).toBe(tokens.colors.background.canvas.dark)
            expect(theme.palette.background.paper).toBe(tokens.colors.background.card.dark)
        })

        it('should set correct text colors from tokens', () => {
            expect(theme.palette.text.primary).toBe(tokens.colors.text.primary.dark)
            expect(theme.palette.text.secondary).toBe(tokens.colors.text.secondary.dark)
        })

        it('should set correct divider color from tokens', () => {
            expect(theme.palette.divider).toBe(tokens.colors.border.default.dark)
        })

        it('should set custom card palette color', () => {
            expect(theme.palette.card.main).toBe(tokens.colors.background.card.dark)
        })
    })

    describe('Theme Consistency', () => {
        const lightTheme = createAgentflowTheme(false)
        const darkTheme = createAgentflowTheme(true)

        it('should have same primary color in both modes', () => {
            expect(lightTheme.palette.primary.main).toBe(darkTheme.palette.primary.main)
        })

        it('should have same spacing scale in both modes', () => {
            expect(lightTheme.spacing(1)).toBe(darkTheme.spacing(1))
            expect(lightTheme.spacing(2)).toBe(darkTheme.spacing(2))
        })

        it('should have same border radius in both modes', () => {
            expect(lightTheme.shape.borderRadius).toBe(darkTheme.shape.borderRadius)
        })

        it('should have different background colors between modes', () => {
            expect(lightTheme.palette.background.default).not.toBe(darkTheme.palette.background.default)
            expect(lightTheme.palette.background.paper).not.toBe(darkTheme.palette.background.paper)
        })

        it('should have different text colors between modes', () => {
            expect(lightTheme.palette.text.primary).not.toBe(darkTheme.palette.text.primary)
        })

        it('should have different divider colors between modes', () => {
            expect(lightTheme.palette.divider).not.toBe(darkTheme.palette.divider)
        })
    })

    describe('Custom Palette Extension', () => {
        const theme = createAgentflowTheme(false)

        it('should extend palette with card property', () => {
            expect(theme.palette.card).toBeDefined()
            expect(theme.palette.card.main).toBeDefined()
        })

        it('should be type-safe (no TypeScript errors)', () => {
            // This test validates that the type extension works
            // If there were type errors, the test file wouldn't compile
            const cardColor: string = theme.palette.card.main
            expect(cardColor).toBeTruthy()
        })
    })

    describe('Typography', () => {
        const theme = createAgentflowTheme(false)

        it('should set h4 to 1rem / 600 weight', () => {
            expect(theme.typography.h4.fontSize).toBe('1rem')
            expect(theme.typography.h4.fontWeight).toBe(600)
        })

        it('should set h5 to 0.875rem / 600 weight', () => {
            expect(theme.typography.h5.fontSize).toBe('0.875rem')
            expect(theme.typography.h5.fontWeight).toBe(600)
        })

        it('should set h6 to 0.75rem / 500 weight', () => {
            expect(theme.typography.h6.fontSize).toBe('0.75rem')
            expect(theme.typography.h6.fontWeight).toBe(500)
        })

        it('should have same typography in both modes', () => {
            const darkTheme = createAgentflowTheme(true)
            expect(theme.typography.h4).toEqual(darkTheme.typography.h4)
            expect(theme.typography.h5).toEqual(darkTheme.typography.h5)
            expect(theme.typography.h6).toEqual(darkTheme.typography.h6)
        })
    })

    describe('MUI Theme Integration', () => {
        const theme = createAgentflowTheme(false)

        it('should have MUI theme structure', () => {
            expect(theme.palette).toBeDefined()
            expect(theme.spacing).toBeDefined()
            expect(theme.shape).toBeDefined()
            expect(theme.typography).toBeDefined()
            expect(theme.breakpoints).toBeDefined()
        })

        it('should support MUI spacing function', () => {
            expect(theme.spacing(0)).toBe('0px')
            expect(theme.spacing(1)).toBe('8px')
            expect(theme.spacing(2)).toBe('16px')
            expect(theme.spacing(1.5)).toBe('12px')
        })

        it('should have valid palette colors', () => {
            expect(theme.palette.primary).toBeDefined()
            expect(theme.palette.primary.main).toBeDefined()
            expect(theme.palette.background).toBeDefined()
            expect(theme.palette.text).toBeDefined()
        })
    })
})
