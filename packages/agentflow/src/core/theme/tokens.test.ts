/**
 * Unit tests for design tokens
 */

import { tokens } from './tokens'

describe('Design Tokens', () => {
    describe('Node Colors', () => {
        it('should have all 15 node type colors defined', () => {
            const nodeTypes = [
                'condition',
                'start',
                'llm',
                'agent',
                'humanInput',
                'loop',
                'directReply',
                'customFunction',
                'tool',
                'retriever',
                'conditionAgent',
                'stickyNote',
                'http',
                'iteration',
                'executeFlow'
            ] as const

            nodeTypes.forEach((nodeType) => {
                expect(tokens.colors.nodes[nodeType]).toBeDefined()
                expect(tokens.colors.nodes[nodeType]).toMatch(/^#[0-9a-fA-F]{6}$/)
            })
        })

        it('should have unique colors for each node type', () => {
            const colors = Object.values(tokens.colors.nodes)
            const uniqueColors = new Set(colors)
            expect(uniqueColors.size).toBe(colors.length)
        })
    })

    describe('Background Colors', () => {
        it('should have light and dark variants for all backgrounds', () => {
            const backgrounds = ['canvas', 'palette', 'card', 'cardHover', 'header'] as const

            backgrounds.forEach((bg) => {
                expect(tokens.colors.background[bg].light).toBeDefined()
                expect(tokens.colors.background[bg].dark).toBeDefined()
                expect(tokens.colors.background[bg].light).toMatch(/^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$/)
                expect(tokens.colors.background[bg].dark).toMatch(/^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$/)
            })
        })

        it('should have different colors for light and dark modes', () => {
            Object.values(tokens.colors.background).forEach((bg) => {
                expect(bg.light).not.toBe(bg.dark)
            })
        })
    })

    describe('Border Colors', () => {
        it('should have default and hover variants for both modes', () => {
            expect(tokens.colors.border.default.light).toBeDefined()
            expect(tokens.colors.border.default.dark).toBeDefined()
            expect(tokens.colors.border.hover.light).toBeDefined()
            expect(tokens.colors.border.hover.dark).toBeDefined()
        })
    })

    describe('Text Colors', () => {
        it('should have primary, secondary, and tertiary text colors', () => {
            const textLevels = ['primary', 'secondary', 'tertiary'] as const

            textLevels.forEach((level) => {
                expect(tokens.colors.text[level].light).toBeDefined()
                expect(tokens.colors.text[level].dark).toBeDefined()
            })
        })
    })

    describe('Semantic Colors', () => {
        it('should have status colors defined', () => {
            const statuses = ['success', 'error', 'warning', 'info'] as const

            statuses.forEach((status) => {
                expect(tokens.colors.semantic[status]).toBeDefined()
                expect(tokens.colors.semantic[status]).toMatch(/^#[0-9a-fA-F]{6}$/)
            })
        })
    })

    describe('ReactFlow Colors', () => {
        it('should have minimap colors for both modes', () => {
            expect(tokens.colors.reactflow.minimap.node.light).toBeDefined()
            expect(tokens.colors.reactflow.minimap.node.dark).toBeDefined()
            expect(tokens.colors.reactflow.minimap.nodeStroke.light).toBeDefined()
            expect(tokens.colors.reactflow.minimap.nodeStroke.dark).toBeDefined()
            expect(tokens.colors.reactflow.minimap.background.light).toBeDefined()
            expect(tokens.colors.reactflow.minimap.background.dark).toBeDefined()
            expect(tokens.colors.reactflow.minimap.mask.light).toBeDefined()
            expect(tokens.colors.reactflow.minimap.mask.dark).toBeDefined()
        })

        it('should have background dots colors for both modes', () => {
            expect(tokens.colors.reactflow.background.dots.light).toBeDefined()
            expect(tokens.colors.reactflow.background.dots.dark).toBeDefined()
        })
    })

    describe('Spacing Scale', () => {
        it('should have consistent spacing scale', () => {
            const spacings = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const

            spacings.forEach((size) => {
                expect(tokens.spacing[size]).toBeDefined()
                expect(typeof tokens.spacing[size]).toBe('number')
                expect(tokens.spacing[size]).toBeGreaterThan(0)
            })
        })

        it('should have ascending spacing values', () => {
            expect(tokens.spacing.xs).toBeLessThan(tokens.spacing.sm)
            expect(tokens.spacing.sm).toBeLessThan(tokens.spacing.md)
            expect(tokens.spacing.md).toBeLessThan(tokens.spacing.lg)
            expect(tokens.spacing.lg).toBeLessThan(tokens.spacing.xl)
            expect(tokens.spacing.xl).toBeLessThan(tokens.spacing.xxl)
        })

        it('should follow 8px base unit (MUI standard)', () => {
            // All spacing values should be multiples of 4 (half of 8px base)
            Object.values(tokens.spacing).forEach((value) => {
                expect(value % 4).toBe(0)
            })
        })
    })

    describe('Shadows', () => {
        it('should have shadow definitions', () => {
            expect(tokens.shadows.card).toBeDefined()
            expect(tokens.shadows.toolbar.light).toBeDefined()
            expect(tokens.shadows.toolbar.dark).toBeDefined()
            expect(tokens.shadows.minimap).toBeDefined()
            expect(tokens.shadows.controls).toBeDefined()
            expect(tokens.shadows.stickyNote).toBeDefined()
        })

        it('should have different toolbar shadows for light and dark modes', () => {
            expect(tokens.shadows.toolbar.light).not.toBe(tokens.shadows.toolbar.dark)
        })
    })

    describe('Border Radius', () => {
        it('should have border radius scale', () => {
            expect(tokens.borderRadius.sm).toBe(4)
            expect(tokens.borderRadius.md).toBe(8)
            expect(tokens.borderRadius.lg).toBe(12)
            expect(tokens.borderRadius.round).toBe('50%')
        })
    })

    describe('Gradients', () => {
        it('should have gradient definitions', () => {
            expect(tokens.colors.gradients.generate.default).toBeDefined()
            expect(tokens.colors.gradients.generate.hover).toBeDefined()
            expect(tokens.colors.gradients.generate.default).toContain('linear-gradient')
            expect(tokens.colors.gradients.generate.hover).toContain('linear-gradient')
        })
    })
})
