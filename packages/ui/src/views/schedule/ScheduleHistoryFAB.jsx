import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Badge, Tooltip } from '@mui/material'
import { IconHistory } from '@tabler/icons-react'

// project import
import { StyledFab } from '@/ui-component/button/StyledFab'
import chatflowsApi from '@/api/chatflows'
import useApi from '@/hooks/useApi'
import ScheduleHistoryDrawer from './ScheduleHistoryDrawer'

const ScheduleHistoryFAB = ({ chatflowid, onOpenChange }) => {
    const [open, setOpen] = useState(false)
    const [runningCount, setRunningCount] = useState(0)

    const probeApi = useApi(chatflowsApi.getScheduleTriggerLogs)

    // Cheap background poll to show the "running" badge even when drawer is closed.
    // Only while FAB is mounted (i.e., a schedule flow is loaded on the canvas).
    useEffect(() => {
        if (!chatflowid) return
        let handle
        const tick = () => probeApi.request(chatflowid, { page: 1, limit: 5, status: 'RUNNING' })
        tick()
        handle = setInterval(tick, 15000)
        return () => clearInterval(handle)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatflowid])

    useEffect(() => {
        if (probeApi.data) setRunningCount(probeApi.data.total ?? 0)
    }, [probeApi.data])

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        if (onOpenChange) onOpenChange(next)
    }

    return (
        <>
            <Tooltip title='Schedule History'>
                <Badge
                    color='warning'
                    variant='dot'
                    invisible={runningCount === 0}
                    overlap='circular'
                    sx={{
                        position: 'absolute',
                        right: 20,
                        top: 20,
                        '& .MuiBadge-dot': {
                            animation: runningCount > 0 ? 'pulse 1.2s ease-in-out infinite' : 'none'
                        },
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.4, transform: 'scale(1.4)' }
                        }
                    }}
                >
                    <StyledFab size='small' color='secondary' aria-label='schedule-history' onClick={handleToggle}>
                        <IconHistory />
                    </StyledFab>
                </Badge>
            </Tooltip>

            <ScheduleHistoryDrawer open={open} chatflowid={chatflowid} onClose={() => setOpen(false)} />
        </>
    )
}

ScheduleHistoryFAB.propTypes = {
    chatflowid: PropTypes.string.isRequired,
    onOpenChange: PropTypes.func
}

export default ScheduleHistoryFAB
