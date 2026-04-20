import { useEffect, useState } from 'react'
import { Alert, AlertTitle, Box, IconButton, LinearProgress, Snackbar, Typography } from '@mui/material'
import { IconWifiOff, IconRefresh, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

/**
 * ConnectionStatusNotification - Shows connection status and reconnection attempts
 * Displays at the top of the screen when disconnected or reconnecting
 */
export const ConnectionStatusNotification = () => {
    const { connectionState, reconnectInfo, networkStatus, forceReconnect } = useWebSocketContext()
    const [show, setShow] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState(null)

    // Show notification when disconnected or reconnecting
    useEffect(() => {
        setShow(connectionState === 'disconnected' || connectionState === 'reconnecting')
    }, [connectionState])

    // Show success snackbar when reconnected
    useEffect(() => {
        if (connectionState === 'connected' && show) {
            setSnackbarMessage({
                severity: 'success',
                message: 'Successfully reconnected to server'
            })
            setTimeout(() => setSnackbarMessage(null), 3000)
        }
    }, [connectionState, show])

    // Don't show anything if connected
    if (!show) {
        return snackbarMessage ? (
            <Snackbar
                open={!!snackbarMessage}
                autoHideDuration={3000}
                onClose={() => setSnackbarMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={snackbarMessage.severity} onClose={() => setSnackbarMessage(null)}>
                    {snackbarMessage.message}
                </Alert>
            </Snackbar>
        ) : null
    }

    const getAlertSeverity = () => {
        if (networkStatus === 'offline') return 'error'
        if (connectionState === 'reconnecting') return 'warning'
        return 'error'
    }

    const getIcon = () => {
        if (networkStatus === 'offline') return <IconWifiOff />
        if (connectionState === 'reconnecting') return <IconPlugConnectedX />
        return <IconPlugConnectedX />
    }

    const getTitle = () => {
        if (networkStatus === 'offline') return 'No Internet Connection'
        if (connectionState === 'reconnecting') {
            return `Reconnecting... (Attempt ${reconnectInfo?.attempt || 0}/${reconnectInfo?.maxAttempts || 0})`
        }
        return 'Connection Lost'
    }

    const getMessage = () => {
        if (networkStatus === 'offline') {
            return 'Please check your internet connection and try again.'
        }
        if (connectionState === 'reconnecting' && reconnectInfo) {
            const nextAttemptIn = Math.max(0, Math.round((reconnectInfo.nextAttemptAt - Date.now()) / 1000))
            return `Next attempt in ${nextAttemptIn} seconds. Your changes are saved locally.`
        }
        return 'Connection to the server was lost. Attempting to reconnect...'
    }

    const handleRetry = () => {
        forceReconnect()
    }

    return (
        <>
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    boxShadow: 3
                }}
            >
                <Alert
                    severity={getAlertSeverity()}
                    icon={getIcon()}
                    action={
                        networkStatus === 'online' && connectionState === 'disconnected' ? (
                            <IconButton color='inherit' size='small' onClick={handleRetry} title='Retry connection'>
                                <IconRefresh />
                            </IconButton>
                        ) : null
                    }
                    sx={{
                        borderRadius: 0,
                        '& .MuiAlert-message': {
                            width: '100%'
                        }
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 'bold' }}>{getTitle()}</AlertTitle>
                    <Typography variant='body2'>{getMessage()}</Typography>
                    {connectionState === 'reconnecting' && (
                        <Box sx={{ mt: 1 }}>
                            <LinearProgress
                                variant='determinate'
                                value={(reconnectInfo?.attempt / reconnectInfo?.maxAttempts) * 100}
                                sx={{ height: 6, borderRadius: 3 }}
                            />
                        </Box>
                    )}
                </Alert>
            </Box>

            {/* Success snackbar */}
            {snackbarMessage && (
                <Snackbar
                    open={!!snackbarMessage}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarMessage(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert severity={snackbarMessage.severity} onClose={() => setSnackbarMessage(null)}>
                        {snackbarMessage.message}
                    </Alert>
                </Snackbar>
            )}
        </>
    )
}

/**
 * ConnectionStatusIndicator - Small indicator that shows connection status in the corner
 * Shows a small icon in the bottom-right corner
 */
export const ConnectionStatusIndicator = () => {
    const { isConnected, connectionState, networkStatus } = useWebSocketContext()
    const [tooltip, setTooltip] = useState('')

    useEffect(() => {
        if (networkStatus === 'offline') {
            setTooltip('No internet connection')
        } else if (connectionState === 'reconnecting') {
            setTooltip('Reconnecting...')
        } else if (connectionState === 'disconnected') {
            setTooltip('Disconnected')
        } else if (isConnected) {
            setTooltip('Connected')
        }
    }, [isConnected, connectionState, networkStatus])

    const getColor = () => {
        if (networkStatus === 'offline') return 'error.main'
        if (connectionState === 'reconnecting') return 'warning.main'
        if (!isConnected) return 'error.main'
        return 'success.main'
    }

    const getIcon = () => {
        if (networkStatus === 'offline') return <IconWifiOff size={20} />
        if (!isConnected) return <IconPlugConnectedX size={20} />
        return <IconPlugConnected size={20} />
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'background.paper',
                p: 1,
                borderRadius: 2,
                boxShadow: 2,
                border: 1,
                borderColor: getColor(),
                transition: 'all 0.3s ease'
            }}
            title={tooltip}
        >
            <Box sx={{ color: getColor(), display: 'flex', alignItems: 'center' }}>{getIcon()}</Box>
            <Typography variant='caption' sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                {isConnected ? 'Connected' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Offline'}
            </Typography>
        </Box>
    )
}
