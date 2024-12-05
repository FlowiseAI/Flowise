import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ContentCopy from '@mui/icons-material/ContentCopy'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'

interface CodeCardProps {
    code: string
    language: string
    onCopy: () => void
    onPreview: () => void
    title?: string
}

export const CodeCard: React.FC<CodeCardProps> = ({ code, language, onCopy, onPreview, title = 'Generated Code' }) => {
    return (
        <Box
            sx={{
                backgroundColor: 'background.paper',
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.03)'
                }
            }}
            onClick={onPreview}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.2)'
                }}
            >
                <Typography variant='body2' color='text.secondary'>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onCopy()
                        }}
                    >
                        <ContentCopy fontSize='small' />
                    </IconButton>
                    <IconButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onPreview()
                        }}
                    >
                        <OpenInFullIcon fontSize='small' />
                    </IconButton>
                </Box>
            </Box>
            <Box
                sx={{
                    p: 2,
                    maxHeight: 100,
                    overflow: 'hidden',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '50px',
                        background: 'linear-gradient(transparent, background.paper)'
                    }
                }}
            >
                <Typography
                    component='pre'
                    sx={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        width: '100%',
                        overflow: 'auto',
                        maxHeight: '100%',
                        '& code': {
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            display: 'block'
                        }
                    }}
                >
                    {code}
                </Typography>
            </Box>
        </Box>
    )
}
