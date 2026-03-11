import { useState } from 'react'
import axios from 'axios'
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
import { IconCoins, IconClock, IconChevronDown, IconDownload, IconTool } from '@tabler/icons-react'
import ReactJson from 'flowise-react-json-view'
import toolSVG from '../../assets/tool.svg'
import { MemoizedReactMarkdown } from '../../atoms/MemoizedReactMarkdown'
import { SafeHTML } from '../../atoms/SafeHTML'
import { JSONViewer } from '../../atoms/JSONViewer'
import { CodeEditor } from '../../atoms/CodeEditor'
import SourceDocDialog from '../../atoms/SourceDocDialog'
import { AGENTFLOW_ICONS } from '../../constants'
import { useConfigContext } from '../../infrastructure/store/ConfigContext'
import { useApiContext } from '../../infrastructure/store/ApiContext'
import type { ExecutionNodeData, ExecutionMetadata } from '../../types'

interface NodeExecutionDetailsProps {
    data: ExecutionNodeData
    label?: string
    status?: string
    metadata?: ExecutionMetadata
    isPublic?: boolean
    onProceedSuccess?: (data: unknown) => void
}

export const NodeExecutionDetails = ({ data, label, status, metadata, isPublic, onProceedSuccess }: NodeExecutionDetailsProps) => {
    const [dataView, setDataView] = useState('rendered')
    const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [feedbackType, setFeedbackType] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState<{ data?: Record<string, unknown>; title?: string }>({})
    const config = useConfigContext()
    const { predictionsApi, apiBaseUrl } = useApiContext()
    const theme = useTheme()
    const isDarkMode = config.isDarkMode ?? false
    const baseURL = apiBaseUrl

    const getRoleColors = (role: string) => {
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

    const handleDataViewChange = (_event: React.MouseEvent, nextView: string | null) => {
        if (nextView === null) return
        setDataView(nextView)
    }

    const onSubmitResponse = async (type: string, feedbackText = '') => {
        setIsLoading(true)
        setLoadingMessage(`Submitting feedback...`)
        const params = {
            question: feedbackText ? feedbackText : type.charAt(0).toUpperCase() + type.slice(1),
            chatId: metadata?.sessionId,
            humanInput: { type, startNodeId: data.id, feedback: feedbackText }
        }
        try {
            let response
            if (isPublic) {
                response = await predictionsApi.sendMessageAndGetPredictionPublic(metadata?.agentflowId ?? '', params)
            } else {
                response = await predictionsApi.sendMessageAndGetPrediction(metadata?.agentflowId ?? '', params)
            }
            if (response && response.data) {
                config.onNotification?.('Successfully submitted response', 'success')
                if (onProceedSuccess) onProceedSuccess(response.data)
            }
        } catch (error) {
            console.error(error)
            config.onNotification?.((error as Error)?.message || 'Failed to submit response', 'error')
        } finally {
            setIsLoading(false)
            setLoadingMessage('')
        }
    }

    const handleProceed = () => {
        const input = data.input as Record<string, unknown> | undefined
        if (input && input.humanInputEnableFeedback) {
            setFeedbackType('proceed')
            setOpenFeedbackDialog(true)
        } else {
            onSubmitResponse('proceed')
        }
    }

    const handleReject = () => {
        const input = data.input as Record<string, unknown> | undefined
        if (input && input.humanInputEnableFeedback) {
            setFeedbackType('reject')
            setOpenFeedbackDialog(true)
        } else {
            onSubmitResponse('reject')
        }
    }

    const onClipboardCopy = (e: { src: unknown }) => {
        const src = e.src
        if (Array.isArray(src) || typeof src === 'object') {
            navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
        } else {
            navigator.clipboard.writeText(String(src))
        }
    }

    const onUsedToolClick = (toolData: Record<string, unknown>, title: string) => {
        setSourceDialogProps({ data: toolData, title })
        setSourceDialogOpen(true)
    }

    const handleSubmitFeedback = () => {
        onSubmitResponse(feedbackType, feedback)
        setOpenFeedbackDialog(false)
        setFeedback('')
        setFeedbackType('')
    }

    const downloadFile = async (fileAnnotation: { fileName: string }) => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = data.input as Record<string, any> | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = data.output as Record<string, any> | undefined

    const renderFullfilledConditions = (
        conditions: { isFulfilled: boolean; type?: string; operation?: string; value1?: string; value2?: string }[]
    ) => {
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
                                label='Fulfilled'
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
                            label='Fulfilled'
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderToolIcon = (toolName: string, availableTools: any[]) => {
        if (availableTools && Array.isArray(availableTools)) {
            const matchingTool = availableTools.find((t: { name: string }) => t.name === toolName)
            if (matchingTool?.toolNode?.name) {
                return `${baseURL}/api/v1/node-icon/${matchingTool.toolNode.name}`
            }
        }
        return `${baseURL}/api/v1/node-icon/${toolName}`
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderToolLabel = (toolName: string, availableTools: any[]) => {
        if (availableTools && Array.isArray(availableTools)) {
            const matchingTool = availableTools.find((t: { name: string }) => t.name === toolName)
            if (matchingTool?.toolNode) {
                return matchingTool.toolNode.label || toolName
            }
        }
        return toolName || 'Tool Call'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderToolAvatar = (name: string, availableTools: any[]) => (
        <div
            style={{
                ...(((theme.typography as unknown as Record<string, unknown>).commonAvatar || {}) as Record<string, string>),
                ...(((theme.typography as unknown as Record<string, unknown>).smallAvatar || {}) as Record<string, string>),
                marginRight: 8,
                borderRadius: '50%',
                backgroundColor: 'white',
                overflow: 'hidden'
            }}
        >
            <img
                style={{ width: '100%', height: '100%', padding: 3, objectFit: 'contain' }}
                src={renderToolIcon(name, availableTools)}
                alt={name}
                onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.onerror = null
                    target.style.padding = '5px'
                    target.src = toolSVG
                }}
            />
        </div>
    )

    const renderFileImage = (src: string, alt: string) => (
        <Card sx={{ p: 0, m: 0, flex: '0 0 auto', border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <CardMedia component='img' image={src} sx={{ height: 'auto', maxHeight: '500px', objectFit: 'contain' }} alt={alt} />
        </Card>
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderArtifacts = (artifacts: any[]) => (
        <Box sx={{ mt: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {artifacts.map((artifact, artifactIndex) => {
                    if (artifact.type === 'png' || artifact.type === 'jpeg' || artifact.type === 'jpg') {
                        const imgSrc = artifact.data.startsWith('FILE-STORAGE::')
                            ? `${baseURL}/api/v1/get-upload-file?chatflowId=${metadata?.agentflowId}&chatId=${
                                  metadata?.sessionId
                              }&fileName=${artifact.data.replace('FILE-STORAGE::', '')}`
                            : artifact.data
                        return renderFileImage(imgSrc, `artifact-${artifactIndex}`)
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
    )

    const renderContentOrJson = (content: unknown) => {
        if (content) {
            try {
                const parsedContent = JSON.parse(content as string)
                return (
                    <div style={{ marginTop: 10, marginBottom: 10 }}>
                        <JSONViewer data={parsedContent} />
                    </div>
                )
            } catch {
                return <MemoizedReactMarkdown>{(content as string) || `*No data*`}</MemoizedReactMarkdown>
            }
        } else {
            return <MemoizedReactMarkdown>{`*No data*`}</MemoizedReactMarkdown>
        }
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Box style={{ width: 50 }}>
                    {(() => {
                        const nodeName = data?.name || data?.id?.split('_')[0]
                        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)

                        if (foundIcon) {
                            return (
                                <div
                                    style={{
                                        ...(((theme.typography as unknown as Record<string, unknown>).commonAvatar || {}) as Record<
                                            string,
                                            string
                                        >),
                                        ...(((theme.typography as unknown as Record<string, unknown>).mediumAvatar || {}) as Record<
                                            string,
                                            string
                                        >),
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
                                        ...(((theme.typography as unknown as Record<string, unknown>).commonAvatar || {}) as Record<
                                            string,
                                            string
                                        >),
                                        ...(((theme.typography as unknown as Record<string, unknown>).mediumAvatar || {}) as Record<
                                            string,
                                            string
                                        >),
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
                {output?.timeMetadata?.delta && (
                    <Chip
                        icon={<IconClock size={17} />}
                        label={`${(output.timeMetadata.delta / 1000).toFixed(2)} seconds`}
                        variant='filled'
                        color='secondary'
                        size='small'
                        sx={{ ml: 1, '& .MuiChip-icon': { mr: 0.2, ml: 1 } }}
                    />
                )}
                {output?.usageMetadata?.total_tokens && (
                    <Chip
                        icon={<IconCoins size={17} />}
                        label={`${output.usageMetadata.total_tokens} tokens`}
                        variant='filled'
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
                        sx={{ borderColor: theme.palette.grey[900] + 25, borderRadius: 2, color: isDarkMode ? 'white' : 'inherit' }}
                        value='rendered'
                        title='Rendered'
                    >
                        Rendered
                    </ToggleButton>
                    <ToggleButton
                        sx={{ borderColor: theme.palette.grey[900] + 25, borderRadius: 2, color: isDarkMode ? 'white' : 'inherit' }}
                        value='raw'
                        title='Raw'
                    >
                        Raw
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {dataView === 'rendered' && (
                <Box>
                    {/* Tools */}
                    {output?.availableTools && output.availableTools.length > 0 && (
                        <Box>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                                Tools
                            </Typography>
                            {output.availableTools.map((tool: { name: string }, index: number) => {
                                const isToolUsed =
                                    output.usedTools &&
                                    Array.isArray(output.usedTools) &&
                                    output.usedTools.some((ut: { tool: string }) => ut.tool === tool.name)
                                return (
                                    <Accordion
                                        key={`tool-${index}`}
                                        sx={{
                                            mb: 1,
                                            '&:before': { display: 'none' },
                                            backgroundColor: isToolUsed
                                                ? isDarkMode
                                                    ? `${theme.palette.success.dark}22`
                                                    : `${theme.palette.success.light}44`
                                                : theme.palette.background.default,
                                            border: 1,
                                            borderRadius: 1,
                                            borderColor: isToolUsed ? 'success.main' : 'divider',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<IconChevronDown />}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                {renderToolAvatar(tool.name, output.availableTools)}
                                                <Typography variant='body1'>{renderToolLabel(tool.name, output.availableTools)}</Typography>
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

                    {/* Input */}
                    <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                        Input
                    </Typography>
                    {input?.messages && Array.isArray(input.messages) && input.messages.length > 0 ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        input.messages.map((message: any, index: number) => (
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
                                        backgroundColor: getRoleColors(message.role as string).bg,
                                        color: getRoleColors(message.role as string).color,
                                        borderColor: getRoleColors(message.role as string).border
                                    }}
                                    label={message.role as string}
                                    variant='outlined'
                                    size='small'
                                />
                                {message.name && (
                                    <Chip
                                        sx={{
                                            mt: 1,
                                            ml: 1,
                                            backgroundColor: getRoleColors(message.role as string).bg,
                                            color: getRoleColors(message.role as string).color,
                                            borderColor: getRoleColors(message.role as string).border
                                        }}
                                        label={message.name as string}
                                        variant='outlined'
                                        size='small'
                                    />
                                )}
                                {/* Tool calls */}
                                {message.tool_calls &&
                                    (Array.isArray(message.tool_calls) ? (
                                        (message.tool_calls as Record<string, unknown>[]).map((toolCall, idx) => (
                                            <Accordion
                                                key={`tool-call-${idx}`}
                                                sx={{
                                                    mt: 1,
                                                    mb: 1,
                                                    '&:before': { display: 'none' },
                                                    backgroundColor: isDarkMode
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
                                                            color={isDarkMode ? 'white' : darken(theme.palette.warning.dark, 0.5)}
                                                        />
                                                    }
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        {renderToolAvatar(toolCall.name as string, output?.availableTools || [])}
                                                        <Typography variant='body1'>
                                                            {renderToolLabel(toolCall.name as string, output?.availableTools || [])}
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
                                        <JSONViewer data={message.tool_calls as unknown} />
                                    ))}
                                {/* Tool role message */}
                                {message.role === 'tool' && message.name && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1, py: 1 }}>
                                        {renderToolAvatar(message.name as string, output?.availableTools || [])}
                                        <Typography variant='body1'>
                                            {renderToolLabel(message.name as string, output?.availableTools || [])}
                                            {message.tool_call_id && (
                                                <Chip
                                                    label={message.tool_call_id as string}
                                                    size='small'
                                                    variant='outlined'
                                                    sx={{
                                                        ml: 1,
                                                        height: '20px',
                                                        color: 'info',
                                                        border: 1,
                                                        py: 1.5,
                                                        borderColor: isDarkMode ? 'white' : 'divider'
                                                    }}
                                                />
                                            )}
                                        </Typography>
                                    </Box>
                                )}
                                {/* Used tools chips */}
                                {(message.additional_kwargs as Record<string, unknown>)?.usedTools &&
                                    ((message.additional_kwargs as Record<string, unknown>).usedTools as Record<string, unknown>[]).length >
                                        0 && (
                                        <div style={{ display: 'block', flexDirection: 'row', width: '100%', marginTop: '10px' }}>
                                            {(
                                                (message.additional_kwargs as Record<string, unknown>).usedTools as Record<
                                                    string,
                                                    unknown
                                                >[]
                                            ).map((tool, idx) =>
                                                tool ? (
                                                    <Chip
                                                        key={idx}
                                                        size='small'
                                                        label={tool.tool as string}
                                                        sx={{
                                                            mr: 1,
                                                            mt: 1,
                                                            borderColor: tool.error ? 'error.main' : undefined,
                                                            color: tool.error ? 'error.main' : undefined
                                                        }}
                                                        variant='outlined'
                                                        icon={
                                                            <IconTool size={15} color={tool.error ? theme.palette.error.main : undefined} />
                                                        }
                                                        onClick={() => onUsedToolClick(tool as Record<string, unknown>, 'Used Tools')}
                                                    />
                                                ) : null
                                            )}
                                        </div>
                                    )}
                                {/* Artifacts */}
                                {(message.additional_kwargs as Record<string, unknown>)?.artifacts &&
                                    ((message.additional_kwargs as Record<string, unknown>).artifacts as Record<string, unknown>[]).length >
                                        0 &&
                                    renderArtifacts(
                                        (message.additional_kwargs as Record<string, unknown>).artifacts as Record<string, unknown>[]
                                    )}
                                {/* User file uploads */}
                                {message.role === 'user' &&
                                    Array.isArray(message.content) &&
                                    (message.content as Record<string, unknown>[]).map((content, idx) => (
                                        <Card
                                            key={`file-uploads-${idx}`}
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
                                                    (content as Record<string, unknown>).type === 'stored-file'
                                                        ? `${baseURL}/api/v1/get-upload-file?chatflowId=${metadata?.agentflowId}&chatId=${
                                                              metadata?.sessionId
                                                          }&fileName=${(content as Record<string, unknown>).name}`
                                                        : ((content as Record<string, unknown>).name as string)
                                                }
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                    const target = e.target as HTMLImageElement
                                                    target.onerror = null
                                                    target.style.padding = '5px'
                                                    target.src = toolSVG
                                                }}
                                                sx={{
                                                    height: 'auto',
                                                    maxHeight: '500px',
                                                    width: '100%',
                                                    objectFit: 'contain',
                                                    display: 'block'
                                                }}
                                                alt={`file-uploads-${idx}`}
                                            />
                                        </Card>
                                    ))}
                                {/* Message content */}
                                {renderContentOrJson(message.content)}
                                {/* File annotations */}
                                {(message.additional_kwargs as Record<string, unknown>)?.fileAnnotations &&
                                    ((message.additional_kwargs as Record<string, unknown>).fileAnnotations as { fileName: string }[])
                                        .length > 0 && (
                                        <div
                                            style={{
                                                display: 'block',
                                                flexDirection: 'row',
                                                width: '100%',
                                                marginTop: '16px',
                                                marginBottom: '8px'
                                            }}
                                        >
                                            {(
                                                (message.additional_kwargs as Record<string, unknown>).fileAnnotations as {
                                                    fileName: string
                                                }[]
                                            ).map((fileAnnotation, idx) => (
                                                <Button
                                                    key={idx}
                                                    sx={{ fontSize: '0.85rem', textTransform: 'none', mb: 1, mr: 1 }}
                                                    variant='outlined'
                                                    onClick={() => downloadFile(fileAnnotation)}
                                                    endIcon={<IconDownload color={theme.palette.primary.main} />}
                                                >
                                                    {fileAnnotation.fileName}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                            </Box>
                        ))
                    ) : input?.form || input?.http || input?.conditions ? (
                        <JSONViewer data={input.form || input.http || input.conditions} />
                    ) : input?.code ? (
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
                                value={input.code as string}
                                height={'max-content'}
                                theme={isDarkMode ? 'dark' : 'light'}
                                lang={'js'}
                                basicSetup={{ lineNumbers: false, foldGutter: false, autocompletion: false, highlightActiveLine: false }}
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
                            <MemoizedReactMarkdown>{(input?.question as string) || `*No data*`}</MemoizedReactMarkdown>
                        </Box>
                    )}

                    {/* Output */}
                    <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                        Output
                    </Typography>
                    {output?.form || output?.http ? (
                        <JSONViewer data={output.form || output.http} />
                    ) : output?.conditions ? (
                        renderFullfilledConditions(output.conditions)
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
                            {output?.usedTools && output.usedTools.length > 0 && (
                                <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                    {output.usedTools.map((tool: Record<string, unknown>, idx: number) =>
                                        tool ? (
                                            <Chip
                                                key={idx}
                                                size='small'
                                                label={tool.tool as string}
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
                                    )}
                                </div>
                            )}
                            {output?.artifacts && output.artifacts.length > 0 && renderArtifacts(output.artifacts)}
                            {renderContentOrJson(output?.content)}
                            {output?.fileAnnotations && output.fileAnnotations.length > 0 && (
                                <div
                                    style={{
                                        display: 'block',
                                        flexDirection: 'row',
                                        width: '100%',
                                        marginTop: '16px',
                                        marginBottom: '8px'
                                    }}
                                >
                                    {output.fileAnnotations.map((fileAnnotation: { fileName: string }, idx: number) => (
                                        <Button
                                            key={idx}
                                            sx={{ fontSize: '0.85rem', textTransform: 'none', mb: 1, mr: 1 }}
                                            variant='outlined'
                                            onClick={() => downloadFile(fileAnnotation)}
                                            endIcon={<IconDownload color={theme.palette.primary.main} />}
                                        >
                                            {fileAnnotation.fileName}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </Box>
                    )}

                    {/* Error */}
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
                                        : (data?.error as string) || `*No error details*`}
                                </MemoizedReactMarkdown>
                            </Box>
                        </>
                    )}

                    {/* State */}
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
                <Box sx={{ mt: 2, border: 1, borderColor: 'divider' }} onClick={(e) => e.stopPropagation()}>
                    <ReactJson
                        theme={isDarkMode ? 'ocean' : 'rjv-default'}
                        style={{ padding: 10, borderRadius: 10 }}
                        src={data as object}
                        name={null}
                        quotesOnKeys={false}
                        enableClipboard={(e) => onClipboardCopy(e as { src: unknown })}
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
                        {/* {TODO: Add focus logic } */}
                        <DialogTitle variant='h5'>Provide Feedback</DialogTitle>
                        <DialogContent>
                            <TextField
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

                    <Dialog
                        open={isLoading}
                        PaperProps={{
                            style: {
                                backgroundColor: theme.palette.background.paper,
                                boxShadow: String(theme.shadows[5]),
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

NodeExecutionDetails.displayName = 'NodeExecutionDetails'
