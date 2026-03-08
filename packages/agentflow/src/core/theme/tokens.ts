/**
 * Design Tokens for Agentflow
 *
 * Single source of truth for all design values (colors, spacing, shadows, etc.)
 * These tokens are used by both MUI theme and CSS variables.
 *
 * Architecture:
 * 1. Base colors - Primitive color values (single source of truth)
 * 2. Semantic colors - Referenced from base colors for consistency
 */

// Base primitive colors - define once, reference everywhere
const baseColors = {
    // Neutral colors
    white: '#fff',
    black: '#000',

    // Light mode grays
    gray50: '#fafafa',
    gray75: '#f5f5f5',
    gray100: '#f8f9fa',
    gray200: '#e2e2e2',
    gray300: '#e0e0e0',
    gray400: '#bdbdbd',
    gray500: '#9e9e9e',
    gray600: '#757575',
    gray700: '#666',
    gray800: '#333',

    // Dark mode grays
    darkGray100: '#1a1a1a',
    darkGray200: '#1a1a2e',
    darkGray300: '#252525',
    darkGray400: '#2d2d2d',
    darkGray500: '#404040',
    darkGray600: '#525252',
    darkGray700: '#555',
    darkGray800: '#aaa',

    // Status colors
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',

    // Node type colors (brand colors)
    nodeCondition: '#FFB938',
    nodeStart: '#7EE787',
    nodeLlm: '#64B5F6',
    nodeAgent: '#4DD0E1',
    nodeHumanInput: '#6E6EFD',
    nodeLoop: '#FFA07A',
    nodeDirectReply: '#4DDBBB',
    nodeCustomFunction: '#E4B7FF',
    nodeTool: '#d4a373',
    nodeRetriever: '#b8bedd',
    nodeConditionAgent: '#ff8fab',
    nodeStickyNote: '#fee440',
    nodeHttp: '#FF7F7F',
    nodeIteration: '#9C89B8',
    nodeExecuteFlow: '#a3b18a',

    // Gradient colors
    gradientOrange: '#FF6B6B',
    gradientRed: '#FF8E53'
} as const

export const tokens = {
    colors: {
        // Node type colors - referenced from base
        nodes: {
            condition: baseColors.nodeCondition,
            start: baseColors.nodeStart,
            llm: baseColors.nodeLlm,
            agent: baseColors.nodeAgent,
            humanInput: baseColors.nodeHumanInput,
            loop: baseColors.nodeLoop,
            directReply: baseColors.nodeDirectReply,
            customFunction: baseColors.nodeCustomFunction,
            tool: baseColors.nodeTool,
            retriever: baseColors.nodeRetriever,
            conditionAgent: baseColors.nodeConditionAgent,
            stickyNote: baseColors.nodeStickyNote,
            http: baseColors.nodeHttp,
            iteration: baseColors.nodeIteration,
            executeFlow: baseColors.nodeExecuteFlow
        },

        // Semantic UI colors - referenced from base
        background: {
            canvas: { light: baseColors.gray100, dark: baseColors.darkGray100 },
            palette: { light: baseColors.gray50, dark: baseColors.darkGray300 },
            card: { light: baseColors.white, dark: baseColors.darkGray400 },
            cardHover: { light: baseColors.gray75, dark: baseColors.darkGray500 },
            header: { light: baseColors.white, dark: baseColors.darkGray400 }
        },

        border: {
            default: { light: baseColors.gray300, dark: baseColors.darkGray500 },
            hover: { light: baseColors.gray400, dark: baseColors.darkGray600 }
        },

        text: {
            primary: { light: baseColors.gray800, dark: baseColors.white },
            secondary: { light: baseColors.gray700, dark: baseColors.gray500 },
            tertiary: { light: baseColors.gray600, dark: baseColors.gray500 }
        },

        // Semantic status colors - referenced from base
        semantic: {
            success: baseColors.success,
            error: baseColors.error,
            warning: baseColors.warning,
            info: baseColors.info
        },

        // ReactFlow specific colors - referenced from base
        reactflow: {
            minimap: {
                node: { light: baseColors.gray200, dark: baseColors.darkGray400 },
                nodeStroke: { light: baseColors.white, dark: baseColors.darkGray600 },
                background: { light: baseColors.white, dark: baseColors.darkGray200 },
                mask: { light: 'rgba(240, 240, 240, 0.6)', dark: 'rgba(45, 45, 45, 0.6)' }
            },
            background: {
                dots: { light: baseColors.darkGray800, dark: baseColors.darkGray700 }
            }
        },

        // Gradient definitions - referenced from base
        gradients: {
            generate: {
                default: `linear-gradient(45deg, ${baseColors.gradientOrange} 30%, ${baseColors.gradientRed} 90%)`,
                hover: `linear-gradient(45deg, ${baseColors.gradientRed} 30%, ${baseColors.gradientOrange} 90%)`
            }
        }
    },

    // Spacing scale (based on MUI's 8px base unit)
    spacing: {
        xs: 4, // 0.5 * 8px
        sm: 8, // 1 * 8px
        md: 12, // 1.5 * 8px
        lg: 16, // 2 * 8px
        xl: 20, // 2.5 * 8px
        xxl: 24 // 3 * 8px
    },

    // Shadow definitions
    shadows: {
        card: '0 2px 8px rgba(0, 0, 0, 0.1)',
        toolbar: {
            light: '0 2px 14px 0 rgb(32 40 45 / 8%)',
            dark: '0 2px 14px 0 rgb(0 0 0 / 20%)'
        },
        minimap: '0 2px 8px rgba(0, 0, 0, 0.1)',
        controls: '0 2px 8px rgba(0, 0, 0, 0.1)',
        stickyNote: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },

    // Border radius scale
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        round: '50%'
    }
} as const

export type Tokens = typeof tokens
