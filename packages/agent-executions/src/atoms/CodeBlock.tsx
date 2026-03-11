import { IconClipboard, IconDownload } from '@tabler/icons-react'
import { memo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Box, IconButton, Popover, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const programmingLanguages: Record<string, string> = {
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
    css: '.css'
}

interface CodeBlockProps {
    language: string
    chatflowid?: string
    isFullWidth?: boolean
    value: string
}

export const CodeBlock = memo(({ language, chatflowid, isFullWidth, value }: CodeBlockProps) => {
    const theme = useTheme()
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const openPopOver = Boolean(anchorEl)

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const copyToClipboard = (event: React.MouseEvent<HTMLElement>) => {
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
        const fileName = `file-${chatflowid}${fileExtension}`

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
            <Box
                sx={{
                    color: 'white',
                    background: (theme.palette?.common as unknown as Record<string, string>).dark,
                    p: 1,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10
                }}
            >
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
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <SyntaxHighlighter language={language} style={oneDark as any} customStyle={{ margin: 0 }}>
                {value}
            </SyntaxHighlighter>
        </div>
    )
})

CodeBlock.displayName = 'CodeBlock'
