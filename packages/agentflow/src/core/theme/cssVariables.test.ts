/**
 * Unit tests for CSS variables generator
 */

import { generateCSSVariables } from './cssVariables'
import { tokens } from './tokens'

describe('generateCSSVariables', () => {
    describe('Light Mode', () => {
        let cssVars: string

        beforeEach(() => {
            cssVars = generateCSSVariables(false)
        })

        it('should generate CSS variable string', () => {
            expect(cssVars).toBeTruthy()
            expect(typeof cssVars).toBe('string')
        })

        it('should include all background color variables', () => {
            expect(cssVars).toContain('--agentflow-canvas-bg:')
            expect(cssVars).toContain('--agentflow-card-bg:')
            expect(cssVars).toContain('--agentflow-card-bg-hover:')
            expect(cssVars).toContain('--agentflow-palette-bg:')
            expect(cssVars).toContain('--agentflow-header-bg:')
        })

        it('should include border color variables', () => {
            expect(cssVars).toContain('--agentflow-border:')
            expect(cssVars).toContain('--agentflow-border-hover:')
        })

        it('should include text color variables', () => {
            expect(cssVars).toContain('--agentflow-text-primary:')
            expect(cssVars).toContain('--agentflow-text-secondary:')
            expect(cssVars).toContain('--agentflow-text-tertiary:')
        })

        it('should include semantic color variables', () => {
            expect(cssVars).toContain('--agentflow-success:')
            expect(cssVars).toContain('--agentflow-error:')
            expect(cssVars).toContain('--agentflow-warning:')
            expect(cssVars).toContain('--agentflow-info:')
        })

        it('should include spacing variables', () => {
            expect(cssVars).toContain('--agentflow-spacing-xs:')
            expect(cssVars).toContain('--agentflow-spacing-sm:')
            expect(cssVars).toContain('--agentflow-spacing-md:')
            expect(cssVars).toContain('--agentflow-spacing-lg:')
            expect(cssVars).toContain('--agentflow-spacing-xl:')
            expect(cssVars).toContain('--agentflow-spacing-xxl:')
        })

        it('should include shadow variables', () => {
            expect(cssVars).toContain('--agentflow-shadow-card:')
            expect(cssVars).toContain('--agentflow-shadow-toolbar:')
            expect(cssVars).toContain('--agentflow-shadow-minimap:')
            expect(cssVars).toContain('--agentflow-shadow-controls:')
        })

        it('should include border radius variables', () => {
            expect(cssVars).toContain('--agentflow-radius-sm:')
            expect(cssVars).toContain('--agentflow-radius-md:')
            expect(cssVars).toContain('--agentflow-radius-lg:')
        })

        it('should include ReactFlow-specific variables', () => {
            expect(cssVars).toContain('--agentflow-minimap-node:')
            expect(cssVars).toContain('--agentflow-minimap-node-stroke:')
            expect(cssVars).toContain('--agentflow-minimap-bg:')
            expect(cssVars).toContain('--agentflow-bg-dots:')
        })

        it('should use light mode colors', () => {
            expect(cssVars).toContain(tokens.colors.background.canvas.light)
            expect(cssVars).toContain(tokens.colors.text.primary.light)
        })

        it('should use light mode shadows', () => {
            expect(cssVars).toContain(tokens.shadows.toolbar.light)
        })
    })

    describe('Dark Mode', () => {
        let cssVars: string

        beforeEach(() => {
            cssVars = generateCSSVariables(true)
        })

        it('should generate CSS variable string for dark mode', () => {
            expect(cssVars).toBeTruthy()
            expect(typeof cssVars).toBe('string')
        })

        it('should use dark mode colors', () => {
            expect(cssVars).toContain(tokens.colors.background.canvas.dark)
            expect(cssVars).toContain(tokens.colors.text.primary.dark)
        })

        it('should use dark mode shadows', () => {
            expect(cssVars).toContain(tokens.shadows.toolbar.dark)
        })

        it('should have different values than light mode', () => {
            const lightVars = generateCSSVariables(false)
            const darkVars = generateCSSVariables(true)

            // Should have different background colors
            expect(lightVars).not.toBe(darkVars)
        })
    })

    describe('Variable Format', () => {
        it('should format spacing values with px suffix', () => {
            const cssVars = generateCSSVariables(false)

            expect(cssVars).toMatch(/--agentflow-spacing-xs: \d+px/)
            expect(cssVars).toMatch(/--agentflow-spacing-sm: \d+px/)
        })

        it('should format border radius values with px suffix', () => {
            const cssVars = generateCSSVariables(false)

            expect(cssVars).toMatch(/--agentflow-radius-sm: \d+px/)
            expect(cssVars).toMatch(/--agentflow-radius-md: \d+px/)
        })

        it('should not have leading/trailing whitespace', () => {
            const cssVars = generateCSSVariables(false)

            expect(cssVars).toBe(cssVars.trim())
        })

        it('should use consistent formatting', () => {
            const cssVars = generateCSSVariables(false)
            const lines = cssVars.split('\n')

            // Each line should follow the pattern: --variable-name: value;
            lines.forEach((line) => {
                if (line.trim() && !line.trim().startsWith('/*')) {
                    expect(line).toMatch(/^\s*--agentflow-[\w-]+:\s*[\w\s#(),./%-]+;?$/)
                }
            })
        })
    })

    describe('Consistency with Tokens', () => {
        it('should reference correct spacing values from tokens', () => {
            const cssVars = generateCSSVariables(false)

            Object.entries(tokens.spacing).forEach(([_key, value]) => {
                expect(cssVars).toContain(`${value}px`)
            })
        })

        it('should reference correct border radius values from tokens', () => {
            const cssVars = generateCSSVariables(false)

            expect(cssVars).toContain(`${tokens.borderRadius.sm}px`)
            expect(cssVars).toContain(`${tokens.borderRadius.md}px`)
            expect(cssVars).toContain(`${tokens.borderRadius.lg}px`)
        })

        it('should include semantic colors from tokens', () => {
            const cssVars = generateCSSVariables(false)

            expect(cssVars).toContain(tokens.colors.semantic.success)
            expect(cssVars).toContain(tokens.colors.semantic.error)
            expect(cssVars).toContain(tokens.colors.semantic.warning)
            expect(cssVars).toContain(tokens.colors.semantic.info)
        })
    })
})
