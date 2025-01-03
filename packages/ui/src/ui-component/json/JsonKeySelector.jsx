import { useState } from 'react'
import PropTypes from 'prop-types'
import { Box, List, ListItemButton, ListItemText, Typography, Alert, TextField, Autocomplete } from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'

const KEYS_THRESHOLD = 10

const JsonKeySelector = ({ jsonContent, onSelectKey, disabled = false }) => {
    const [keys, setKeys] = useState([])
    const [showCompactView, setShowCompactView] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState(null)

    const processKeys = () => {
        if (!jsonContent || isProcessing) return

        setIsProcessing(true)
        try {
            let content
            if (typeof jsonContent === 'string' && jsonContent.startsWith('data:application/json;base64,')) {
                const base64Content = jsonContent.split('base64,')[1].split(',filename:')[0]
                const decodedContent = atob(base64Content)
                content = JSON.parse(decodedContent)
            } else {
                content = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent
            }

            const targetObject = Array.isArray(content) ? content[0] : content

            const extractKeys = (obj, prefix = '') => {
                let keys = []
                for (const key in obj) {
                    const fullPath = prefix ? `${prefix}.${key}` : key
                    keys.push(fullPath)
                    if (obj[key] && typeof obj[key] === 'object') {
                        keys = [...keys, ...extractKeys(obj[key], fullPath)]
                    }
                }
                return keys
            }

            const extractedKeys = extractKeys(targetObject)
            setKeys(extractedKeys)
            setShowCompactView(extractedKeys.length > KEYS_THRESHOLD)
            setError(null)
        } catch (error) {
            console.error('Error processing JSON:', error)
            setKeys([])
            setError('Invalid JSON format. Please check the file content.')
        } finally {
            setIsProcessing(false)
        }
    }

    if (isProcessing) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity='info'>Processing JSON keys...</Alert>
            </Box>
        )
    }

    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity='info'>{error}</Alert>
            </Box>
        )
    }

    if (!keys.length) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity='info'>
                    <div
                        onClick={() => processKeys()}
                        style={{ cursor: 'pointer' }}
                    >
                        Click to load available keys
                    </div>
                </Alert>
            </Box>
        )
    }

    if (showCompactView) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity='info' sx={{ mb: 2 }}>
                    {keys.length} keys found. Use format: &#123;&#123;file_attachment.key&#125;&#125;
                </Alert>
                <Autocomplete
                    disabled={disabled}
                    options={keys}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label='Search available keys'
                            variant='outlined'
                            size='small'
                        />
                    )}
                    onChange={(_, value) => {
                        if (value) {
                            onSelectKey(`{{file_attachment.${value}}}`)
                        }
                    }}
                    renderOption={(props, option) => (
                        <li {...props}>
                            <Typography variant='body2'>
                                {option}
                            </Typography>
                        </li>
                    )}
                />
            </Box>
        )
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                Available Keys:
            </Typography>
            <PerfectScrollbar style={{ maxHeight: '300px' }}>
                <List dense>
                    {keys.map((key, index) => (
                        <ListItemButton
                            key={index}
                            disabled={disabled}
                            onClick={() => onSelectKey(`{{file_attachment.${key}}}`)}
                        >
                            <ListItemText
                                primary={key}
                                secondary={`Insert as: {{file_attachment.${key}}}`}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </PerfectScrollbar>
        </Box>
    )
}

JsonKeySelector.propTypes = {
    jsonContent: PropTypes.string,
    onSelectKey: PropTypes.func.isRequired,
    disabled: PropTypes.bool
}

export default JsonKeySelector