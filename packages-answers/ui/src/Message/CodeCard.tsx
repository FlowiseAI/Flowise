import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ContentCopy from '@mui/icons-material/ContentCopy'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import Paper from '@mui/material/Paper'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { duotoneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeCardProps {
    code: string
    language: string
    title?: string
    onCopy?: () => void
    onPreview?: () => void
    expandable?: boolean
}

export const CodeCard: React.FC<CodeCardProps> = ({ code, language, title, onCopy, onPreview, expandable }) => {
    const handleExpand = () => {
        if (expandable) {
            onPreview?.()
        }
    }

    return (
        <Paper
            variant='outlined'
            sx={{
                overflow: 'hidden',
                cursor: expandable ? 'pointer' : 'default',
                '&:hover': expandable
                    ? {
                          bgcolor: 'rgba(255,255,255,0.03)'
                      }
                    : {}
            }}
            onClick={handleExpand}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <Typography variant='subtitle2' sx={{ color: 'text.secondary' }}>
                    {title || language}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {onCopy && (
                        <IconButton
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onCopy()
                            }}
                        >
                            <ContentCopy fontSize='small' />
                        </IconButton>
                    )}
                    {onPreview && !expandable && (
                        <IconButton
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onPreview()
                            }}
                        >
                            <OpenInFullIcon fontSize='small' />
                        </IconButton>
                    )}
                    {expandable && (
                        <IconButton size='small'>
                            <OpenInFullIcon fontSize='small' />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Show preview of code for expandable blocks */}
            {expandable ? (
                <Box sx={{ maxHeight: '300px', overflow: 'hidden', position: 'relative' }}>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '100px',
                            background: 'linear-gradient(transparent, #1E1E1E)',
                            pointerEvents: 'none'
                        }}
                    />
                    <SyntaxHighlighter
                        language={language}
                        style={duotoneDark}
                        customStyle={{
                            margin: 0,
                            padding: '16px',
                            background: '#1E1E1E'
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </Box>
            ) : (
                <SyntaxHighlighter
                    language={language}
                    style={duotoneDark}
                    customStyle={{
                        margin: 0,
                        padding: '16px',
                        background: '#1E1E1E'
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            )}
        </Paper>
    )
}
