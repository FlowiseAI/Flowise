import { useState } from 'react'
import PropTypes from 'prop-types'
import { Badge, Tooltip } from '@mui/material'
import { keyframes } from '@mui/system'
import { IconWebhook } from '@tabler/icons-react'

import { StyledFab } from '@/ui-component/button/StyledFab'
import WebhookListenerDrawer from './WebhookListenerDrawer'

// Two pulses: a slow ambient one for "listening" (waiting), a fast one for "running" (in-flight)
const pulseSlow = keyframes`
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.35; }
`
const pulseFast = keyframes`
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.7); opacity: 0.2; }
`

const STATUS_COLOR = {
    idle: 'grey.500',
    connecting: 'info.main',
    listening: 'success.main',
    running: 'warning.main',
    done: 'success.dark',
    stopped: 'info.main',
    error: 'error.main'
}

const WebhookListenerFAB = ({ chatflowid, onOpenChange }) => {
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState('idle')

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        if (onOpenChange) onOpenChange(next)
    }

    const dotShouldPulse = status === 'listening' || status === 'running'

    return (
        <>
            <Tooltip title='Webhook Listener'>
                <Badge
                    overlap='circular'
                    variant='dot'
                    invisible={status === 'idle'}
                    sx={{
                        position: 'absolute',
                        right: 20,
                        top: 20,
                        '& .MuiBadge-dot': {
                            backgroundColor: (theme) => {
                                const token = STATUS_COLOR[status] ?? 'grey.500'
                                const [k, v] = token.split('.')
                                return theme.palette[k]?.[v] ?? theme.palette.grey[500]
                            },
                            boxShadow: '0 0 0 2px var(--mui-palette-background-default)',
                            animation: dotShouldPulse ? `${status === 'running' ? pulseFast : pulseSlow} 1.4s ease-in-out infinite` : 'none'
                        }
                    }}
                >
                    <StyledFab size='small' color='secondary' aria-label='webhook-listener' onClick={handleToggle}>
                        <IconWebhook size={18} stroke={2.2} />
                    </StyledFab>
                </Badge>
            </Tooltip>

            <WebhookListenerDrawer
                open={open}
                chatflowid={chatflowid}
                onClose={() => {
                    setOpen(false)
                    if (onOpenChange) onOpenChange(false)
                }}
                onStatusChange={setStatus}
            />
        </>
    )
}

WebhookListenerFAB.propTypes = {
    chatflowid: PropTypes.string.isRequired,
    onOpenChange: PropTypes.func
}

export default WebhookListenerFAB
