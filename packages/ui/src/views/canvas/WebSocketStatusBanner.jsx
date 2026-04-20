import { Alert, AlertTitle, Box } from '@mui/material'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

/**
 * WebSocketStatusBanner - Displays real-time status of WebSocket connection health
 * Shows warnings or errors when server is under load or at capacity
 */
const WebSocketStatusBanner = () => {
    const { healthStatus, rateLimitError, connectionBlocked } = useWebSocketContext()

    // Server at capacity - cannot connect
    if (connectionBlocked) {
        return (
            <Box sx={{ position: 'fixed', top: 70, left: 0, right: 0, zIndex: 1300 }}>
                <Alert severity='error'>
                    <AlertTitle>Server at Capacity</AlertTitle>
                    Unable to connect to real-time features. The server is currently at maximum capacity. Retrying in{' '}
                    {Math.round(connectionBlocked.retryAfter / 1000)} seconds...
                </Alert>
            </Box>
        )
    }

    // Rate limit exceeded
    if (rateLimitError) {
        return (
            <Box sx={{ position: 'fixed', top: 70, left: 0, right: 0, zIndex: 1300 }}>
                <Alert severity='warning'>
                    <AlertTitle>Slow Down</AlertTitle>
                    {rateLimitError.message} Please wait {rateLimitError.retryAfter} seconds before sending more updates.
                </Alert>
            </Box>
        )
    }

    // Critical server health
    if (healthStatus?.status === 'critical') {
        return (
            <Box sx={{ position: 'fixed', top: 70, left: 0, right: 0, zIndex: 1300 }}>
                <Alert severity='error'>
                    <AlertTitle>High Server Load ({healthStatus.utilization})</AlertTitle>
                    Real-time collaboration features may be slow or temporarily unavailable. Please be patient.
                </Alert>
            </Box>
        )
    }

    // Warning server health
    if (healthStatus?.status === 'warning') {
        return (
            <Box sx={{ position: 'fixed', top: 70, left: 0, right: 0, zIndex: 1300 }}>
                <Alert severity='warning'>
                    <AlertTitle>Server Busy ({healthStatus.utilization})</AlertTitle>
                    Real-time collaboration features may experience delays.
                </Alert>
            </Box>
        )
    }

    return null
}

export default WebSocketStatusBanner
