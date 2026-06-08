import { memo } from 'react'

import CancelIcon from '@mui/icons-material/Cancel'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { Avatar, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconAlertCircleFilled, IconCheck, IconExclamationMark, IconLoader } from '@tabler/icons-react'

import type { ExecutionStatus } from '@/core/types'

export interface NodeStatusIndicatorProps {
    status?: ExecutionStatus
    error?: string
}

export interface NodeWarningIndicatorProps {
    message: string
}

/**
 * Status indicator badge shown on the top-right of a node
 */
function NodeStatusIndicatorComponent({ status, error }: NodeStatusIndicatorProps) {
    const theme = useTheme()

    if (!status) return null

    const getStatusBackgroundColor = (status: ExecutionStatus) => {
        switch (status) {
            case 'ERROR':
                return theme.palette.error.dark
            case 'INPROGRESS':
                return theme.palette.warning.dark
            case 'STOPPED':
            case 'TERMINATED':
            case 'WAITING_FOR_INPUT':
                return theme.palette.error.main
            case 'FINISHED':
                return theme.palette.success.dark
            default:
                return theme.palette.primary.dark
        }
    }

    const renderStatusIcon = () => {
        switch (status) {
            case 'INPROGRESS':
                return <IconLoader className='spin-animation' />
            case 'ERROR':
                return <IconExclamationMark />
            case 'TERMINATED':
                return <CancelIcon sx={{ color: getStatusBackgroundColor(status) }} />
            case 'STOPPED':
                return <StopCircleIcon sx={{ color: getStatusBackgroundColor(status) }} />
            case 'WAITING_FOR_INPUT':
                return <StopCircleIcon sx={{ color: getStatusBackgroundColor(status) }} />
            default:
                return <IconCheck />
        }
    }

    const isTransparentBg = status === 'STOPPED' || status === 'TERMINATED' || status === 'WAITING_FOR_INPUT'

    const tooltipTitle = status === 'ERROR' ? error || 'Error' : status === 'WAITING_FOR_INPUT' ? 'Waiting for input' : ''

    return (
        <Tooltip title={tooltipTitle} placement='top' arrow disableInteractive>
            <Avatar
                variant='rounded'
                sx={{
                    width: 22,
                    height: 22,
                    fontSize: '1rem',
                    borderRadius: '50%',
                    background: isTransparentBg ? 'white' : getStatusBackgroundColor(status),
                    color: 'white',
                    ml: 2,
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    pointerEvents: 'all',
                    cursor: 'default'
                }}
            >
                {renderStatusIcon()}
            </Avatar>
        </Tooltip>
    )
}

/**
 * Warning indicator badge shown on the top-left of a node
 */
function NodeWarningIndicatorComponent({ message }: NodeWarningIndicatorProps) {
    if (!message) return null

    return (
        <Tooltip placement='right-start' title={<span style={{ whiteSpace: 'pre-line' }}>{message}</span>}>
            <Avatar
                variant='rounded'
                sx={{
                    width: 22,
                    height: 22,
                    fontSize: '1rem',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: -10,
                    left: -10
                }}
            >
                <IconAlertCircleFilled color='orange' />
            </Avatar>
        </Tooltip>
    )
}

export const NodeStatusIndicator = memo(NodeStatusIndicatorComponent)
export const NodeWarningIndicator = memo(NodeWarningIndicatorComponent)
