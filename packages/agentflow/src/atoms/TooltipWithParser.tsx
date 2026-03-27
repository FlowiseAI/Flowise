import { Info } from '@mui/icons-material'
import { IconButton, type SxProps, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DOMPurify from 'dompurify'
import parser from 'html-react-parser'

export interface TooltipWithParserProps {
    title: string
    sx?: SxProps
}

/**
 * An info-icon tooltip that parses HTML in the title string.
 * Mirrors the original Flowise TooltipWithParser component.
 */
export function TooltipWithParser({ title, sx }: TooltipWithParserProps) {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'

    return (
        <Tooltip title={parser(DOMPurify.sanitize(title))} placement='right'>
            <IconButton sx={{ height: 15, width: 15, ml: 2, mt: -0.5 }}>
                <Info
                    sx={{
                        ...sx,
                        background: 'transparent',
                        color: isDarkMode ? 'white' : 'inherit',
                        height: 15,
                        width: 15
                    }}
                />
            </IconButton>
        </Tooltip>
    )
}
