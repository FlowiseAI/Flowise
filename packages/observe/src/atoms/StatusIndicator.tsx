import { useTheme } from '@mui/material/styles'
import { IconAlertCircle, IconCheck, IconLoader2, IconPlayerStop, IconUserQuestion, IconX } from '@tabler/icons-react'

import type { ExecutionState } from '@/core/types'

interface StatusIndicatorProps {
    state: ExecutionState
    size?: number
}

/**
 * Color-coded icon for an execution or node state.
 * Used in both the list table and the execution tree view.
 */
export function StatusIndicator({ state, size = 16 }: StatusIndicatorProps) {
    const theme = useTheme()

    switch (state) {
        case 'FINISHED':
            return <IconCheck size={size} color={theme.palette.success.main} />
        case 'ERROR':
            return <IconAlertCircle size={size} color={theme.palette.error.main} />
        case 'TERMINATED':
            return <IconX size={size} color={theme.palette.error.main} />
        case 'STOPPED':
            return <IconPlayerStop size={size} color={theme.palette.error.main} />
        case 'TIMEOUT':
            return <IconAlertCircle size={size} color={theme.palette.warning.main} />
        case 'INPROGRESS':
            return <IconLoader2 size={size} color={theme.palette.warning.dark} style={{ animation: 'spin 1s linear infinite' }} />
        default:
            return <IconUserQuestion size={size} color={theme.palette.text.secondary} />
    }
}
