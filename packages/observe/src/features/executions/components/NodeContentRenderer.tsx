import { type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

import { Box, Typography } from '@mui/material'
import remarkGfm from 'remark-gfm'

import { CodeFenceBlock, JsonBlock, JsonPrimitive } from '@/atoms'
import { tryParseJson } from '@/core/primitives'

// Loose markdown heuristic: false positives still render correctly because
// react-markdown passes plain text through unchanged.
function looksLikeMarkdown(value: string): boolean {
    return value.includes('\n') || value.includes('**') || value.includes('##') || value.includes('```') || value.includes('`')
}

export interface NodeContentRendererProps {
    value: unknown
    isDarkMode: boolean
    /**
     * When true (default), string content that parses as a JSON primitive
     * (e.g. `"6092"` → 6092) is rendered through `JsonPrimitive` with its own
     * bordered frame. Pass `false` for the simple input rendering path
     * (Start / Direct Reply nodes), which renders `data.input.question` as
     * plain markdown text without a nested inner border.
     */
    parsePrimitiveAsJson?: boolean
    /**
     * Override the bordered JSON viewer's max height. Defaults to JsonBlock's
     * value (400) — set this only when the embedding context (e.g. a
     * compact list cell) needs a smaller cap.
     */
    jsonMaxHeight?: number | string
}

// react-markdown v9 dropped the `inline` prop — we infer block vs inline by
// inspecting `className` (language-*) and `children` (newlines).
//
// `ReactMarkdownCodeProps` mirrors the subset of the v9 `code` component
// signature we actually use; matching it lets ReactMarkdown's component
// override accept `MarkdownCode` directly without a cast.
interface ReactMarkdownCodeProps {
    className?: string
    children?: ReactNode
}

interface MarkdownCodeProps extends ReactMarkdownCodeProps {
    isDarkMode: boolean
}

function MarkdownCode({ className, children, isDarkMode, ...rest }: MarkdownCodeProps) {
    const text = String(children ?? '')
    const langMatch = /language-(\w+)/.exec(className ?? '')
    const isBlock = !!langMatch || text.includes('\n')

    if (!isBlock) {
        return (
            <Box
                component='code'
                className={className}
                sx={{
                    px: 0.5,
                    borderRadius: 0.5,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    fontFamily: 'monospace',
                    fontSize: '0.85em'
                }}
                {...rest}
            >
                {children}
            </Box>
        )
    }

    return <CodeFenceBlock value={text.replace(/\n$/, '')} language={langMatch?.[1] ?? ''} />
}

/**
 * Renders a single value as JSON, markdown, or plain text.
 *
 * We deliberately do NOT enable `rehype-raw`: agent inputs frequently contain
 * malformed HTML fragments which crash the rehype-raw HTML tokenizer. Without
 * it, ReactMarkdown safely escapes HTML as text.
 */
export function NodeContentRenderer({ value, isDarkMode, parsePrimitiveAsJson = true, jsonMaxHeight }: NodeContentRendererProps) {
    if (value === null || value === undefined) {
        return (
            <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                No data
            </Typography>
        )
    }

    if (typeof value === 'object') {
        return <JsonBlock value={value as object} isDarkMode={isDarkMode} maxHeight={jsonMaxHeight} />
    }

    if (typeof value === 'string') {
        if (parsePrimitiveAsJson) {
            const parsed = tryParseJson(value)
            if (parsed.ok) {
                const v = parsed.value
                if (v !== null && typeof v === 'object')
                    return <JsonBlock value={v as object} isDarkMode={isDarkMode} maxHeight={jsonMaxHeight} />
                return <JsonPrimitive value={v as string | number | boolean | null} isDarkMode={isDarkMode} />
            }
        }

        if (looksLikeMarkdown(value)) {
            // CommonMark requires fenced code blocks to start at the beginning
            // of a line. Agent outputs frequently embed mid-line fences like
            // `Summary: ```json\n{...}\n```` — v8 (legacy) parsed these
            // leniently, but v9 (current) follows spec and treats them as
            // plain text. Insert a newline before any mid-line fence so v9
            // detects it. Without this, the closing ``` (which IS at line
            // start) gets misread as a new opening fence with no closing,
            // producing an empty CodeFenceBlock at the end.
            const withFenceBoundaries = value.replace(/(?<!\n|^)(```)/g, '\n$1')
            // Promote single `\n` to a hard break (`  \n`) for ReactMarkdown v9
            // since v9 collapses soft breaks. Skip the transform inside fenced
            // ``` blocks so the fence content / detection isn't polluted.
            const withHardBreaks = withFenceBoundaries
                .split(/(```[\s\S]*?```)/g)
                .map((part, i) => (i % 2 === 0 ? part.replace(/(?<!\n)\n(?!\n)/g, '  \n') : part))
                .join('')
            return (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ children }) => <p style={{ margin: '0.25em 0' }}>{children}</p>,
                        code: (props: ReactMarkdownCodeProps) => <MarkdownCode {...props} isDarkMode={isDarkMode} />
                    }}
                >
                    {withHardBreaks}
                </ReactMarkdown>
            )
        }

        return (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {value}
            </Typography>
        )
    }

    // Numbers, booleans, etc.
    return <Typography variant='body2'>{String(value)}</Typography>
}
