import { memo, useCallback, useEffect, useState } from 'react'

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    OutlinedInput,
    Select,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSparkles } from '@tabler/icons-react'

import type { FlowData } from '@/core/types'
import { useApiContext, useConfigContext } from '@/infrastructure/store'

import { defaultSuggestions, SuggestionChips } from './SuggestionChips'

export interface GenerateFlowDialogProps {
    /** Whether the dialog is open */
    open: boolean
    /** Callback when dialog is closed */
    onClose: () => void
    /** Callback when flow is generated successfully */
    onGenerated: (nodes: FlowData['nodes'], edges: FlowData['edges']) => void
}

interface ChatModel {
    name: string
    label: string
    description?: string
}

/**
 * Generate Flow Dialog - AI-powered flow generation
 */
function GenerateFlowDialogComponent({ open, onClose, onGenerated }: GenerateFlowDialogProps) {
    const theme = useTheme()
    const { chatflowsApi, apiBaseUrl } = useApiContext()
    const { isDarkMode: _isDarkMode } = useConfigContext()

    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [chatModels, setChatModels] = useState<ChatModel[]>([])
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [loadingModels, setLoadingModels] = useState(false)

    // Load chat models when dialog opens
    useEffect(() => {
        if (open && chatModels.length === 0) {
            loadChatModels()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Clear state when dialog closes
    useEffect(() => {
        if (!open) {
            setPrompt('')
            setProgress(0)
            setError(null)
        }
    }, [open])

    // Fake progress animation
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>
        if (loading) {
            setProgress(0)
            timer = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 95) {
                        clearInterval(timer)
                        return 95
                    }
                    // Speed up in the middle, slow at the beginning and end
                    const increment = prev < 30 ? 3 : prev < 60 ? 5 : prev < 80 ? 2 : 0.5
                    return Math.min(prev + increment, 95)
                })
            }, 500)
        } else {
            setProgress(100)
        }

        return () => {
            if (timer) clearInterval(timer)
        }
    }, [loading])

    const loadChatModels = async () => {
        try {
            setLoadingModels(true)
            const models = await chatflowsApi.getChatModels()
            setChatModels(models)
            // Select first model by default
            if (models.length > 0 && !selectedModel) {
                setSelectedModel(models[0].name)
            }
        } catch (err) {
            console.error('Failed to load chat models:', err)
            setError('Failed to load chat models. Please try again.')
        } finally {
            setLoadingModels(false)
        }
    }

    const handleSuggestionSelect = useCallback((suggestion: { text: string }) => {
        setPrompt(suggestion.text)
        setError(null)
    }, [])

    const handleGenerate = async () => {
        if (!prompt.trim() || !selectedModel) return

        try {
            setLoading(true)
            setError(null)

            const result = await chatflowsApi.generateAgentflow({
                question: prompt.trim(),
                selectedChatModel: {
                    name: selectedModel
                }
            })

            if (result.nodes && result.edges) {
                onGenerated(result.nodes, result.edges)
                onClose()
            } else {
                setError('Failed to generate flow. Please try again.')
            }
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                      'Failed to generate flow. Please try again.'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const isGenerateDisabled = loading || !prompt.trim() || !selectedModel

    return (
        <Dialog
            fullWidth
            maxWidth={loading ? 'sm' : 'md'}
            open={open}
            onClose={loading ? undefined : onClose}
            aria-labelledby='generate-flow-dialog-title'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='generate-flow-dialog-title'>
                What would you like to build?
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            py: 4
                        }}
                    >
                        <Typography variant='h5' sx={{ mt: 2 }}>
                            Generating your Agentflow...
                        </Typography>
                        <Box sx={{ width: '100%', mt: 3 }}>
                            <LinearProgress
                                variant='determinate'
                                value={progress}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                                        borderRadius: 5
                                    }
                                }}
                            />
                            <Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
                                {`${Math.round(progress)}%`}
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <>
                        <Typography color='text.secondary'>
                            Enter your prompt to generate an agentflow. Performance may vary with different models. Only nodes and edges are
                            generated, you will need to fill in the input fields for each node.
                        </Typography>

                        <SuggestionChips suggestions={defaultSuggestions} onSelect={handleSuggestionSelect} disabled={loading} />

                        <OutlinedInput
                            sx={{ mt: 2, width: '100%' }}
                            type='text'
                            multiline
                            rows={8}
                            disabled={loading}
                            value={prompt}
                            placeholder='Describe your agent here'
                            onChange={(e) => {
                                setPrompt(e.target.value)
                                setError(null)
                            }}
                        />

                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel id='model-select-label'>
                                Select model to generate agentflow <span style={{ color: 'red' }}>*</span>
                            </InputLabel>
                            <Select
                                labelId='model-select-label'
                                id='model-select'
                                value={selectedModel}
                                label='Select model to generate agentflow *'
                                onChange={(e) => setSelectedModel(e.target.value)}
                                disabled={loading || loadingModels}
                            >
                                {chatModels.map((model) => (
                                    <MenuItem key={model.name} value={model.name}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <img
                                                src={`${apiBaseUrl}/api/v1/node-icon/${model.name}`}
                                                alt={model.label}
                                                style={{ width: 24, height: 24, borderRadius: '50%' }}
                                                onError={(e) => {
                                                    ;(e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                            {model.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {error && (
                            <Alert severity='error' sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ pb: 3, pr: 3 }}>
                {!loading && (
                    <>
                        <Button onClick={onClose} color='inherit'>
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            startIcon={<IconSparkles size={20} />}
                            sx={{
                                background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                                '&:hover': { background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)' },
                                '&:disabled': {
                                    background: theme.palette.action.disabledBackground
                                }
                            }}
                        >
                            Generate
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    )
}

export const GenerateFlowDialog = memo(GenerateFlowDialogComponent)
export default GenerateFlowDialog
