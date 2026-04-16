import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { Alert, Box, Button, ClickAwayListener, Fab, Paper, Snackbar, Typography } from '@mui/material'
import { alpha, darken, lighten, useTheme } from '@mui/material/styles'
import { IconChecklist, IconExclamationCircle, IconX } from '@tabler/icons-react'

import validateEmptyImage from '@/assets/images/validate_empty.svg'
import { getAgentflowIcon } from '@/core/node-config'
import { tokens } from '@/core/theme/tokens'
import type { FlowEdge, FlowNode, NodeDataSchema, ValidationError } from '@/core/types'
import { applyValidationErrorsToNodes, validateFlow } from '@/core/validation'
import { useConfigContext } from '@/infrastructure/store'

const validationColor = tokens.colors.border.validation

/** Validation result grouped by node */
interface NodeValidationResult {
    id: string
    label: string
    name: string
    issues: string[]
}

export interface ValidationFeedbackProps {
    nodes: FlowNode[]
    edges: FlowEdge[]
    availableNodes?: NodeDataSchema[]
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
}

function groupErrorsByNode(errors: ValidationError[], nodes: FlowNode[]): NodeValidationResult[] {
    const nodeMap = new Map<string, NodeValidationResult>()

    for (const error of errors) {
        const id = error.nodeId || error.edgeId || 'flow'
        if (!nodeMap.has(id)) {
            const node = nodes.find((n) => n.id === id)
            let label = `Edge ${id}`
            let name = 'edge'
            if (node) {
                label = node.data.label || node.data.name
                name = node.data.name
            } else if (id === 'flow') {
                label = 'Flow'
                name = 'flow'
            }
            nodeMap.set(id, {
                id,
                label,
                name,
                issues: []
            })
        }
        nodeMap.get(id)!.issues.push(error.message)
    }

    return Array.from(nodeMap.values())
}

function ValidationFeedbackComponent({ nodes, edges, availableNodes, setNodes }: ValidationFeedbackProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()

    const [open, setOpen] = useState(false)
    const [results, setResults] = useState<NodeValidationResult[]>([])
    const [hasValidated, setHasValidated] = useState(false)
    const [successSnackbar, setSuccessSnackbar] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleToggle = useCallback(() => {
        setOpen((prev) => !prev)
    }, [])

    const handleClose = useCallback(() => {
        setOpen(false)
    }, [])

    const handleValidate = useCallback(() => {
        const result = validateFlow(nodes, edges, availableNodes)
        const grouped = groupErrorsByNode(result.errors, nodes)
        setResults(grouped)
        setHasValidated(true)

        // Show green success toast when no issues found
        if (grouped.length === 0) {
            setSuccessSnackbar(true)
        }

        // Push validation errors to node data for border highlighting
        setNodes((prev) => applyValidationErrorsToNodes(prev, result.errors))
    }, [nodes, edges, availableNodes, setNodes])

    const getNodeIcon = (item: NodeValidationResult) => {
        const foundIcon = getAgentflowIcon(item.name)

        if (foundIcon) {
            const IconComp = foundIcon.icon
            return (
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '4px',
                        backgroundColor: foundIcon.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}
                >
                    <IconComp size={16} />
                </Box>
            )
        }

        return (
            <Box
                sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '4px',
                    backgroundColor: '#9e9e9e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                }}
            >
                <IconExclamationCircle size={16} />
            </Box>
        )
    }

    // Reset stale validation state when flow changes
    useEffect(() => {
        if (hasValidated) {
            setHasValidated(false)
            setResults([])
        }
    }, [nodes.length, edges.length]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <ClickAwayListener onClickAway={handleClose}>
                <div ref={containerRef} style={{ position: 'relative' }}>
                    <Fab
                        size='small'
                        aria-label='validation'
                        title='Validate flow'
                        onClick={handleToggle}
                        sx={{
                            zIndex: 10,
                            color: 'white',
                            backgroundColor: 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                backgroundImage: 'linear-gradient(rgb(0 0 0/10%) 0 0)'
                            }
                        }}
                    >
                        {open ? <IconX /> : <IconChecklist />}
                    </Fab>

                    {open && (
                        <Paper
                            elevation={16}
                            sx={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                mt: 1.5,
                                width: 400,
                                zIndex: 10
                            }}
                        >
                            <Box sx={{ p: 2 }}>
                                <Typography variant='h6' sx={{ mt: 1, mb: 2, fontWeight: 600 }}>
                                    Checklist ({results.reduce((sum, r) => sum + r.issues.length, 0)})
                                </Typography>

                                <Box sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1, mr: -1 }}>
                                    {results.length > 0 ? (
                                        results.map((item, index) => (
                                            <Paper
                                                key={index}
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    mb: 2,
                                                    backgroundColor: isDarkMode ? theme.palette.background.paper : theme.palette.grey[50],
                                                    borderRadius: '8px',
                                                    border: `1px solid ${alpha(validationColor, isDarkMode ? 0.3 : 0.5)}`
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    {getNodeIcon(item)}
                                                    <Typography sx={{ fontWeight: 500 }}>{item.label || item.name}</Typography>
                                                </Box>

                                                {item.issues.map((issue, issueIndex) => (
                                                    <Box
                                                        key={issueIndex}
                                                        sx={{
                                                            pt: 1.5,
                                                            px: 2,
                                                            pb: issueIndex === item.issues.length - 1 ? 1.5 : 0.5,
                                                            backgroundColor: isDarkMode
                                                                ? darken(validationColor, 0.85)
                                                                : lighten(validationColor, 0.9),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.5,
                                                            borderTopLeftRadius: issueIndex === 0 ? '8px' : 0,
                                                            borderTopRightRadius: issueIndex === 0 ? '8px' : 0,
                                                            borderBottomLeftRadius: issueIndex === item.issues.length - 1 ? '8px' : 0,
                                                            borderBottomRightRadius: issueIndex === item.issues.length - 1 ? '8px' : 0
                                                        }}
                                                    >
                                                        <IconExclamationCircle
                                                            color={validationColor}
                                                            size={20}
                                                            style={{ minWidth: 20, flexShrink: 0 }}
                                                        />
                                                        <Typography variant='body2'>{issue}</Typography>
                                                    </Box>
                                                ))}
                                            </Paper>
                                        ))
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <img
                                                style={{ objectFit: 'cover', height: '15vh', width: 'auto' }}
                                                src={validateEmptyImage}
                                                alt='Illustration of a checklist with no items, indicating no issues found'
                                            />
                                            {hasValidated ? (
                                                <Typography variant='body2' color='success.main' sx={{ mt: 2, fontWeight: 500 }}>
                                                    No issues found in your flow!
                                                </Typography>
                                            ) : (
                                                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                                                    Click &quot;Validate flow&quot; to check for issues
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                                    <Button
                                        variant='contained'
                                        color='primary'
                                        onClick={handleValidate}
                                        startIcon={<IconChecklist size={18} />}
                                        sx={{ minWidth: 120, textTransform: 'none' }}
                                    >
                                        Validate flow
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>
                    )}
                </div>
            </ClickAwayListener>

            {/* Success toast */}
            <Snackbar
                open={successSnackbar}
                autoHideDuration={3000}
                onClose={() => setSuccessSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={() => setSuccessSnackbar(false)} severity='success' variant='filled' sx={{ width: '100%' }}>
                    No issues found in your flow!
                </Alert>
            </Snackbar>
        </>
    )
}

export const ValidationFeedback = memo(ValidationFeedbackComponent)
