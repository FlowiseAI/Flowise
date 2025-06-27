// constant
import {
    IconLibrary,
    IconTools,
    IconFunctionFilled,
    IconMessageCircleFilled,
    IconRobot,
    IconArrowsSplit,
    IconPlayerPlayFilled,
    IconSparkles,
    IconReplaceUser,
    IconRepeat,
    IconSubtask,
    IconNote,
    IconWorld,
    IconRelationOneToManyFilled,
    IconVectorBezier2
} from '@tabler/icons-react'

export const gridSpacing = 3
export const drawerWidth = 260
export const appDrawerWidth = 320
export const headerHeight = 80
export const maxScroll = 100000

export let baseURL =
    typeof window !== 'undefined'
        ? process.env.PROD === true
            ? window.location.origin
            : window.location.origin.replace(`:${process.env.VITE_PORT ?? '8080'}`, ':4000')
        : process.env.BASE_URL || 'http://localhost:4000'

if (typeof sessionStorage !== 'undefined') {
    baseURL = sessionStorage.getItem('baseURL') || baseURL
}
export const setBaseURL = (url) => {
    // Check for CHATFLOW_DOMAIN_OVERRIDE
    if (typeof process !== 'undefined' && process.env && process.env.CHATFLOW_DOMAIN_OVERRIDE) {
        baseURL = process.env.CHATFLOW_DOMAIN_OVERRIDE
    } else if (typeof window !== 'undefined' && window.CHATFLOW_DOMAIN_OVERRIDE) {
        baseURL = window.CHATFLOW_DOMAIN_OVERRIDE
    } else {
        baseURL = url?.replace('8080', '4000')
    }
    sessionStorage.setItem('baseURL', baseURL)
}
export const uiBaseURL = typeof window !== 'undefined' ? `${window?.location?.origin}/sidekick-studio` : undefined
export const FLOWISE_CREDENTIAL_ID = 'FLOWISE_CREDENTIAL_ID'
export const REDACTED_CREDENTIAL_VALUE = '_FLOWISE_BLANK_07167752-1a71-43b1-bf8f-4f32252165db'
export const AGENTFLOW_ICONS = [
    {
        name: 'conditionAgentflow',
        icon: IconArrowsSplit,
        color: '#FFB938'
    },
    {
        name: 'startAgentflow',
        icon: IconPlayerPlayFilled,
        color: '#7EE787'
    },
    {
        name: 'llmAgentflow',
        icon: IconSparkles,
        color: '#64B5F6'
    },
    {
        name: 'agentAgentflow',
        icon: IconRobot,
        color: '#4DD0E1'
    },
    {
        name: 'humanInputAgentflow',
        icon: IconReplaceUser,
        color: '#6E6EFD'
    },
    {
        name: 'loopAgentflow',
        icon: IconRepeat,
        color: '#FFA07A'
    },
    {
        name: 'directReplyAgentflow',
        icon: IconMessageCircleFilled,
        color: '#4DDBBB'
    },
    {
        name: 'customFunctionAgentflow',
        icon: IconFunctionFilled,
        color: '#E4B7FF'
    },
    {
        name: 'toolAgentflow',
        icon: IconTools,
        color: '#d4a373'
    },
    {
        name: 'retrieverAgentflow',
        icon: IconLibrary,
        color: '#b8bedd'
    },
    {
        name: 'conditionAgentAgentflow',
        icon: IconSubtask,
        color: '#ff8fab'
    },
    {
        name: 'stickyNoteAgentflow',
        icon: IconNote,
        color: '#fee440'
    },
    {
        name: 'httpAgentflow',
        icon: IconWorld,
        color: '#FF7F7F'
    },
    {
        name: 'iterationAgentflow',
        icon: IconRelationOneToManyFilled,
        color: '#9C89B8'
    },
    {
        name: 'executeFlowAgentflow',
        icon: IconVectorBezier2,
        color: '#a3b18a'
    }
]
