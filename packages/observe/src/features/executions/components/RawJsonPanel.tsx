import { Box } from '@mui/material'
import ReactJson from 'flowise-react-json-view'

interface RawJsonPanelProps {
    // ReactJson types `src` as `object`. Callers pass `Record<string, unknown>`
    // (NodeExecutionDetail's `payload`); narrowing here keeps the consumer
    // signature aligned with what ReactJson actually accepts.
    src: object
    isDarkMode: boolean
}

/**
 * Pretty-prints arrays/objects with a 2-space indent instead of the default
 * minified copy that ReactJson would otherwise emit.
 */
function onClipboardCopy(e: { src: unknown }) {
    if (!navigator.clipboard?.writeText) return
    const src = e.src
    const text = Array.isArray(src) || (src !== null && typeof src === 'object') ? JSON.stringify(src, null, 2) : String(src)
    navigator.clipboard.writeText(text).catch((err) => {
        console.warn('[Observe] Clipboard copy failed:', err)
    })
}

/**
 * Raw JSON tree viewer used by NodeExecutionDetail's "Raw" tab. Wraps
 * `flowise-react-json-view` with the bordered frame + theme switch + a
 * pretty-printing clipboard handler.
 */
export function RawJsonPanel({ src, isDarkMode }: RawJsonPanelProps) {
    return (
        <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, p: 1.25 }} onClick={(e) => e.stopPropagation()}>
            <ReactJson
                src={src}
                theme={isDarkMode ? 'ocean' : 'rjv-default'}
                collapsed={1}
                displayDataTypes={false}
                quotesOnKeys={false}
                style={{ fontSize: '0.75rem', background: 'transparent' }}
                enableClipboard={onClipboardCopy}
            />
        </Box>
    )
}
