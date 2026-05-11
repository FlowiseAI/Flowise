/**
 * Design Tokens for Agentflow
 *
 * Single source of truth for all design values (colors, spacing, shadows, etc.)
 * These tokens are used by both MUI theme and CSS variables.
 *
 * Architecture:
 * 1. Base colors - Primitive color values (single source of truth)
 * 2. Semantic colors - Referenced from base colors for consistency
 *
 * Base palette and node type colors are duplicated in
 * packages/observe/src/core/theme/tokens.ts — keep in sync until
 * extracted to packages/shared-ui in FLOWISE-628. Agentflow extends
 * the shared base with ReactFlow + syntax highlight tokens, which stay here.
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
    lightBorderDefault: '#21212125',
    darkBorderDefault: 'rgba(255, 255, 255, 0.145)',
    darkGray100: '#1a1a1a',
    darkGray200: '#1a1a2e',
    darkGray300: '#252525',
    darkGray350: '#23262c',
    darkGray400: '#2d2d2d',
    darkGray450: '#32353b',
    darkGray460: '#454c59',
    darkGray500: '#404040',
    darkBlueHover: '#233345',
    darkGray600: '#525252',
    darkGray700: '#555',
    darkGray750: '#888',
    darkGray800: '#aaa',

    // Status colors
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    warningBg: '#fefcbf',
    warningText: '#744210',
    info: '#2196f3',

    // MUI palette colors - primary (blue)
    primaryLight: '#e3f2fd',
    primaryMain: '#2196f3',
    primaryDark: '#1e88e5',

    // MUI palette colors - secondary (purple)
    secondaryLight: '#ede7f6',
    secondaryMain: '#673ab7',
    secondaryDark: '#5e35b1',
    darkSecondaryLight: '#454c59',
    darkSecondaryMain: '#7c4dff',
    darkSecondaryDark: '#ffffff',

    // MUI palette colors - success (green)
    successLight: '#cdf5d8',
    successMain: '#00e676',
    successDark: '#00c853',

    // MUI palette colors - error (red)
    errorLight: '#f3d2d2',
    errorMain: '#f44336',
    errorDark: '#c62828',

    // MUI palette colors - warning (yellow)
    warningLight: '#fff8e1',
    warningMain: '#ffe57f',
    warningDark: '#ffc107',

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
    gradientRed: '#FF8E53',

    // CSS keyword 'orange' — used by V2 sync-nodes FAB; kept explicit so it tracks V2 exactly
    orange: '#ffa500'
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
            card: { light: baseColors.white, dark: baseColors.darkGray350 },
            cardHover: { light: baseColors.gray75, dark: baseColors.darkGray500 },
            header: { light: baseColors.white, dark: baseColors.darkGray400 },
            input: { light: baseColors.gray50, dark: baseColors.darkGray450 },
            optionHover: { light: '', dark: baseColors.darkBlueHover },
            listItemSelected: { light: '', dark: baseColors.darkGray460 }
        },

        border: {
            default: { light: baseColors.gray300, dark: baseColors.darkBorderDefault },
            hover: { light: baseColors.gray400, dark: baseColors.darkGray600 },
            input: { light: baseColors.lightBorderDefault, dark: baseColors.darkGray750 },
            validation: baseColors.nodeCondition
        },

        text: {
            primary: { light: baseColors.gray800, dark: baseColors.white },
            secondary: { light: baseColors.gray700, dark: baseColors.gray500 },
            tertiary: { light: baseColors.gray600, dark: baseColors.gray500 }
        },

        // MUI theme palette colors - referenced from base
        palette: {
            primary: {
                light: baseColors.primaryLight,
                main: baseColors.primaryMain,
                dark: baseColors.primaryDark
            },
            secondary: {
                light: { light: baseColors.secondaryLight, dark: baseColors.darkSecondaryLight },
                main: { light: baseColors.secondaryMain, dark: baseColors.darkSecondaryMain },
                dark: { light: baseColors.secondaryDark, dark: baseColors.darkSecondaryDark }
            },
            success: {
                light: baseColors.successLight,
                main: baseColors.successMain,
                dark: baseColors.successDark
            },
            error: {
                light: baseColors.errorLight,
                main: baseColors.errorMain,
                dark: baseColors.errorDark
            },
            warning: {
                light: baseColors.warningLight,
                main: baseColors.warningMain,
                dark: baseColors.warningDark
            }
        },

        // Semantic status colors - referenced from base
        semantic: {
            success: baseColors.success,
            error: baseColors.error,
            warning: baseColors.warning,
            warningBg: baseColors.warningBg,
            warningText: baseColors.warningText,
            info: baseColors.info,
            syncNodesFab: baseColors.orange
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

        // Syntax highlight colors for code blocks (TipTap/lowlight)
        syntaxHighlight: {
            background: { light: '#f5f5f5', dark: '#2d2d2d' },
            text: { light: '#333333', dark: '#d4d4d4' },
            comment: { light: '#6a9955', dark: '#6a9955' },
            variable: { light: '#d73a49', dark: '#9cdcfe' },
            number: { light: '#e36209', dark: '#b5cea8' },
            string: { light: '#22863a', dark: '#ce9178' },
            title: { light: '#6f42c1', dark: '#dcdcaa' },
            keyword: { light: '#005cc5', dark: '#569cd6' },
            operator: { light: '#333333', dark: '#d4d4d4' },
            punctuation: { light: '#333333', dark: '#d4d4d4' }
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

    // Typography
    typography: {
        // Font size scale
        fontSize: {
            xs: '0.625rem', // 10px — badge, compact caption
            sm: '0.75rem', // 12px — secondary label, helper text
            md: '0.875rem', // 14px — body, input, primary label
            lg: '1rem' // 16px — section heading
        },

        // Font weight scale
        fontWeight: {
            regular: 400,
            medium: 500,
            semibold: 600
        },

        /** Matches MUI OutlinedInput's default line-height (1.4375em) so the
         *  RichTextEditor aligns with standard TextField height at the same row count. */
        rowHeightRem: 1.4375,
        /** Single-line editor height — approximates MUI small input (38.4px) */
        singleLineHeightRem: 2.4,
        /** Tighter line-height for single-line mode to vertically center text */
        singleLineLineHeightEm: 0.875
    },

    // Border radius scale
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        round: '50%'
    },

    // Z-index scale for canvas overlay elements.
    // All values sit below the Canvas Kit modal overlay (30–50).
    zIndex: {
        canvasButton: 10, // FABs and button containers
        canvasPanel: 20, // Open panels/poppers anchored to buttons
        // ReactFlow renders group/parent nodes at an elevated stacking context; edges drawn
        // between children inside an iteration group must exceed that context to stay visible
        // above the group body. 9999 is the conventional ReactFlow ceiling for this use case.
        iterationEdge: 9999
    }
} as const

export type Tokens = typeof tokens
