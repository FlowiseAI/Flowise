import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useConfigContext } from '../infrastructure/store/ConfigContext'

interface JsonTokenProps {
    type: string
    children: React.ReactNode
    isDarkMode: boolean
}

const JsonToken = ({ type, children, isDarkMode }: JsonTokenProps) => {
    const getTokenStyle = (tokenType: string) => {
        switch (tokenType) {
            case 'string':
                return { color: isDarkMode ? '#9cdcfe' : 'green' }
            case 'number':
                return { color: isDarkMode ? '#b5cea8' : 'darkorange' }
            case 'boolean':
                return { color: isDarkMode ? '#569cd6' : 'blue' }
            case 'null':
                return { color: isDarkMode ? '#d4d4d4' : 'magenta' }
            case 'key':
                return { color: isDarkMode ? '#ff5733' : '#ff5733' }
            default:
                return {}
        }
    }

    return <span style={getTokenStyle(type)}>{children}</span>
}

function parseJsonToElements(json: string, isDarkMode: boolean) {
    if (!json) return []

    const tokens: React.ReactNode[] = []
    let index = 0

    const escapedJson = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

    let match
    let lastIndex = 0

    while ((match = tokenRegex.exec(escapedJson)) !== null) {
        if (match.index > lastIndex) {
            const plainText = escapedJson.substring(lastIndex, match.index)
            if (plainText) {
                tokens.push(<span key={`plain-${index++}`}>{plainText}</span>)
            }
        }

        let tokenType = 'number'
        const matchText = match[0]

        if (/^"/.test(matchText)) {
            if (/:$/.test(matchText)) {
                tokenType = 'key'
            } else {
                tokenType = 'string'
            }
        } else if (/true|false/.test(matchText)) {
            tokenType = 'boolean'
        } else if (/null/.test(matchText)) {
            tokenType = 'null'
        }

        tokens.push(
            <JsonToken key={`token-${index++}`} type={tokenType} isDarkMode={isDarkMode}>
                {matchText}
            </JsonToken>
        )

        lastIndex = match.index + match[0].length
    }

    if (lastIndex < escapedJson.length) {
        const remainingText = escapedJson.substring(lastIndex)
        if (remainingText) {
            tokens.push(<span key={`remaining-${index++}`}>{remainingText}</span>)
        }
    }

    return tokens
}

interface JSONViewerProps {
    data: unknown
    maxHeight?: string
}

export const JSONViewer = ({ data, maxHeight = '400px' }: JSONViewerProps) => {
    const theme = useTheme()
    const config = useConfigContext()
    const isDarkMode = config.isDarkMode ?? false

    const jsonString = JSON.stringify(data, null, 2)
    const jsonElements = parseJsonToElements(jsonString, isDarkMode)

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                backgroundColor: theme.palette.background.default,
                width: '100%',
                overflow: 'auto',
                maxHeight: maxHeight
            }}
        >
            <pre
                style={{
                    margin: 0,
                    fontFamily: `'Inter', 'Roboto', 'Arial', sans-serif`,
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
            >
                {jsonElements}
            </pre>
        </Box>
    )
}
