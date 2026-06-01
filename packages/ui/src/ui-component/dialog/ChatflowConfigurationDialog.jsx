import PropTypes from 'prop-types'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { Box, Dialog, DialogContent, DialogTitle, Typography, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconX,
    IconShieldLock,
    IconWorldWww,
    IconUserPlus,
    IconMessageChatbot,
    IconArrowForwardUp,
    IconThumbUp,
    IconMicrophone,
    IconVolume,
    IconUpload,
    IconChartBar,
    IconCode,
    IconServer,
    IconAdjustments
} from '@tabler/icons-react'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Section components
import SpeechToText from '@/ui-component/extended/SpeechToText'
import TextToSpeech from '@/ui-component/extended/TextToSpeech'
import RateLimit from '@/ui-component/extended/RateLimit'
import AllowedDomains from '@/ui-component/extended/AllowedDomains'
import OverrideConfig from '@/ui-component/extended/OverrideConfig'
import ChatFeedback from '@/ui-component/extended/ChatFeedback'
import AnalyseFlow from '@/ui-component/extended/AnalyseFlow'
import StarterPrompts from '@/ui-component/extended/StarterPrompts'
import Leads from '@/ui-component/extended/Leads'
import FollowUpPrompts from '@/ui-component/extended/FollowUpPrompts'
import FileUpload from '@/ui-component/extended/FileUpload'
import PostProcessing from '@/ui-component/extended/PostProcessing'
import McpServer from '@/ui-component/extended/McpServer'

const CONFIGURATION_GROUPS = [
    {
        label: 'General',
        sections: [
            {
                label: 'Rate Limit',
                id: 'rateLimit',
                icon: IconShieldLock,
                description: 'Limit API requests per time window'
            },
            {
                label: 'Allowed Domains',
                id: 'allowedDomains',
                icon: IconWorldWww,
                description: 'Restrict chatbot to specific domains'
            },
            {
                label: 'Leads',
                id: 'leads',
                icon: IconUserPlus,
                description: 'Capture visitor contact information'
            }
        ]
    },
    {
        label: 'Chat',
        sections: [
            {
                label: 'Starter Prompts',
                id: 'conversationStarters',
                icon: IconMessageChatbot,
                description: 'Suggested prompts for new conversations'
            },
            {
                label: 'Follow-up Prompts',
                id: 'followUpPrompts',
                icon: IconArrowForwardUp,
                description: 'Auto-generate follow-up questions'
            },
            {
                label: 'Chat Feedback',
                id: 'chatFeedback',
                icon: IconThumbUp,
                description: 'Allow users to rate responses'
            }
        ]
    },
    {
        label: 'Media & Files',
        sections: [
            {
                label: 'Speech to Text',
                id: 'speechToText',
                icon: IconMicrophone,
                description: 'Voice input transcription'
            },
            {
                label: 'Text to Speech',
                id: 'textToSpeech',
                icon: IconVolume,
                description: 'Audio response playback'
            },
            {
                label: 'File Upload',
                id: 'fileUpload',
                icon: IconUpload,
                description: 'Allow file uploads in chat'
            }
        ]
    },
    {
        label: 'Advanced',
        sections: [
            {
                label: 'Analytics',
                id: 'analyseChatflow',
                icon: IconChartBar,
                description: 'Connect analytics providers'
            },
            {
                label: 'Post Processing',
                id: 'postProcessing',
                icon: IconCode,
                description: 'Custom JavaScript post-processing'
            },
            {
                label: 'MCP Server',
                id: 'mcpServer',
                icon: IconServer,
                description: 'Model Context Protocol server'
            },
            {
                label: 'Override Config',
                id: 'overrideConfig',
                icon: IconAdjustments,
                description: 'Override flow configuration via API'
            }
        ]
    }
]

