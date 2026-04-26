import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCode, IconEye } from '@tabler/icons-react'
import ReactJson from 'flowise-react-json-view'
import remarkGfm from 'remark-gfm'

import { MetricsDisplay, StatusIndicator } from '@/atoms'
import type { ExecutionState, ExecutionTreeNode, HumanInputParams, NodeExecutionData } from '@/core/types'
import { useObserveConfig } from '@/infrastructure/store'

type DataView = 'rendered' | 'raw'

interface NodeExecutionDetailProps {
    node: ExecutionTreeNode
    agentflowId: string
    sessionId: string
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
}

function isMarkdown(value: unknown): value is string {
    return typeof value === 'string' && (value.includes('\n') || value.includes('**') || value.includes('##'))
}

function renderValue(value: unknown, isDarkMode: boolean) {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') {
        if (isMarkdown(value)) {
            return <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        }
        return (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {value}
            </Typography>
        )
    }
    if (typeof value === 'object') {
        return (
            <ReactJson
                src={value as object}
                theme={isDarkMode ? 'monokai' : 'rjv-default'}
                collapsed={2}
                displayDataTypes={false}
                displayObjectSize={false}
                style={{ fontSize: '0.75rem', background: 'transparent' }}
            />
        )
    }
    return <Typography variant='body2'>{String(value)}</Typography>
}

/**
 * Right-panel detail view for a selected node in the execution tree.
 * Shows node metadata, metrics, rendered/raw output, and HITL controls when applicable.
 */
export function NodeExecutionDetail({ node, agentflowId, sessionId, onHumanInput }: NodeExecutionDetailProps) {
    const theme = useTheme()
    const { isDarkMode } = useObserveConfig()
    const [dataView, setDataView] = useState<DataView>('rendered')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [feedbackText, setFeedbackText] = useState('')
    const [pendingType, setPendingType] = useState<'proceed' | 'reject' | null>(null)

    const raw = node.raw as NodeExecutionData | undefined
    const isHumanInputNode = raw?.name === 'humanInputAgentflow'
    const isInProgress = node.status === 'INPROGRESS'
    const showHitlControls = isHumanInputNode && isInProgress && !!onHumanInput
    const enableFeedback = raw?.data?.humanInputEnableFeedback === true

    const submitHumanInput = async (type: 'proceed' | 'reject', feedback = '') => {
        if (!onHumanInput) return
        setIsSubmitting(true)
        try {
            await onHumanInput(agentflowId, {
                question: feedback || (type === 'proceed' ? 'Proceed' : 'Reject'),
                chatId: sessionId,
                humanInput: { type, startNodeId: node.nodeId, feedback }
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleProceed = () => {
        if (enableFeedback) {
            setPendingType('proceed')
            setFeedbackOpen(true)
        } else {
            submitHumanInput('proceed')
        }
    }

    const handleReject = () => {
        if (enableFeedback) {
            setPendingType('reject')
            setFeedbackOpen(true)
        } else {
            submitHumanInput('reject')
        }
    }

    const handleFeedbackSubmit = () => {
        if (pendingType) submitHumanInput(pendingType, feedbackText)
        setFeedbackOpen(false)
        setFeedbackText('')
        setPendingType(null)
    }

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            {/* Header */}
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1.5 }}>
                <StatusIndicator state={node.status as ExecutionState} size={18} />
                <Typography variant='h5'>{node.nodeLabel}</Typography>
                {node.name && (
                    <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                        {node.name}
                    </Typography>
                )}
            </Stack>

            {/* Metrics */}
            {raw?.output && <MetricsDisplay output={raw.output} />}

            {/* HITL Controls */}
            {showHitlControls && (
                <Box sx={{ my: 2, p: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                    <Typography variant='subtitle1' sx={{ mb: 1 }}>
                        {(raw?.data?.question as string) ?? 'Waiting for your response'}
                    </Typography>
                    <Stack direction='row' spacing={1}>
                        <Button variant='contained' color='success' size='small' disabled={isSubmitting} onClick={handleProceed}>
                            {isSubmitting ? <CircularProgress size={14} /> : 'Approve'}
                        </Button>
                        <Button variant='outlined' color='error' size='small' disabled={isSubmitting} onClick={handleReject}>
                            Reject
                        </Button>
                    </Stack>
                </Box>
            )}

            <Divider sx={{ my: 1.5 }} />

            {/* Data view toggle */}
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
                <Typography variant='subtitle1'>Output</Typography>
                <ToggleButtonGroup size='small' value={dataView} exclusive onChange={(_, val) => val && setDataView(val)}>
                    <ToggleButton value='rendered'>
                        <Tooltip title='Rendered'>
                            <IconEye size={14} />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value='raw'>
                        <Tooltip title='Raw JSON'>
                            <IconCode size={14} />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {/* Data content */}
            <Box sx={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>
                {dataView === 'raw' ? (
                    <ReactJson
                        src={raw?.data ?? {}}
                        theme={isDarkMode ? 'monokai' : 'rjv-default'}
                        collapsed={1}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        style={{ fontSize: '0.75rem', background: 'transparent' }}
                    />
                ) : (
                    Object.entries(raw?.data ?? {}).map(([key, value]) => (
                        <Box key={key} sx={{ mb: 1.5 }}>
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                                {key}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>{renderValue(value, isDarkMode)}</Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* Feedback dialog */}
            <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>Provide Feedback</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        multiline
                        fullWidth
                        rows={3}
                        label='Feedback'
                        variant='outlined'
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
                    <Button onClick={handleFeedbackSubmit} variant='contained' disabled={isSubmitting}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
