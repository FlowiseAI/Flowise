import { IconClipboard, IconDownload } from '@tabler/icons-react'
import { memo, useState, useEffect, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import PropTypes from 'prop-types'
import { Box, IconButton, Popover, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import mermaid from 'mermaid'

const programmingLanguages = {
    javascript: '.js',
    python: '.py',
    java: '.java',
    c: '.c',
    cpp: '.cpp',
    'c++': '.cpp',
    'c#': '.cs',
    ruby: '.rb',
    php: '.php',
    swift: '.swift',
    'objective-c': '.m',
    kotlin: '.kt',
    typescript: '.ts',
    go: '.go',
    perl: '.pl',
    rust: '.rs',
    scala: '.scala',
    haskell: '.hs',
    lua: '.lua',
    shell: '.sh',
    sql: '.sql',
    html: '.html',
    css: '.css',
    mermaid: '.mmd'
}

export const CodeBlock = memo(({ language, chatflowid, isFullWidth, value }) => {
    const theme = useTheme()
    const [anchorEl, setAnchorEl] = useState(null)
    const [mermaidSvg, setMermaidSvg] = useState(null)
    const [mermaidError, setMermaidError] = useState(null)
    const diagramIdRef = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    const openPopOver = Boolean(anchorEl)
    const isMermaid = language?.toLowerCase() === 'mermaid'

    useEffect(() => {
        if (!isMermaid || !value) return

        mermaid.initialize({
            startOnLoad: false,
            theme: theme.palette.mode === 'dark' ? 'dark' : 'default',
            securityLevel: 'strict'
        })

        const renderMermaid = async () => {
            try {
                setMermaidError(null)
                const { svg } = await mermaid.render(diagramIdRef.current, value)
                setMermaidSvg(svg)
            } catch (error) {
                setMermaidError(error.message)
                setMermaidSvg(null)
            }
        }

        renderMermaid()
    }, [isMermaid, value, theme.palette.mode])

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const copyToClipboard = (event) => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            return
        }

        navigator.clipboard.writeText(value)
        setAnchorEl(event.currentTarget)
        setTimeout(() => {
            handleClosePopOver()
        }, 1500)
    }

    const downloadAsFile = () => {
        const fileExtension = programmingLanguages[language] || '.file'
        const suggestedFileName = `file-${chatflowid}${fileExtension}`
        const fileName = suggestedFileName

        if (!fileName) {
            // user pressed cancel on prompt
            return
        }

        const blob = new Blob([value], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = fileName
        link.href = url
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div style={{ width: isFullWidth ? '' : 300 }}>
            <Box sx={{ color: 'white', background: theme.palette?.common.dark, p: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    {language}
                    <div style={{ flex: 1 }}></div>
                    <IconButton size='small' title='Copy' color='success' onClick={copyToClipboard}>
                        <IconClipboard />
                    </IconButton>
                    <Popover
                        open={openPopOver}
                        anchorEl={anchorEl}
                        onClose={handleClosePopOver}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right'
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left'
                        }}
                    >
                        <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: theme.palette.success.dark }}>
                            Copied!
                        </Typography>
                    </Popover>
                    <IconButton size='small' title='Download' color='primary' onClick={downloadAsFile}>
                        <IconDownload />
                    </IconButton>
                </div>
            </Box>

            {isMermaid ? (
                <Box sx={{ background: theme.palette?.common.dark, p: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
                    {mermaidError ? (
                        <Box>
                            <Typography variant='body2' color='error' sx={{ mb: 1 }}>
                                Mermaid rendering error: {mermaidError}
                            </Typography>
                            <SyntaxHighlighter language='text' style={oneDark} customStyle={{ margin: 0 }}>
                                {value}
                            </SyntaxHighlighter>
                        </Box>
                    ) : mermaidSvg ? (
                        <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} style={{ display: 'flex', justifyContent: 'center' }} />
                    ) : (
                        <Typography variant='body2' color='text.secondary'>
                            Rendering diagram...
                        </Typography>
                    )}
                </Box>
            ) : (
                <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0 }}>
                    {value}
                </SyntaxHighlighter>
            )}
        </div>
    )
})
CodeBlock.displayName = 'CodeBlock'

CodeBlock.propTypes = {
    language: PropTypes.string,
    chatflowid: PropTypes.string,
    isFullWidth: PropTypes.bool,
    value: PropTypes.string
}