function getSectionStatus(sectionId, chatflow) {
    if (!chatflow) return false

    let chatbotConfig = {}
    let apiConfig = {}
    try {
        chatbotConfig = chatflow.chatbotConfig ? JSON.parse(chatflow.chatbotConfig) : {}
        apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}
    } catch {
        return false
    }

    switch (sectionId) {
        case 'rateLimit':
            return apiConfig?.rateLimit?.status === true
        case 'allowedDomains':
            return Array.isArray(chatbotConfig?.allowedOrigins) && chatbotConfig.allowedOrigins.some((o) => o && o.trim() !== '')
        case 'leads':
            return chatbotConfig?.leads?.status === true
        case 'conversationStarters': {
            const sp = chatbotConfig?.starterPrompts
            if (!sp) return false
            return Object.values(sp).some((entry) => entry?.prompt && entry.prompt.trim() !== '')
        }
        case 'followUpPrompts':
            return chatbotConfig?.followUpPrompts?.status === true
        case 'chatFeedback':
            return chatbotConfig?.chatFeedback?.status === true
        case 'speechToText': {
            if (!chatflow.speechToText) return false
            try {
                const stt = JSON.parse(chatflow.speechToText)
                // "none" with status:true means disabled — ignore it
                return Object.entries(stt).some(([key, provider]) => key !== 'none' && provider?.status === true)
            } catch {
                return false
            }
        }
        case 'textToSpeech': {
            if (!chatflow.textToSpeech) return false
            try {
                const tts = JSON.parse(chatflow.textToSpeech)
                return Object.entries(tts).some(([key, provider]) => key !== 'none' && provider?.status === true)
            } catch {
                return false
            }
        }
        case 'fileUpload':
            return chatbotConfig?.fullFileUpload?.status === true
        case 'analyseChatflow': {
            if (!chatflow.analytic) return false
            try {
                const ap = JSON.parse(chatflow.analytic)
                return Object.values(ap).some((provider) => provider?.status === true)
            } catch {
                return false
            }
        }
        case 'postProcessing':
            return chatbotConfig?.postProcessing?.enabled === true
        case 'mcpServer': {
            if (!chatflow.mcpServerConfig) return false
            try {
                const mcp = typeof chatflow.mcpServerConfig === 'string' ? JSON.parse(chatflow.mcpServerConfig) : chatflow.mcpServerConfig
                return mcp?.enabled === true
            } catch {
                return false
            }
        }
        case 'overrideConfig':
            return apiConfig?.overrideConfig?.status === true
        default:
            return false
    }
}

// Flatten all sections for quick lookup
const ALL_SECTIONS = CONFIGURATION_GROUPS.flatMap((g) => g.sections)

const SIDEBAR_WIDTH = 220

