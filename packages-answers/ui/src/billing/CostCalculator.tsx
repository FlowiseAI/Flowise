'use client'

import React, { useState, useEffect } from 'react'
import { Box, Card, Typography, TextField, Grid, Stack, Tooltip, IconButton } from '@mui/material'
import {
    Chat as ChatIcon,
    Image as ImageIcon,
    Code as CodeIcon,
    Psychology as PsychologyIcon,
    Info as InfoIcon,
    Bolt as SparkIcon
} from '@mui/icons-material'
import { BILLING_CONFIG } from '../config/billing'

interface UsageTemplate {
    name: string
    description: string
    icon: React.ReactNode
    aiTokens: number
    computeTime: number
    storage: number
    examples: string[]
}

const USAGE_TEMPLATES: UsageTemplate[] = [
    {
        name: 'Chat Assistant',
        description: 'Interactive chat conversations with AI',
        icon: <ChatIcon sx={{ fontSize: 24, color: '#4CAF50' }} />,
        aiTokens: 2000,
        computeTime: 1,
        storage: 0.01,
        examples: ['Customer support automation', 'Personal AI assistant', 'Interactive tutoring']
    },
    {
        name: 'Image Creation',
        description: 'Generate and edit images with AI',
        icon: <ImageIcon sx={{ fontSize: 24, color: '#2196F3' }} />,
        aiTokens: 1000,
        computeTime: 5,
        storage: 0.1,
        examples: ['Product visualization', 'Art generation', 'Image editing and enhancement']
    },
    {
        name: 'Code Assistant',
        description: 'AI-powered code generation and analysis',
        icon: <CodeIcon sx={{ fontSize: 24, color: '#9C27B0' }} />,
        aiTokens: 10000,
        computeTime: 10,
        storage: 0.5,
        examples: ['Code generation and review', 'Bug detection and fixing', 'Documentation generation']
    },
    {
        name: 'Complex Reasoning',
        description: 'Advanced analysis and problem-solving',
        icon: <PsychologyIcon sx={{ fontSize: 24, color: '#FF9800' }} />,
        aiTokens: 8000,
        computeTime: 3,
        storage: 0.05,
        examples: ['Data analysis and insights', 'Strategic planning', 'Research assistance']
    }
]

