import PropTypes from 'prop-types'

import { Box, Card, IconButton, Stack, Typography, useTheme } from '@mui/material'
import { IconCopy } from '@tabler/icons-react'

const ErrorBoundary = ({ error }) => {
    const theme = useTheme()

    const copyToClipboard = () => {
        const errorMessage = `Status: ${error.response.status}\n${error.response.data.message}`
        navigator.clipboard.writeText(errorMessage)
    }

    return (
        <Box sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2, padding: '20px', maxWidth: '1280px' }}>
            <Stack flexDirection='column' sx={{ alignItems: 'center', gap: 3 }}>
                <Stack flexDirection='column' sx={{ alignItems: 'center', gap: 1 }}>
                    <Typography variant='h2'>Oh snap!</Typography>
                    <Typography variant='h3'>The following error occured when loading this page.</Typography>
                </Stack>
                <Card variant='outlined'>
                    <Box sx={{ position: 'relative', px: 2, py: 3 }}>
                        <IconButton
                            onClick={copyToClipboard}
                            size='small'
                            sx={{ position: 'absolute', top: 1, right: 1, color: theme.palette.grey[900] + 25 }}
                        >
                            <IconCopy />
                        </IconButton>
                        <pre style={{ margin: 0 }}>
                            <code>{`Status: ${error.response.status}`}</code>
                            <br />
                            <code>{error.response.data.message}</code>
                        </pre>
                    </Box>
                </Card>
                <Typography variant='body1' sx={{ fontSize: '1.1rem', textAlign: 'center', lineHeight: '1.5' }}>
                    Please retry after some time. If the issue persists, reach out to us on our Discord server.
                    <br />
                    Alternatively, you can raise an issue on Github.
                </Typography>
            </Stack>
        </Box>
    )
}

ErrorBoundary.propTypes = {
    error: PropTypes.object
}

export default ErrorBoundary
