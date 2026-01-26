import {
    IconPlayerPlay,
    IconPlayerStop,
    IconRobot,
    IconBrain,
    IconTool,
    IconGitBranch,
    IconUserQuestion,
    IconRepeat,
    IconNote,
    IconMessageCircleFilled,
    IconWorld,
    IconLibrary
} from '@tabler/icons-react'

// Agentflow icon colors and configurations
export const AGENTFLOW_ICONS = [
    { name: 'startAgentflow', color: '#4CAF50', icon: IconPlayerPlay },
    { name: 'endAgentflow', color: '#F44336', icon: IconPlayerStop },
    { name: 'agentAgentflow', color: '#2196F3', icon: IconRobot },
    { name: 'llmAgentflow', color: '#9C27B0', icon: IconBrain },
    { name: 'toolAgentflow', color: '#FF9800', icon: IconTool },
    { name: 'conditionAgentflow', color: '#FFC107', icon: IconGitBranch },
    { name: 'conditionAgentAgentflow', color: '#FFC107', icon: IconGitBranch },
    { name: 'humanInputAgentflow', color: '#00BCD4', icon: IconUserQuestion },
    { name: 'iterationAgentflow', color: '#795548', icon: IconRepeat },
    { name: 'stickyNoteAgentflow', color: '#FFD54F', icon: IconNote },
    { name: 'directReplyAgentflow', color: '#4DDBBB', icon: IconMessageCircleFilled },
    { name: 'httpAgentflow', color: '#FF7F7F', icon: IconWorld },
    { name: 'loopAgentflow', color: '#FFA07A', icon: IconRepeat },
    { name: 'retrieverAgentflow', color: '#b8bedd', icon: IconLibrary }
]

export const FLOWISE_CREDENTIAL_ID = 'credential'

// Base URL will be provided via AgentflowAPI
export const baseURL = ''
