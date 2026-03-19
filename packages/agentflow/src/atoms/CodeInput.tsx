import { useMemo } from 'react'

import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { sublime } from '@uiw/codemirror-theme-sublime'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import CodeMirror from '@uiw/react-codemirror'

export interface CodeInputProps {
    value: string
    onChange: (code: string) => void
    language?: string
    disabled?: boolean
    height?: string
}

/**
 * CodeMirror-based code editor atom.
 *
 * Supports javascript (default), python, and json syntax highlighting.
 * Theme switches automatically based on dark mode.
 */
export function CodeInput({ value, onChange, language = 'javascript', disabled = false, height = '200px' }: CodeInputProps) {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'

    const extensions = useMemo(() => {
        switch (language) {
            case 'python':
                return [python()]
            case 'json':
                return [json()]
            case 'typescript':
                return [javascript({ typescript: true })]
            default:
                return [javascript()]
        }
    }, [language])

    return (
        <Box
            sx={{
                mt: 1,
                border: '1px solid',
                borderColor: 'grey.400',
                borderRadius: '6px',
                overflow: 'hidden'
            }}
        >
            <CodeMirror
                value={value || ''}
                height={height}
                theme={isDarkMode ? (language === 'json' ? sublime : vscodeDark) : 'light'}
                extensions={extensions}
                onChange={onChange}
                readOnly={disabled}
                basicSetup={{ lineNumbers: true, foldGutter: true }}
            />
        </Box>
    )
}
