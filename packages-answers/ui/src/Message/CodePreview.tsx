import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RefreshIcon from '@mui/icons-material/Refresh'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { getHTMLPreview, getReactPreview, isReactComponent } from '../utils/previewUtils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { duotoneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import CircularProgress from '@mui/material/CircularProgress'
import GetAppIcon from '@mui/icons-material/GetApp'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoneIcon from '@mui/icons-material/Done'

interface CodePreviewProps {
    code: string
    language: string
    onClose: () => void
    title?: string
}

export const CodePreview: React.FC<CodePreviewProps> = ({ code, language, onClose, title = 'Interactive Preview' }) => {
    const [tabValue, setTabValue] = React.useState<number>(0)
    const [isReady, setIsReady] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [copied, setCopied] = React.useState(false)

    const canPreview = false

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `code.${language}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'background.paper'
                }}
            >
                <IconButton size='small' onClick={onClose}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant='subtitle1' sx={{ flex: 1 }}>
                    {title}
                </Typography>
                <IconButton size='small' onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
                    <SyntaxHighlighter
                        language={language}
                        style={duotoneDark}
                        customStyle={{
                            margin: 0,
                            borderRadius: '4px',
                            backgroundColor: '#1E1E1E',
                            padding: '16px',
                            fontSize: '0.875rem',
                            textShadow: 'none'
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </Box>
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                    p: 1,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'background.paper'
                }}
            >
                <Button
                    size='small'
                    variant='text'
                    startIcon={copied ? <DoneIcon /> : <ContentCopyIcon />}
                    onClick={handleCopy}
                    sx={{
                        color: copied ? 'success.main' : 'text.secondary',
                        '&:hover': {
                            color: copied ? 'success.main' : 'text.primary'
                        }
                    }}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                    size='small'
                    variant='text'
                    startIcon={<GetAppIcon />}
                    onClick={handleDownload}
                    sx={{
                        color: 'text.secondary',
                        '&:hover': {
                            color: 'text.primary'
                        }
                    }}
                >
                    Download
                </Button>
            </Box>
        </Box>
    )
}
