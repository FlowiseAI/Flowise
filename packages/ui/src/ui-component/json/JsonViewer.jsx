import { useSelector } from 'react-redux'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

const JsonToken = ({ type, children, isDarkMode }) => {
    const getTokenStyle = (tokenType) => {
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

function parseJsonToElements(json, isDarkMode) {
    if (!json) return []

    const tokens = []
    let index = 0

    // Escape HTML characters for safety
    const escapedJson = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // eslint-disable-next-line
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g

    let match
    let lastIndex = 0

    while ((match = tokenRegex.exec(escapedJson)) !== null) {
        // Add any text before the match as plain text
        if (match.index > lastIndex) {
            const plainText = escapedJson.substring(lastIndex, match.index)
            if (plainText) {
                tokens.push(<span key={`plain-${index++}`}>{plainText}</span>)
            }
        }

        // Determine token type
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

    // Add any remaining text
    if (lastIndex < escapedJson.length) {
        const remainingText = escapedJson.substring(lastIndex)
        if (remainingText) {
            tokens.push(<span key={`remaining-${index++}`}>{remainingText}</span>)
        }
    }

    return tokens
}

export const JSONViewer = ({ data, maxHeight = '400px' }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode

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

JSONViewer.propTypes = {
    data: PropTypes.object,
    maxHeight: PropTypes.string
}

JsonToken.propTypes = {
    type: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    isDarkMode: PropTypes.bool.isRequired
}