const ChatflowConfigurationDialog = ({ show, isAgentCanvas, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const customization = useSelector((state) => state.customization)

    const [activeSection, setActiveSection] = useState('rateLimit')

    const isDark = theme.palette.mode === 'dark' || customization?.isDarkMode

    // Filter groups/sections based on agent canvas
    const filteredGroups = useMemo(() => {
        return CONFIGURATION_GROUPS.map((group) => ({
            ...group,
            sections: group.sections.filter((section) => !isAgentCanvas || !section.hideInAgentFlow)
        })).filter((group) => group.sections.length > 0)
    }, [isAgentCanvas])

    // Get all section IDs for validation
    const allSectionIds = useMemo(() => {
        return filteredGroups.flatMap((g) => g.sections.map((s) => s.id))
    }, [filteredGroups])

    // Reset activeSection if current one is filtered out
    const currentSection = allSectionIds.includes(activeSection) ? activeSection : allSectionIds[0] || 'rateLimit'
    const currentSectionData = ALL_SECTIONS.find((s) => s.id === currentSection)

    const renderContent = () => {
        const props = { dialogProps }
        switch (currentSection) {
            case 'rateLimit':
                return <RateLimit {...props} hideTitle />
            case 'allowedDomains':
                return <AllowedDomains {...props} hideTitle />
            case 'leads':
                return <Leads {...props} />
            case 'conversationStarters':
                return <StarterPrompts {...props} />
            case 'followUpPrompts':
                return <FollowUpPrompts {...props} />
            case 'chatFeedback':
                return <ChatFeedback {...props} />
            case 'speechToText':
                return <SpeechToText {...props} />
            case 'textToSpeech':
                return <TextToSpeech {...props} />
            case 'fileUpload':
                return <FileUpload {...props} />
            case 'analyseChatflow':
                return <AnalyseFlow {...props} />
            case 'postProcessing':
                return <PostProcessing {...props} />
            case 'mcpServer':
                return <McpServer {...props} />
            case 'overrideConfig':
                return <OverrideConfig {...props} hideTitle />
            default:
                return null
        }
    }

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: 960,
                    maxWidth: '95vw',
                    height: '82vh',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }
            }}
            aria-labelledby='chatflow-config-dialog-title'
        >
            {/* Header */}
            <DialogTitle
                id='chatflow-config-dialog-title'
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 2,
                    px: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    minHeight: 'auto',
                    bgcolor: isDark ? 'background.paper' : '#fff'
                }}
            >
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'text.primary' }}>{dialogProps.title}</Typography>
                <IconButton
                    size='small'
                    onClick={onCancel}
                    sx={{
                        color: 'text.secondary',
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                    }}
                >
                    <IconX size={18} />
                </IconButton>
            </DialogTitle>

            {/* Body: Sidebar + Content */}
            <DialogContent sx={{ display: 'flex', p: 0, overflow: 'hidden', flex: 1 }}>
                {/* Sidebar */}
                <Box
                    sx={{
                        width: SIDEBAR_WIDTH,
                        minWidth: SIDEBAR_WIDTH,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? 'rgba(0,0,0,0.15)' : theme.palette.grey[50],
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <PerfectScrollbar style={{ height: '100%', overflowX: 'hidden' }}>
                        <Box sx={{ py: 2, px: 1 }}>
                            {filteredGroups.map((group, groupIndex) => (
                                <Box key={group.label} sx={{ mb: 0.5 }}>
                                    {/* Group label */}
                                    <Typography
                                        sx={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: isDark ? 'grey.500' : 'grey.500',
                                            px: 1.5,
                                            pt: groupIndex > 0 ? 2 : 0.5,
                                            pb: 0.75
                                        }}
                                    >
                                        {group.label}
                                    </Typography>

                                    {/* Section items */}
                                    {group.sections.map((section) => {
                                        const isActive = currentSection === section.id
                                        const isEnabled = getSectionStatus(section.id, chatflow)
                                        const SectionIcon = section.icon

                                        return (
                                            <Box
                                                key={section.id}
                                                onClick={() => setActiveSection(section.id)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.25,
                                                    px: 1.5,
                                                    py: 0.875,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    color: isActive ? 'primary.main' : isDark ? 'grey.300' : 'grey.700',
                                                    bgcolor: isActive
                                                        ? isDark
                                                            ? 'rgba(33, 150, 243, 0.12)'
                                                            : 'rgba(33, 150, 243, 0.06)'
                                                        : 'transparent',
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': {
                                                        bgcolor: isActive
                                                            ? isDark
                                                                ? 'rgba(33, 150, 243, 0.16)'
                                                                : 'rgba(33, 150, 243, 0.08)'
                                                            : isDark
                                                            ? 'rgba(255,255,255,0.04)'
                                                            : 'rgba(0,0,0,0.03)'
                                                    },
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {/* Icon */}
                                                <SectionIcon
                                                    size={17}
                                                    stroke={1.5}
                                                    style={{
                                                        flexShrink: 0,
                                                        opacity: isActive ? 1 : 0.7
                                                    }}
                                                />

                                                {/* Label */}
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: isActive ? 600 : 400,
                                                        color: 'inherit',
                                                        lineHeight: 1.3,
                                                        flex: 1,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {section.label}
                                                </Typography>

                                                {/* Status badge - only show when enabled */}
                                                {isEnabled && (
                                                    <Box
                                                        sx={{
                                                            px: 0.875,
                                                            py: 0.125,
                                                            borderRadius: '4px',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 600,
                                                            lineHeight: 1.6,
                                                            letterSpacing: '0.02em',
                                                            flexShrink: 0,
                                                            bgcolor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                                                            color: isDark ? '#4ade80' : '#16a34a'
                                                        }}
                                                    >
                                                        ON
                                                    </Box>
                                                )}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            ))}
                        </Box>
                    </PerfectScrollbar>
                </Box>

                {/* Content area */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        bgcolor: isDark ? 'background.paper' : '#fff'
                    }}
                >
                    <PerfectScrollbar style={{ height: '100%' }}>
                        <Box sx={{ px: 3.5, py: 3 }}>
                            {/* Section header */}
                            <Box sx={{ mb: 2.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        mb: 0.25
                                    }}
                                >
                                    {currentSectionData?.label || ''}
                                </Typography>
                                {currentSectionData?.description && (
                                    <Typography
                                        sx={{
                                            fontSize: '0.8rem',
                                            color: 'text.secondary',
                                            lineHeight: 1.5,
                                            opacity: isDark ? 0.8 : 1
                                        }}
                                    >
                                        {currentSectionData.description}
                                    </Typography>
                                )}
                            </Box>

                            {/* Section content */}
                            {renderContent()}
                        </Box>
                    </PerfectScrollbar>
                </Box>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ChatflowConfigurationDialog.propTypes = {
    show: PropTypes.bool,
    isAgentCanvas: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default ChatflowConfigurationDialog