const CostCalculator = () => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [aiTokens, setAiTokens] = useState<string>('')
    const [computeSparks, setComputeSparks] = useState<string>('')
    const [storageSparks, setStorageSparks] = useState<string>('')
    const [totalSparks, setTotalSparks] = useState<number>(0)

    const handleTemplateSelect = (templateName: string) => {
        setSelectedTemplate(templateName)
        const template = USAGE_TEMPLATES.find((t) => t.name === templateName)

        if (template) {
            const aiTokenSparks = Math.ceil(
                (template.aiTokens / BILLING_CONFIG.RATES.AI_TOKENS.UNIT) * BILLING_CONFIG.RATES.AI_TOKENS.SPARKS
            )
            const computeSparks = Math.ceil(template.computeTime * BILLING_CONFIG.RATES.COMPUTE.SPARKS)
            const storageSparks = Math.ceil(template.storage * BILLING_CONFIG.RATES.STORAGE.SPARKS)

            setAiTokens(aiTokenSparks.toString())
            setComputeSparks(computeSparks.toString())
            setStorageSparks(storageSparks.toString())
        }
    }

    useEffect(() => {
        const calculateTotalSparks = () => {
            const totalSparks = (Number(aiTokens) || 0) + (Number(computeSparks) || 0) + (Number(storageSparks) || 0)
            setTotalSparks(totalSparks)
        }

        calculateTotalSparks()
    }, [aiTokens, computeSparks, storageSparks])

    return (
        <Box sx={{ width: '100%', px: 4, py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Typography variant='h4' sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                        Cost Calculator
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                        Select a template or customize usage to estimate costs • 1 Spark = ${BILLING_CONFIG.SPARK_TO_USD.toFixed(3)} USD
                    </Typography>
                </Box>

                <Box>
                    <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mb: 3 }}>Templates</Typography>
                    <Grid container spacing={2}>
                        {USAGE_TEMPLATES.map((template) => (
                            <Grid item xs={12} sm={6} md={3} key={template.name}>
                                <Box
                                    onClick={() => handleTemplateSelect(template.name)}
                                    sx={{
                                        p: 2,
                                        height: '100%',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        border: '1px solid',
                                        borderColor: selectedTemplate === template.name ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
                                        '&:hover': {
                                            borderColor: selectedTemplate === template.name ? 'primary.main' : 'rgba(255, 255, 255, 0.2)'
                                        }
                                    }}
                                >
                                    <Stack spacing={1}>
                                        <Stack direction='row' alignItems='center' spacing={1}>
                                            {template.icon}
                                            <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500, flexGrow: 1 }}>
                                                {template.name}
                                            </Typography>
                                        </Stack>
                                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                            {template.description}
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                <Grid container spacing={2} sx={{ ml: -2 }}>
                    <Grid item xs={12} md={4}>
                        <Box
                            sx={{
                                p: 2.5,
                                height: '100%',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <SparkIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500, flexGrow: 1 }}>
                                        AI Tokens
                                    </Typography>
                                    <Tooltip title={BILLING_CONFIG.RATE_DESCRIPTIONS.AI_TOKENS} arrow>
                                        <InfoIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                                    </Tooltip>
                                </Stack>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                    {BILLING_CONFIG.RATES.AI_TOKENS.UNIT.toLocaleString()} tokens = {BILLING_CONFIG.RATES.AI_TOKENS.SPARKS}{' '}
                                    Sparks (${BILLING_CONFIG.RATES.AI_TOKENS.COST})
                                </Typography>
                                <TextField
                                    value={aiTokens}
                                    onChange={(e) => setAiTokens(e.target.value)}
                                    type='number'
                                    size='small'
                                    fullWidth
                                    placeholder='Enter Sparks'
                                    InputProps={{
                                        sx: {
                                            color: 'white',
                                            fontSize: '0.875rem',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.1)'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'primary.main'
                                            }
                                        }
                                    }}
                                />
                                {aiTokens && (
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Cost: ${((Number(aiTokens) || 0) * BILLING_CONFIG.SPARK_TO_USD).toFixed(2)}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box
                            sx={{
                                p: 2.5,
                                height: '100%',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <SparkIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500, flexGrow: 1 }}>
                                        Compute Time
                                    </Typography>
                                    <Tooltip title={BILLING_CONFIG.RATE_DESCRIPTIONS.COMPUTE} arrow>
                                        <InfoIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                                    </Tooltip>
                                </Stack>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                    {BILLING_CONFIG.RATES.COMPUTE.UNIT} minute = {BILLING_CONFIG.RATES.COMPUTE.SPARKS} Sparks ($
                                    {BILLING_CONFIG.RATES.COMPUTE.COST})
                                </Typography>
                                <TextField
                                    value={computeSparks}
                                    onChange={(e) => setComputeSparks(e.target.value)}
                                    type='number'
                                    size='small'
                                    fullWidth
                                    placeholder='Enter Sparks'
                                    InputProps={{
                                        sx: {
                                            color: 'white',
                                            fontSize: '0.875rem',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.1)'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'primary.main'
                                            }
                                        }
                                    }}
                                />
                                {computeSparks && (
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Cost: ${((Number(computeSparks) || 0) * BILLING_CONFIG.SPARK_TO_USD).toFixed(2)}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box
                            sx={{
                                p: 2.5,
                                height: '100%',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <SparkIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                    <Typography sx={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500, flexGrow: 1 }}>
                                        Storage
                                    </Typography>
                                    <Tooltip title={BILLING_CONFIG.RATE_DESCRIPTIONS.STORAGE} arrow>
                                        <InfoIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                                    </Tooltip>
                                </Stack>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                                    {BILLING_CONFIG.RATES.STORAGE.UNIT} GB/month = {BILLING_CONFIG.RATES.STORAGE.SPARKS} Sparks ($
                                    {BILLING_CONFIG.RATES.STORAGE.COST})
                                </Typography>
                                <TextField
                                    value={storageSparks}
                                    onChange={(e) => setStorageSparks(e.target.value)}
                                    type='number'
                                    size='small'
                                    fullWidth
                                    placeholder='Enter Sparks'
                                    InputProps={{
                                        sx: {
                                            color: 'white',
                                            fontSize: '0.875rem',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.1)'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'primary.main'
                                            }
                                        }
                                    }}
                                />
                                {storageSparks && (
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                                        Cost: ${((Number(storageSparks) || 0) * BILLING_CONFIG.SPARK_TO_USD).toFixed(2)}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>

                {totalSparks > 0 && (
                    <Box sx={{ mt: 2, p: 2, borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Stack direction='row' justifyContent='space-between' alignItems='center'>
                            <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500 }}>Total Cost</Typography>
                            <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
                                ${(totalSparks * BILLING_CONFIG.SPARK_TO_USD).toFixed(2)}
                            </Typography>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

export default CostCalculator
