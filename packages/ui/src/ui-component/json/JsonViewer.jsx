import { useSelector } from 'react-redux'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

// Syntax highlighting function for JSON
function syntaxHighlight(json) {
    if (!json) return '' // No JSON from response

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return json.replace(
        // eslint-disable-next-line
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = 'number'
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key'
                } else {
                    cls = 'string'
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean'
            } else if (/null/.test(match)) {
                cls = 'null'
            }
            return '<span class="' + cls + '">' + match + '</span>'
        }
    )
}

export const JSONViewer = ({ data, maxHeight = '400px' }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode

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
            <style>{`
                pre .string {
                    color: ${isDarkMode ? '#9cdcfe' : 'green'};
                }
                pre .number {
                    color: ${isDarkMode ? '#b5cea8' : 'darkorange'};
                }
                pre .boolean {
                    color: ${isDarkMode ? '#569cd6' : 'blue'};
                }
                pre .null {
                    color: ${isDarkMode ? '#d4d4d4' : 'magenta'};
                }
                pre .key {
                    color: ${isDarkMode ? '#ff5733' : '#ff5733'};
                }
            `}</style>
            <pre
                style={{
                    margin: 0,
                    fontFamily: `'Inter', 'Roboto', 'Arial', sans-serif`,
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
                dangerouslySetInnerHTML={{
                    __html: syntaxHighlight(JSON.stringify(data, null, 2), isDarkMode)
                }}
            />
        </Box>
    )
}

JSONViewer.propTypes = {
    data: PropTypes.object,
    maxHeight: PropTypes.string
}
