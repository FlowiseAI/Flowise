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
    const [tabValue, setTabValue] = React.useState<number>(() => {
        if (language === 'html') {
            return code.includes('</html>') || code.includes('</body>') ? 0 : 1
        }
        return code.includes('return') && code.includes('}') ? 0 : 1
    })
    const [isReady, setIsReady] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [copied, setCopied] = React.useState(false)

    const canPreview = ['html', 'jsx', 'tsx'].includes(language) || (language === 'javascript' && isReactComponent(code))

    // Detect if code is complete enough to preview
    const isCodeComplete = React.useMemo(() => {
        if (!code) return false

        if (language === 'html') {
            // For HTML, check for any valid HTML structure
            const hasOpeningTag = /<\w+/.test(code)
            const hasContent = code.length > 10
            const hasTailwindClasses = code.includes('class="') || code.includes('className="')
            return hasOpeningTag && (hasContent || hasTailwindClasses)
        }

        // For React/JS, check for partial component structure
        const hasComponentStart = code.includes('function') || code.includes('=>') || code.includes('class')
        const hasJSXStart = code.includes('<') || code.includes('return')
        return hasComponentStart || hasJSXStart
    }, [code, language])

    // Auto-switch to preview when code is complete
    React.useEffect(() => {
        if (canPreview) {
            if (code.length > 0) {
                // Always show code tab while code is being written
                setTabValue(1)
                // Switch to preview only when code is complete enough
                if (isCodeComplete) {
                    setIsReady(true)
                }
            }
        }
    }, [canPreview, code, isCodeComplete])

    // Add auto-preview when code seems stable
    React.useEffect(() => {
        if (isCodeComplete) {
            const previewTimer = setTimeout(() => {
                setTabValue(0) // Switch to preview after a short delay
            }, 1000) // Wait 1 second after code stops changing

            return () => clearTimeout(previewTimer)
        }
    }, [isCodeComplete, code])

    const handleIframeLoad = () => {
        setError(null)
        setIsReady(true)
    }

    const handleRefresh = () => {
        setIsReady(false)
        setError(null)
        setTimeout(() => setIsReady(true), 100)
    }

    // Listen for messages from the iframe
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'preview-error') {
                setError(event.data.message)
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

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
                <IconButton size='small' onClick={handleRefresh}>
                    <RefreshIcon />
                </IconButton>
                <IconButton size='small' onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, value) => setTabValue(value)}
                    aria-label='preview tabs'
                    sx={{ pointerEvents: !isCodeComplete ? 'none' : 'auto' }}
                >
                    {canPreview && <Tab label='Preview' />}
                    <Tab label='Code' />
                </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: tabValue === 0 ? 'block' : 'none'
                    }}
                >
                    {error ? (
                        <Box
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                p: 3,
                                textAlign: 'center',
                                color: 'error.main'
                            }}
                        >
                            <ErrorOutlineIcon sx={{ fontSize: 40 }} />
                            <Typography variant='h6'>Preview Error</Typography>
                            <Typography variant='body2' sx={{ maxWidth: '600px' }}>
                                {error}
                            </Typography>
                            <Button variant='outlined' color='primary' onClick={handleRefresh} startIcon={<RefreshIcon />}>
                                Try Again
                            </Button>
                        </Box>
                    ) : isReady ? (
                        <iframe
                            srcDoc={language === 'html' ? getHTMLPreview(code) : getReactPreview(code)}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: '#fff'
                            }}
                            sandbox='allow-scripts'
                            title='Code Preview'
                            onLoad={handleIframeLoad}
                        />
                    ) : (
                        <Box
                            sx={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography color='text.secondary'>Loading preview...</Typography>
                        </Box>
                    )}
                </Box>

                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: tabValue === 1 ? 'block' : 'none',
                        overflow: 'auto'
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            maxWidth: '100%',
                            overflow: 'hidden'
                        }}
                    >
                        <SyntaxHighlighter
                            language={language}
                            style={{
                                ...duotoneDark,
                                'pre[class*="language-"]': {
                                    ...duotoneDark['pre[class*="language-"]'],
                                    background: '#1E1E1E',
                                    selection: 'none'
                                },
                                'code[class*="language-"]': {
                                    ...duotoneDark['code[class*="language-"]'],
                                    background: '#1E1E1E',
                                    textShadow: 'none'
                                }
                            }}
                            customStyle={{
                                margin: 0,
                                borderRadius: '4px',
                                backgroundColor: '#1E1E1E',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                width: '100%',
                                overflow: 'auto',
                                fontSize: '0.875rem',
                                textShadow: 'none'
                            }}
                            wrapLongLines={true}
                        >
                            {code}
                        </SyntaxHighlighter>
                        {!isCodeComplete && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mt: 2,
                                    color: 'text.secondary'
                                }}
                            >
                                <CircularProgress size={16} />
                                <Typography variant='caption'>Generating code...</Typography>
                            </Box>
                        )}
                    </Box>
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
