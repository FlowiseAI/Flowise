import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconLoader, IconCircleXFilled } from '@tabler/icons-react'
import type { Theme } from '@mui/material/styles'
import type { ExecutionState } from '../types'

export const getIconFromStatus = (state: ExecutionState, theme: Theme) => {
    switch (state) {
        case 'FINISHED':
            return CheckCircleIcon
        case 'ERROR':
        case 'TIMEOUT':
            return ErrorIcon
        case 'TERMINATED': {
            const TerminatedIcon = (props: Record<string, unknown>) => <IconCircleXFilled {...props} color={theme.palette.error.main} />
            TerminatedIcon.displayName = 'TerminatedIcon'
            return TerminatedIcon
        }
        case 'STOPPED':
            return StopCircleIcon
        case 'INPROGRESS': {
            const InProgressIcon = (props: Record<string, unknown>) => (
                <IconLoader
                    {...props}
                    color={theme.palette.warning.dark}
                    className={`spin-animation ${(props.className as string) || ''}`}
                />
            )
            InProgressIcon.displayName = 'InProgressIcon'
            return InProgressIcon
        }
        default:
            return null
    }
}

export const getIconColor = (state: ExecutionState): string => {
    switch (state) {
        case 'FINISHED':
            return 'success.dark'
        case 'ERROR':
        case 'TIMEOUT':
            return 'error.main'
        case 'TERMINATED':
        case 'STOPPED':
            return 'error.main'
        case 'INPROGRESS':
            return 'warning.main'
        default:
            return 'text.primary'
    }
}
