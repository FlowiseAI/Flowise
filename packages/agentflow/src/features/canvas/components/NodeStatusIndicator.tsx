import { memo } from 'react'

import CancelIcon from '@mui/icons-material/Cancel'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { Avatar, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconAlertCircleFilled, IconCheck, IconExclamationMark, IconLoader } from '@tabler/icons-react'

export type NodeStatus = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'STOPPED' | 'TERMINATED'

export interface NodeStatusIndicatorProps {
    status?: NodeStatus
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

    const getStatusBackgroundColor = (status: NodeStatus) => {
        switch (status) {
            case 'ERROR':
                return theme.palette.error.dark
            case 'INPROGRESS':
                return theme.palette.warning.dark
            case 'STOPPED':
            case 'TERMINATED':
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
                return <CancelIcon sx={{ color: getStatusBackgroundColor(status), fontSize: 16 }} />
            case 'STOPPED':
                return <StopCircleIcon sx={{ color: getStatusBackgroundColor(status), fontSize: 16 }} />
            default:
                return <IconCheck />
        }
    }

    return (
        <Tooltip title={status === 'ERROR' ? error || 'Error' : ''}>
            <Avatar
                variant='rounded'
                sx={{
                    width: 22,
                    height: 22,
                    fontSize: '1rem',
                    borderRadius: '50%',
                    background: status === 'STOPPED' || status === 'TERMINATED' ? 'white' : getStatusBackgroundColor(status),
                    color: 'white',
                    ml: 2,
                    position: 'absolute',
                    top: -10,
                    right: -10
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
