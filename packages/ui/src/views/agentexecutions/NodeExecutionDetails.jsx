import { useState } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import axios from 'axios'

// MUI
import {
    Typography,
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Card,
    CardMedia
} from '@mui/material'
import { useTheme, darken } from '@mui/material/styles'
import { useSnackbar } from 'notistack'
import { IconCoins, IconClock, IconChevronDown, IconDownload, IconTool } from '@tabler/icons-react'
import toolSVG from '@/assets/images/tool.svg'

// Project imports
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import { SafeHTML } from '@/ui-component/safe/SafeHTML'
import { AGENTFLOW_ICONS, baseURL } from '@/store/constant'
import { JSONViewer } from '@/ui-component/json/JsonViewer'
import ReactJson from 'flowise-react-json-view'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import SourceDocDialog from '@/ui-component/dialog/SourceDocDialog'

import predictionApi from '@/api/prediction'

export const NodeExecutionDetails = ({ data, label, status, metadata, isPublic, onProceedSuccess }) => {
    const [dataView, setDataView] = useState('rendered')
    const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [feedbackType, setFeedbackType] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState({})
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()
    const { enqueueSnackbar } = useSnackbar()

    // Function to get role-based colors
    const getRoleColors = (role) => {
        const isDarkMode = customization.isDarkMode

        switch (role) {
            case 'assistant':
            case 'ai':
                return {
                    bg: isDarkMode ? darken(theme.palette.success.dark, 0.5) : theme.palette.success.light,
                    color: isDarkMode ? 'white' : theme.palette.success.dark,
                    border: theme.palette.success.main
                }
            case 'system':
                return {
                    bg: isDarkMode ? darken(theme.palette.warning.dark, 0.5) : theme.palette.warning.light,
                    color: isDarkMode ? 'white' : theme.palette.warning.dark,
                    border: theme.palette.warning.main
                }
            case 'developer':
                return {
                    bg: isDarkMode ? darken(theme.palette.info.dark, 0.5) : theme.palette.info.light,
                    color: isDarkMode ? 'white' : theme.palette.info.dark,
                    border: theme.palette.info.main
                }
            case 'user':
            case 'human':
                return {
                    bg: isDarkMode ? darken(theme.palette.primary.main, 0.5) : theme.palette.primary.light,
                    color: isDarkMode ? 'white' : theme.palette.primary.dark,
                    border: theme.palette.primary.main
                }
            case 'tool':
            case 'function':
                return {
                    bg: isDarkMode ? darken(theme.palette.secondary.main, 0.5) : theme.palette.secondary.light,
                    color: isDarkMode ? 'white' : theme.palette.secondary.dark,
                    border: theme.palette.secondary.main
                }
            default:
                return {
                    bg: isDarkMode ? darken(theme.palette.grey[700], 0.5) : theme.palette.grey[300],
                    color: isDarkMode ? 'white' : theme.palette.grey[800],
                    border: isDarkMode ? theme.palette.grey[600] : theme.palette.grey[500]
                }
        }
    }

    const handleDataViewChange = (event, nextView) => {
        event.stopPropagation()
        if (nextView === null) return
        setDataView(nextView)
    }

    const onSubmitResponse = async (type, feedback = '') => {
        setIsLoading(true)
        setLoadingMessage(`Submitting feedback...`)
        const params = {
            question: feedback ? feedback : type.charAt(0).toUpperCase() + type.slice(1),
            chatId: metadata?.sessionId,
            humanInput: {
                type: type,
                startNodeId: data.id,
                feedback
            }
        }
        try {
            let response
            if (isPublic) {
                response = await predictionApi.sendMessageAndGetPredictionPublic(metadata?.agentflowId, params)
            } else {
                response = await predictionApi.sendMessageAndGetPrediction(metadata?.agentflowId, params)
            }
            if (response && response.data) {
                enqueueSnackbar('Successfully submitted response', { variant: 'success' })
                if (onProceedSuccess) onProceedSuccess(response.data)
            }
        } catch (error) {
            console.error(error)
            enqueueSnackbar(error?.message || 'Failed to submit response', { variant: 'error' })
        } finally {
            setIsLoading(false)
            setLoadingMessage('')
        }
    }

    const handleProceed = () => {
        if (data.input && data.input.humanInputEnableFeedback) {
            setFeedbackType('proceed')
            setOpenFeedbackDialog(true)
        } else {
            onSubmitResponse('proceed')
        }
    }

    const handleReject = () => {
        if (data.input && data.input.humanInputEnableFeedback) {
            setFeedbackType('reject')
            setOpenFeedbackDialog(true)
        } else {
            onSubmitResponse('reject')
        }
    }

    const onClipboardCopy = (e) => {
        const src = e.src
        if (Array.isArray(src) || typeof src === 'object') {
            navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
        } else {
            navigator.clipboard.writeText(src)
        }
    }

    const onUsedToolClick = (data, title) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    const handleSubmitFeedback = () => {
        onSubmitResponse(feedbackType, feedback)
        setOpenFeedbackDialog(false)
        setFeedback('')
        setFeedbackType('')
    }

    const downloadFile = async (fileAnnotation) => {
        try {
            const response = await axios.post(
                `${baseURL}/api/v1/openai-assistants-file/download`,
                { fileName: fileAnnotation.fileName, chatflowId: metadata?.agentflowId, chatId: metadata?.sessionId },
                { responseType: 'blob' }
            )
            const blob = new Blob([response.data], { type: response.headers['content-type'] })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = fileAnnotation.fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const renderFullfilledConditions = (conditions) => {
        const fullfilledConditions = conditions.filter((condition) => condition.isFulfilled)
        return fullfilledConditions.map((condition, index) => {
            if (condition.type === 'string' && condition.operation === 'equal' && condition.value1 === '' && condition.value2 === '') {
                return (
                    <Box
                        key={`else-${index}`}
                        sx={{
                            border: 1,
                            borderColor: 'success.main',
                            borderRadius: 1,
                            p: 2,
                            backgroundColor: theme.palette.background.default
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant='body1'>Else condition fulfilled</Typography>
                            <Chip
                                label={condition.isFulfilled ? 'Fulfilled' : 'Not Fulfilled'}
                                size='small'
                                sx={{ color: 'white', backgroundColor: theme.palette.success.dark }}
                                variant='filled'
                            />
                        </Box>
                    </Box>
                )
            }
            return (
                <Box
                    key={`condition-${index}`}
                    sx={{
                        border: 1,
                        borderColor: 'success.main',
                        borderRadius: 1,
                        p: 2,
                        backgroundColor: theme.palette.background.default
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant='subtitle2'>Condition {index}</Typography>
                        <Chip
                            label={condition.isFulfilled ? 'Fulfilled' : 'Not Fulfilled'}
                            size='small'
                            variant='filled'
                            sx={{ color: 'white', backgroundColor: theme.palette.success.dark }}
                        />
                    </Box>
                    <JSONViewer data={condition} />
                </Box>
            )
        })
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center'
                }}
            >
                <Box item style={{ width: 50 }}>
                    {(() => {
                        const nodeName = data?.name || data?.id?.split('_')[0]
                        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)

                        if (foundIcon) {
                            return (
                                <div
                                    style={{
                                        ...theme.typography.commonAvatar,
                                        ...theme.typography.mediumAvatar,
                                        borderRadius: '15px',
                                        backgroundColor: foundIcon.color,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        background: foundIcon.color,
                                        cursor: 'default'
                                    }}
                                >
                                    <foundIcon.icon size={20} color={'white'} />
                                </div>
                            )
                        } else {
                            return (
                                <div
                                    style={{
                                        ...theme.typography.commonAvatar,
                                        ...theme.typography.mediumAvatar,
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        cursor: 'default'
                                    }}
                                >
                                    <img
                                        style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                        src={`${baseURL}/api/v1/node-icon/${nodeName}`}
                                        alt={nodeName}
                                    />
                                </div>
                            )
                        }
                    })()}
                </Box>
                <Typography variant='h5' gutterBottom>
                    {label}
                </Typography>
                <div style={{ flex: 1 }}></div>
                {data.output && data.output.timeMetadata && data.output.timeMetadata.delta && (
                    <Chip
                        icon={<IconClock size={17} />}
                        label={`${(data.output.timeMetadata.delta / 1000).toFixed(2)} seconds`}
                        variant='contained'
                        color='secondary'
                        size='small'
                        sx={{ ml: 1, '& .MuiChip-icon': { mr: 0.2, ml: 1 } }}
                    />
                )}
                {data.output && data.output.usageMetadata && data.output.usageMetadata.total_tokens && (
                    <Chip
                        icon={<IconCoins size={17} />}
                        label={`${data.output.usageMetadata.total_tokens} tokens`}
                        variant='contained'
                        color='primary'
                        size='small'
                        sx={{ ml: 1, '& .MuiChip-icon': { mr: 0.2, ml: 1 } }}
                    />
                )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <ToggleButtonGroup
                    sx={{ borderRadius: 2, maxHeight: 40 }}
                    value={dataView}
                    color='primary'
                    exclusive
                    onChange={handleDataViewChange}
                >
                    <ToggleButton
                        sx={{
                            borderColor: theme.palette.grey[900] + 25,
                            borderRadius: 2,
                            color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                        }}
                        variant='contained'
                        value='rendered'
                        title='Rendered'
                    >
                        Rendered
                    </ToggleButton>
                    <ToggleButton
                        sx={{
                            borderColor: theme.palette.grey[900] + 25,
                            borderRadius: 2,
                            color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                        }}
                        variant='contained'
                        value='raw'
                        title='Raw'
                    >
                        Raw
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {dataView === 'rendered' && (
                <Box>
                    {data.output && data.output.availableTools && data.output.availableTools.length > 0 && (
                        <Box>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                                Tools
                            </Typography>
                            {data.output.availableTools.map((tool, index) => {
                                // Check if this tool is in the usedTools array
                                const isToolUsed =
                                    data.output.usedTools &&
                                    Array.isArray(data.output.usedTools) &&
                                    data.output.usedTools.some((usedTool) => usedTool.tool === tool.name)

                                return (
                                    <Accordion
                                        key={`tool-${index}`}
                                        sx={{
                                            mb: 1,
                                            '&:before': { display: 'none' },
                                            backgroundColor: isToolUsed
                                                ? theme?.customization?.isDarkMode
                                                    ? `${theme.palette.success.dark}22`
                                                    : `${theme.palette.success.light}44`
                                                : theme.palette.background.default,
                                            border: 1,
                                            borderRadius: 1,
                                            borderColor: isToolUsed ? 'success.main' : 'divider',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <AccordionSummary
                                            expandIcon={<IconChevronDown />}
                                            aria-controls={`tool-${index}-content`}
                                            id={`tool-${index}-header`}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                <div
                                                    style={{
                                                        ...theme.typography.commonAvatar,
                                                        ...theme.typography.smallAvatar,
                                                        marginRight: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'white',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <img
                                                        style={{ width: '100%', height: '100%', padding: 3, objectFit: 'contain' }}
                                                        src={(() => {
                                                            // Find matching tool from availableTools
                                                            if (
                                                                data.output &&
                                                                data.output.availableTools &&
                                                                Array.isArray(data.output.availableTools)
                                                            ) {
                                                                const matchingTool = data.output.availableTools.find(
                                                                    (t) => t.name === tool.name
                                                                )
                                                                if (matchingTool && matchingTool.toolNode && matchingTool.toolNode.name) {
                                                                    return `${baseURL}/api/v1/node-icon/${matchingTool.toolNode.name}`
                                                                }
                                                            }
                                                            return `${baseURL}/api/v1/node-icon/${tool.name}`
                                                        })()}
                                                        alt={tool.name}
                                                        onError={(e) => {
                                                            e.target.onerror = null
                                                            e.target.style.padding = '5px'
                                                            e.target.src = toolSVG
                                                        }}
                                                    />
                                                </div>
                                                <Typography variant='body1'>
                                                    {(() => {
                                                        // Find matching tool from availableTools if they exist
                                                        if (
                                                            data.output &&
                                                            data.output.availableTools &&
                                                            Array.isArray(data.output.availableTools)
                                                        ) {
                                                            const matchingTool = data.output.availableTools.find(
                                                                (t) => t.name === tool.name
                                                            )
                                                            if (matchingTool && matchingTool.toolNode) {
                                                                return matchingTool.toolNode.label || tool.name
                                                            }
                                                        }
                                                        return tool.name || 'Tool Call'
                                                    })()}
                                                </Typography>
                                                {isToolUsed && (
                                                    <Chip
                                                        label='Used'
                                                        size='small'
                                                        sx={{ ml: 2, color: 'white', backgroundColor: theme.palette.success.dark }}
                                                    />
                                                )}
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <JSONViewer data={tool} />
                                        </AccordionDetails>
                                    </Accordion>
                                )
                            })}
                        </Box>
                    )}
                    <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                        Input
                    </Typography>
                    {data && data.input && data.input.messages && Array.isArray(data.input.messages) && data.input.messages.length > 0 ? (
                        data.input.messages.map((message, index) => (
                            <Box
                                key={index}
                                sx={{
                                    mt: 1,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 1,
                                    pl: 2,
                                    pr: 2,
                                    backgroundColor: theme.palette.background.default
                                }}
                            >
                                <Chip
                                    sx={{
                                        mt: 1,
                                        backgroundColor: getRoleColors(message.role).bg,
                                        color: getRoleColors(message.role).color,
                                        borderColor: getRoleColors(message.role).border
                                    }}
                                    label={message.role}
                                    variant='outlined'
                                    size='small'
                                />
                                {message.name && (
                                    <Chip
                                        sx={{
                                            mt: 1,
                                            ml: 1,
                                            backgroundColor: getRoleColors(message.role).bg,
                                            color: getRoleColors(message.role).color,
                                            borderColor: getRoleColors(message.role).border
                                        }}
                                        label={message.name}
                                        variant='outlined'
                                        size='small'
                                    />
                                )}
                                {message.tool_calls &&
                                    (Array.isArray(message.tool_calls) ? (
                                        message.tool_calls.map((toolCall, idx) => (
                                            <Accordion
                                                key={`tool-call-${idx}`}
                                                sx={{
                                                    mt: 1,
                                                    mb: 1,
                                                    '&:before': { display: 'none' },
                                                    backgroundColor: theme?.customization?.isDarkMode
                                                        ? `${theme.palette.warning.dark}22`
                                                        : `${theme.palette.warning.light}44`,

                                                    border: 1,
                                                    borderRadius: 1,
                                                    borderColor: 'warning.main',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <AccordionSummary
                                                    expandIcon={
                                                        <IconChevronDown
                                                            color={
                                                                customization.isDarkMode ? 'white' : darken(theme.palette.warning.dark, 0.5)
                                                            }
                                                        />
                                                    }
                                                    aria-controls={`tool-call-${idx}-content`}
                                                    id={`tool-call-${idx}-header`}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <div
                                                            style={{
                                                                ...theme.typography.commonAvatar,
                                                                ...theme.typography.smallAvatar,
                                                                marginRight: 8,
                                                                borderRadius: '50%',
                                                                backgroundColor: 'white',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <img
                                                                style={{ width: '100%', height: '100%', padding: 3, objectFit: 'contain' }}
                                                                src={(() => {
                                                                    // Find matching tool from availableTools
                                                                    if (
                                                                        data.output &&
                                                                        data.output.availableTools &&
                                                                        Array.isArray(data.output.availableTools)
                                                                    ) {
                                                                        const matchingTool = data.output.availableTools.find(
                                                                            (t) => t.name === toolCall.name
                                                                        )
                                                                        if (
                                                                            matchingTool &&
                                                                            matchingTool.toolNode &&
                                                                            matchingTool.toolNode.name
                                                                        ) {
                                                                            return `${baseURL}/api/v1/node-icon/${matchingTool.toolNode.name}`
                                                                        }
                                                                    }
                                                                    return `${baseURL}/api/v1/node-icon/${toolCall.name}`
                                                                })()}
                                                                alt={toolCall.name}
                                                                onError={(e) => {
                                                                    e.target.onerror = null
                                                                    e.target.style.padding = '5px'
                                                                    e.target.src = toolSVG
                                                                }}
                                                            />
                                                        </div>
                                                        <Typography variant='body1'>
                                                            {(() => {
                                                                // Find matching tool from availableTools if they exist
                                                                if (
                                                                    data.output &&
                                                                    data.output.availableTools &&
                                                                    Array.isArray(data.output.availableTools)
                                                                ) {
                                                                    const matchingTool = data.output.availableTools.find(
                                                                        (t) => t.name === toolCall.name
                                                                    )
                                                                    if (matchingTool && matchingTool.toolNode) {
                                                                        return matchingTool.toolNode.label || toolCall.name
                                                                    }
                                                                }
                                                                return toolCall.name || 'Tool Call'
                                                            })()}
                                                        </Typography>
                                                        <Chip
                                                            label='Called'
                                                            size='small'
                                                            sx={{
                                                                ml: 2,
                                                                color: 'white',
                                                                backgroundColor: darken(theme.palette.warning.dark, 0.5)
                                                            }}
                                                        />
                                                    </Box>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <JSONViewer data={toolCall} />
                                                </AccordionDetails>
                                            </Accordion>
                                        ))
                                    ) : (
                                        <JSONViewer data={message.tool_calls} />
                                    ))}
                                {message.role === 'tool' && message.name && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1, py: 1 }}>
                                        <div
                                            style={{
                                                ...theme.typography.commonAvatar,
                                                ...theme.typography.smallAvatar,
                                                marginRight: 8,
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <img
                                                style={{ width: '100%', height: '100%', padding: 3, objectFit: 'contain' }}
                                                src={(() => {
                                                    // Find matching tool from availableTools
                                                    if (
                                                        data.output &&
                                                        data.output.availableTools &&
                                                        Array.isArray(data.output.availableTools)
                                                    ) {
                                                        const matchingTool = data.output.availableTools.find((t) => t.name === message.name)
                                                        if (matchingTool && matchingTool.toolNode && matchingTool.toolNode.name) {
                                                            return `${baseURL}/api/v1/node-icon/${matchingTool.toolNode.name}`
                                                        }
                                                    }
                                                    return `${baseURL}/api/v1/node-icon/${message.name}`
                                                })()}
                                                alt={message.name}
                                                onError={(e) => {
                                                    e.target.onerror = null
                                                    e.target.style.padding = '5px'
                                                    e.target.src = toolSVG
                                                }}
                                            />
                                        </div>
                                        <Typography variant='body1'>
                                            {(() => {
                                                // Find matching tool from availableTools
                                                if (
                                                    data.output &&
                                                    data.output.availableTools &&
                                                    Array.isArray(data.output.availableTools)
                                                ) {
                                                    const matchingTool = data.output.availableTools.find((t) => t.name === message.name)
                                                    if (matchingTool && matchingTool.toolNode) {
                                                        return matchingTool.toolNode.label || message.name
                                                    }
                                                }
                                                return message.name
                                            })()}
                                            {message.tool_call_id && (
                                                <Chip
                                                    label={message.tool_call_id}
                                                    size='small'
                                                    variant='outlined'
                                                    sx={{
                                                        ml: 1,
                                                        height: '20px',
                                                        color: 'info',
                                                        border: 1,
                                                        py: 1.5,
                                                        borderColor: customization.isDarkMode ? 'white' : 'divider'
                                                    }}
                                                />
                                            )}
                                        </Typography>
                                    </Box>
                                )}
                                {message.additional_kwargs?.usedTools && message.additional_kwargs.usedTools.length > 0 && (
                                    <div
                                        style={{
                                            display: 'block',
                                            flexDirection: 'row',
                                            width: '100%',
                                            marginTop: '10px'
                                        }}
                                    >
                                        {message.additional_kwargs.usedTools.map((tool, index) => {
                                            return tool ? (
                                                <Chip
                                                    size='small'
                                                    key={index}
                                                    label={tool.tool}
                                                    sx={{
                                                        mr: 1,
                                                        mt: 1,
                                                        borderColor: tool.error ? 'error.main' : undefined,
                                                        color: tool.error ? 'error.main' : undefined
                                                    }}
                                                    variant='outlined'
                                                    icon={<IconTool size={15} color={tool.error ? theme.palette.error.main : undefined} />}
                                                    onClick={() => onUsedToolClick(tool, 'Used Tools')}
                                                />
                                            ) : null
                                        })}
                                    </div>
                                )}
                                {message.additional_kwargs?.artifacts && message.additional_kwargs.artifacts.length > 0 && (
                                    <Box sx={{ mt: 2, mb: 1 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {message.additional_kwargs.artifacts.map((artifact, artifactIndex) => {
                                                if (artifact.type === 'png' || artifact.type === 'jpeg') {
                                                    return (
                                                        <Card
                                                            key={`artifact-${artifactIndex}`}
                                                            sx={{
                                                                p: 0,
                                                                m: 0,
                                                                flex: '0 0 auto',
                                                                border: 1,
                                                                borderColor: 'divider',
                                                                borderRadius: 1,
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <CardMedia
                                                                component='img'
                                                                image={
                                                                    artifact.data.startsWith('FILE-STORAGE::')
                                                                        ? `${baseURL}/api/v1/get-upload-file?chatflowId=${
                                                                              metadata?.agentflowId
                                                                          }&chatId=${metadata?.sessionId}&fileName=${artifact.data.replace(
                                                                              'FILE-STORAGE::',
                                                                              ''
                                                                          )}`
                                                                        : artifact.data
                                                                }
                                                                sx={{ height: 'auto', maxHeight: '500px', objectFit: 'contain' }}
                                                                alt={`artifact-${artifactIndex}`}
                                                            />
                                                        </Card>
                                                    )
                                                } else if (artifact.type === 'html') {
                                                    return (
                                                        <Box
                                                            key={`artifact-${artifactIndex}`}
                                                            sx={{
                                                                mt: 1,
                                                                border: 1,
                                                                borderColor: 'divider',
                                                                borderRadius: 1,
                                                                p: 2,
                                                                backgroundColor: theme.palette.background.paper
                                                            }}
                                                        >
                                                            <SafeHTML html={artifact.data} />
                                                        </Box>
                                                    )
                                                } else {
                                                    return (
                                                        <Box
                                                            key={`artifact-${artifactIndex}`}
                                                            sx={{
                                                                mt: 1,
                                                                border: 1,
                                                                borderColor: 'divider',
                                                                borderRadius: 1,
                                                                p: 2,
                                                                backgroundColor: theme.palette.background.paper
                                                            }}
                                                        >
                                                            <MemoizedReactMarkdown>{artifact.data}</MemoizedReactMarkdown>
                                                        </Box>
                                                    )
                                                }
                                            })}
                                        </Box>
                                    </Box>
                                )}
                                {message.role === 'user' &&
                                    Array.isArray(message.content) &&
                                    message.content.length > 0 &&
                                    message.content.map((content, index) => {
                                        return (
                                            <Card
                                                key={`file-uploads-${index}`}
                                                sx={{
                                                    p: 0,
                                                    m: 0,
                                                    flex: '0 0 auto',
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    maxWidth: '100%',
                                                    mb: 2,
                                                    mt: 2
                                                }}
                                            >
                                                <CardMedia
                                                    component='img'
                                                    image={
                                                        content.type === 'stored-file'
                                                            ? `${baseURL}/api/v1/get-upload-file?chatflowId=${metadata?.agentflowId}&chatId=${metadata?.sessionId}&fileName=${content.name}`
                                                            : content.name
                                                    }
                                                    onError={(e) => {
                                                        e.target.onerror = null
                                                        e.target.style.padding = '5px'
                                                        e.target.src = toolSVG
                                                    }}
                                                    sx={{
                                                        height: 'auto',
                                                        maxHeight: '500px',
                                                        width: '100%',
                                                        objectFit: 'contain',
                                                        display: 'block'
                                                    }}
                                                    alt={`file-uploads-${index}`}
                                                />
                                            </Card>
                                        )
                                    })}
                                {(() => {
                                    // Check if the content is a stringified JSON or array
                                    if (message.content) {
                                        try {
                                            // Try to parse as JSON
                                            const parsedContent = JSON.parse(message.content)
                                            // If it parses successfully, it's JSON - use JSONViewer
                                            return (
                                                <div style={{ marginTop: 10, marginBottom: 10 }}>
                                                    <JSONViewer data={parsedContent} />
                                                </div>
                                            )
                                        } catch (e) {
                                            // Not valid JSON, render as markdown
                                            return <MemoizedReactMarkdown>{message.content}</MemoizedReactMarkdown>
                                        }
                                    } else {
                                        return <MemoizedReactMarkdown>{`*No data*`}</MemoizedReactMarkdown>
                                    }
                                })()}
                                {message.additional_kwargs?.fileAnnotations && message.additional_kwargs.fileAnnotations.length > 0 && (
                                    <div
                                        style={{
                                            display: 'block',
                                            flexDirection: 'row',
                                            width: '100%',
                                            marginTop: '16px',
                                            marginBottom: '8px'
                                        }}
                                    >
                                        {message.additional_kwargs.fileAnnotations.map((fileAnnotation, index) => {
                                            return (
                                                <Button
                                                    sx={{
                                                        fontSize: '0.85rem',
                                                        textTransform: 'none',
                                                        mb: 1,
                                                        mr: 1
                                                    }}
                                                    key={index}
                                                    variant='outlined'
                                                    onClick={() => downloadFile(fileAnnotation)}
                                                    endIcon={<IconDownload color={theme.palette.primary.main} />}
                                                >
                                                    {fileAnnotation.fileName}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                )}
                            </Box>
                        ))
                    ) : data?.input?.form || data?.input?.http || data?.input?.conditions ? (
                        <JSONViewer data={data.input.form || data.input.http || data.input.conditions} />
                    ) : data?.input?.code ? (
                        <Box
                            sx={{
                                mt: 1,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                backgroundColor: theme.palette.background.default
                            }}
                        >
                            <CodeEditor
                                disabled={true}
                                value={data.input.code}
                                height={'max-content'}
                                theme={customization.isDarkMode ? 'dark' : 'light'}
                                lang={'js'}
                                basicSetup={{
                                    lineNumbers: false,
                                    foldGutter: false,
                                    autocompletion: false,
                                    highlightActiveLine: false
                                }}
                            />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                mt: 1,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 1,
                                pl: 2,
                                pr: 2,
                                backgroundColor: theme.palette.background.default
                            }}
                        >
                            <MemoizedReactMarkdown>{data?.input?.question || `*No data*`}</MemoizedReactMarkdown>
                        </Box>
                    )}
                    <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                        Output
                    </Typography>
                    {data?.output?.form || data?.output?.http ? (
                        <JSONViewer data={data.output.form || data.output.http} />
                    ) : data?.output?.conditions ? (
                        renderFullfilledConditions(data.output.conditions)
                    ) : (
                        <Box
                            sx={{
                                mt: 1,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 1,
                                pl: 2,
                                pr: 2,
                                backgroundColor: theme.palette.background.default
                            }}
                        >
                            {data.output?.usedTools && data.output.usedTools.length > 0 && (
                                <div
                                    style={{
                                        display: 'block',
                                        flexDirection: 'row',
                                        width: '100%'
                                    }}
                                >
                                    {data.output.usedTools.map((tool, index) => {
                                        return tool ? (
                                            <Chip
                                                size='small'
                                                key={index}
                                                label={tool.tool}
                                                sx={{
                                                    mr: 1,
                                                    mt: 1,
                                                    borderColor: tool.error ? 'error.main' : undefined,
                                                    color: tool.error ? 'error.main' : undefined
                                                }}
                                                variant='outlined'
                                                icon={<IconTool size={15} color={tool.error ? theme.palette.error.main : undefined} />}
                                                onClick={() => onUsedToolClick(tool, 'Used Tools')}
                                            />
                                        ) : null
                                    })}
                                </div>
                            )}
                            {data.output?.artifacts && data.output.artifacts.length > 0 && (
                                <Box sx={{ mt: 2, mb: 1 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {data.output.artifacts.map((artifact, artifactIndex) => {
                                            if (artifact.type === 'png' || artifact.type === 'jpeg' || artifact.type === 'jpg') {
                                                return (
                                                    <Card
                                                        key={`artifact-${artifactIndex}`}
                                                        sx={{
                                                            p: 0,
                                                            m: 0,
                                                            flex: '0 0 auto',
                                                            border: 1,
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <CardMedia
                                                            component='img'
                                                            image={
                                                                artifact.data.startsWith('FILE-STORAGE::')
                                                                    ? `${baseURL}/api/v1/get-upload-file?chatflowId=${
                                                                          metadata?.agentflowId
                                                                      }&chatId=${metadata?.sessionId}&fileName=${artifact.data.replace(
                                                                          'FILE-STORAGE::',
                                                                          ''
                                                                      )}`
                                                                    : artifact.data
                                                            }
                                                            sx={{ height: 'auto', maxHeight: '500px', objectFit: 'contain' }}
                                                            alt={`artifact-${artifactIndex}`}
                                                        />
                                                    </Card>
                                                )
                                            } else if (artifact.type === 'html') {
                                                return (
                                                    <Box
                                                        key={`artifact-${artifactIndex}`}
                                                        sx={{
                                                            mt: 1,
                                                            border: 1,
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            p: 2,
                                                            backgroundColor: theme.palette.background.paper
                                                        }}
                                                    >
                                                        <SafeHTML html={artifact.data} />
                                                    </Box>
                                                )
                                            } else {
                                                return (
                                                    <Box
                                                        key={`artifact-${artifactIndex}`}
                                                        sx={{
                                                            mt: 1,
                                                            border: 1,
                                                            borderColor: 'divider',
                                                            borderRadius: 1,
                                                            p: 2,
                                                            backgroundColor: theme.palette.background.paper
                                                        }}
                                                    >
                                                        <MemoizedReactMarkdown>{artifact.data}</MemoizedReactMarkdown>
                                                    </Box>
                                                )
                                            }
                                        })}
                                    </Box>
                                </Box>
                            )}
                            {(() => {
                                // Check if the content is a stringified JSON or array
                                if (data?.output?.content) {
                                    try {
                                        // Try to parse as JSON
                                        const parsedContent = JSON.parse(data.output.content)
                                        // If it parses successfully, it's JSON - use JSONViewer
                                        return (
                                            <div style={{ marginTop: 10, marginBottom: 10 }}>
                                                <JSONViewer data={parsedContent} />
                                            </div>
                                        )
                                    } catch (e) {
                                        // Not valid JSON, render as markdown
                                        return <MemoizedReactMarkdown>{data?.output?.content || `*No data*`}</MemoizedReactMarkdown>
                                    }
                                } else {
                                    return <MemoizedReactMarkdown>{`*No data*`}</MemoizedReactMarkdown>
                                }
                            })()}
                            {data.output?.fileAnnotations && data.output.fileAnnotations.length > 0 && (
                                <div
                                    style={{
                                        display: 'block',
                                        flexDirection: 'row',
                                        width: '100%',
                                        marginTop: '16px',
                                        marginBottom: '8px'
                                    }}
                                >
                                    {data.output.fileAnnotations.map((fileAnnotation, index) => {
                                        return (
                                            <Button
                                                sx={{
                                                    fontSize: '0.85rem',
                                                    textTransform: 'none',
                                                    mb: 1,
                                                    mr: 1
                                                }}
                                                key={index}
                                                variant='outlined'
                                                onClick={() => downloadFile(fileAnnotation)}
                                                endIcon={<IconDownload color={theme.palette.primary.main} />}
                                            >
                                                {fileAnnotation.fileName}
                                            </Button>
                                        )
                                    })}
                                </div>
                            )}
                        </Box>
                    )}
                    {data.error && (
                        <>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom color='error'>
                                Error
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    border: 1,
                                    borderColor: 'error.main',
                                    borderRadius: 1,
                                    p: 1,
                                    pl: 2,
                                    pr: 2,
                                    backgroundColor: theme.palette.background.default
                                }}
                            >
                                <MemoizedReactMarkdown>
                                    {typeof data?.error === 'object'
                                        ? JSON.stringify(data.error, null, 2)
                                        : data?.error || `*No error details*`}
                                </MemoizedReactMarkdown>
                            </Box>
                        </>
                    )}
                    {data.state && Object.keys(data.state).length > 0 && (
                        <>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                                State
                            </Typography>
                            <JSONViewer data={data.state} />
                        </>
                    )}
                </Box>
            )}
            {dataView === 'raw' && (
                <Box
                    sx={{
                        mt: 2,
                        border: 1,
                        borderColor: 'divider'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ReactJson
                        theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                        style={{ padding: 10, borderRadius: 10 }}
                        src={data}
                        name={null}
                        quotesOnKeys={false}
                        enableClipboard={(e) => onClipboardCopy(e)}
                        displayDataTypes={false}
                        collapsed={1}
                    />
                </Box>
            )}
            {status === 'STOPPED' && (
                <>
                    <Box
                        sx={{
                            position: 'fixed',
                            bottom: 15,
                            right: 25,
                            p: 1.5,
                            backgroundColor: theme.palette.background.paper,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            borderRadius: '25px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1,
                            zIndex: 1000
                        }}
                    >
                        <Button variant='outlined' color='error' sx={{ borderRadius: '25px' }} onClick={handleReject} disabled={isLoading}>
                            Reject
                        </Button>
                        <Button
                            variant='contained'
                            color='primary'
                            sx={{ borderRadius: '25px' }}
                            onClick={handleProceed}
                            disabled={isLoading}
                        >
                            Proceed
                        </Button>
                    </Box>

                    <Dialog maxWidth='md' fullWidth open={openFeedbackDialog} onClose={() => !isLoading && setOpenFeedbackDialog(false)}>
                        <DialogTitle variant='h5'>Provide Feedback</DialogTitle>
                        <DialogContent>
                            <TextField
                                //eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                margin='dense'
                                label='Feedback'
                                fullWidth
                                multiline
                                rows={4}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                disabled={isLoading}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenFeedbackDialog(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitFeedback} variant='contained' disabled={isLoading}>
                                Submit
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Loading Dialog */}
                    <Dialog
                        open={isLoading}
                        PaperProps={{
                            style: {
                                backgroundColor: theme.palette.background.paper,
                                boxShadow: theme.shadows[5],
                                borderRadius: 8,
                                padding: 20
                            }
                        }}
                    >
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                                <CircularProgress size={60} />
                                <Typography variant='h6' sx={{ mt: 2 }}>
                                    {loadingMessage}
                                </Typography>
                            </Box>
                        </DialogContent>
                    </Dialog>
                </>
            )}
            <SourceDocDialog show={sourceDialogOpen} dialogProps={sourceDialogProps} onCancel={() => setSourceDialogOpen(false)} />
        </Box>
    )
}

NodeExecutionDetails.propTypes = {
    data: PropTypes.object.isRequired,
    label: PropTypes.string,
    status: PropTypes.string,
    metadata: PropTypes.object,
    isPublic: PropTypes.bool,
    onProceedSuccess: PropTypes.func
}

NodeExecutionDetails.displayName = 'NodeExecutionDetails'
