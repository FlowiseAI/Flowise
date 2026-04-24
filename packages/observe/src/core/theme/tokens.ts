/**
 * Design Tokens for @flowiseai/observe
 * Shared with @flowiseai/agentflow — kept in sync manually until a @flowiseai/core package is introduced.
 */

const baseColors = {
    white: '#fff',
    black: '#000',
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
    darkGray100: '#1a1a1a',
    darkGray200: '#1a1a2e',
    darkGray300: '#252525',
    darkGray400: '#2d2d2d',
    darkGray500: '#404040',
    darkGray600: '#525252',
    darkGray700: '#555',
    darkGray800: '#aaa',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    warningBg: '#fefcbf',
    warningText: '#744210',
    info: '#2196f3',
    primaryLight: '#e3f2fd',
    primaryMain: '#2196f3',
    primaryDark: '#1e88e5',
    secondaryLight: '#ede7f6',
    secondaryMain: '#673ab7',
    secondaryDark: '#5e35b1',
    successLight: '#cdf5d8',
    successMain: '#00e676',
    successDark: '#00c853',
    errorLight: '#f3d2d2',
    errorMain: '#f44336',
    errorDark: '#c62828',
    warningLight: '#fff8e1',
    warningMain: '#ffe57f',
    warningDark: '#ffc107',
    // Node type colors — used in execution tree status indicators
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
    nodeExecuteFlow: '#a3b18a'
} as const

export const tokens = {
    colors: {
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
        background: {
            canvas: { light: baseColors.gray100, dark: baseColors.darkGray100 },
            card: { light: baseColors.white, dark: baseColors.darkGray400 },
            cardHover: { light: baseColors.gray75, dark: baseColors.darkGray500 },
            sidebar: { light: baseColors.gray50, dark: baseColors.darkGray300 }
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
        palette: {
            primary: { light: baseColors.primaryLight, main: baseColors.primaryMain, dark: baseColors.primaryDark },
            secondary: { light: baseColors.secondaryLight, main: baseColors.secondaryMain, dark: baseColors.secondaryDark },
            success: { light: baseColors.successLight, main: baseColors.successMain, dark: baseColors.successDark },
            error: { light: baseColors.errorLight, main: baseColors.errorMain, dark: baseColors.errorDark },
            warning: { light: baseColors.warningLight, main: baseColors.warningMain, dark: baseColors.warningDark }
        },
        semantic: {
            success: baseColors.success,
            error: baseColors.error,
            warning: baseColors.warning,
            warningBg: baseColors.warningBg,
            warningText: baseColors.warningText,
            info: baseColors.info
        }
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
    shadows: {
        card: '0 2px 8px rgba(0, 0, 0, 0.1)',
        toolbar: {
            light: '0 2px 14px 0 rgb(32 40 45 / 8%)',
            dark: '0 2px 14px 0 rgb(0 0 0 / 20%)'
        }
    },
    borderRadius: { sm: 4, md: 8, lg: 12, round: '50%' }
} as const

export type Tokens = typeof tokens
