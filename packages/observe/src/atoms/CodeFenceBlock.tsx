import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { IconCheck, IconClipboard, IconDownload } from '@tabler/icons-react'

// Lookup is case-insensitive so common capitalizations LLMs emit
// ("JavaScript", "Python") map correctly.
const PROGRAMMING_LANGUAGE_EXT: Record<string, string> = {
    bash: '.sh',
    c: '.c',
    'c#': '.cs',
    'c++': '.cpp',
    cpp: '.cpp',
    css: '.css',
    go: '.go',
    haskell: '.hs',
    html: '.html',
    java: '.java',
    javascript: '.js',
    json: '.json',
    kotlin: '.kt',
    lua: '.lua',
    markdown: '.md',
    md: '.md',
    'objective-c': '.m',
    perl: '.pl',
    php: '.php',
    python: '.py',
    ruby: '.rb',
    rust: '.rs',
    scala: '.scala',
    shell: '.sh',
    sql: '.sql',
    swift: '.swift',
    typescript: '.ts',
    xml: '.xml',
    yaml: '.yml',
    yml: '.yml'
}

interface CodeFenceBlockProps {
    value: string
    language: string
}

/**
 * Code-fence renderer with copy + download buttons in a dark header bar.
 * Uses Prism via react-syntax-highlighter with the oneDark theme.
 */
export function CodeFenceBlock({ value, language }: CodeFenceBlockProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (!navigator.clipboard?.writeText) return
        // Only flash "Copied!" once the write actually succeeds; rejections
        // (permission denied, secure-context violation, focused-frame issues)
        // would otherwise produce a misleading success indication.
        navigator.clipboard
            .writeText(value)
            .then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            })
            .catch((err) => {
                console.warn('[Observe] Clipboard copy failed:', err)
            })
    }

    const handleDownload = () => {
        const lang = language?.toLowerCase() ?? ''
        const ext = PROGRAMMING_LANGUAGE_EXT[lang] ?? '.txt'
        const baseName = lang ? `snippet-${lang}` : 'snippet'
        const blob = new Blob([value], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${baseName}${ext}`
        link.href = url
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <Box sx={{ my: 1, borderRadius: 1, overflow: 'hidden', backgroundColor: '#1e1e1e' }}>
            <Stack
                direction='row'
                alignItems='center'
                spacing={1}
                sx={{ px: 1, py: 0.5, color: 'common.white', backgroundColor: 'common.black' }}
            >
                <Typography variant='body2' sx={{ color: 'common.white', fontFamily: 'monospace', flex: 1 }}>
                    {language || ''}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton size='small' color='success' onClick={handleCopy}>
                        {copied ? <IconCheck /> : <IconClipboard />}
                    </IconButton>
                </Tooltip>
                <Tooltip title='Download'>
                    <IconButton size='small' color='primary' onClick={handleDownload}>
                        <IconDownload />
                    </IconButton>
                </Tooltip>
            </Stack>
            <SyntaxHighlighter
                language={language}
                style={oneDark}
                wrapLongLines
                customStyle={{ margin: 0, fontSize: '0.75rem' }}
                codeTagProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }}
            >
                {value}
            </SyntaxHighlighter>
        </Box>
    )
}
