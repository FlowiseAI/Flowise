import { type ReactNode } from 'react'

import { Box } from '@mui/material'

import { type JsonToken, tokenizeJson } from '@/core/primitives'
import { tokens as designTokens } from '@/core/theme'

const containerSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 2,
    backgroundColor: 'background.paper',
    width: '100%',
    overflow: 'auto'
} as const

const preBaseSx = {
    m: 0,
    fontFamily: `'Inter', 'Roboto', 'Arial', sans-serif`,
    fontSize: '0.875rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
} as const

function renderTokens(tokens: JsonToken[], isDarkMode: boolean): ReactNode[] {
    const mode = isDarkMode ? 'dark' : 'light'
    const palette = designTokens.colors.jsonViewer
    return tokens.map((token, i) => {
        if (token.type === 'punctuation') {
            return <span key={i}>{token.text}</span>
        }
        const color = palette[token.type][mode]
        return (
            <span key={i} style={{ color }}>
                {token.text}
            </span>
        )
    })
}

interface JsonBlockProps {
    value: object
    isDarkMode: boolean
    maxHeight?: number | string
}

// PARITY: legacy JSONViewer.jsx defaults to maxHeight: '400px' so long
// HTTP / form / tool payloads scroll inside the bordered frame instead of
// pushing the rest of the panel off-screen.
const DEFAULT_MAX_HEIGHT = 400

/**
 * Flat syntax-highlighted JSON pre-block. Used for inline (non-raw) JSON
 * content — Input/Output bubbles for HTTP/form/structured nodes. The
 * interactive tree-view `flowise-react-json-view` is reserved for the Raw view
 * where collapse/expand is useful.
 */
export function JsonBlock({ value, isDarkMode, maxHeight = DEFAULT_MAX_HEIGHT }: JsonBlockProps) {
    const json = JSON.stringify(value, null, 2)
    return (
        <Box sx={{ ...containerSx, maxHeight }}>
            <Box component='pre' sx={preBaseSx}>
                {renderTokens(tokenizeJson(json), isDarkMode)}
            </Box>
        </Box>
    )
}

interface JsonPrimitiveProps {
    value: string | number | boolean | null
    isDarkMode: boolean
}

export function JsonPrimitive({ value, isDarkMode }: JsonPrimitiveProps) {
    const mode = isDarkMode ? 'dark' : 'light'
    const palette = designTokens.colors.jsonViewer
    let color: string
    let display: string
    if (typeof value === 'string') {
        color = palette.string[mode]
        display = `"${value}"`
    } else if (typeof value === 'number') {
        color = palette.number[mode]
        display = String(value)
    } else if (typeof value === 'boolean') {
        color = palette.boolean[mode]
        display = String(value)
    } else {
        color = palette.null[mode]
        display = 'null'
    }
    return (
        <Box sx={containerSx}>
            <Box component='pre' sx={{ ...preBaseSx, color }}>
                {display}
            </Box>
        </Box>
    )
}
