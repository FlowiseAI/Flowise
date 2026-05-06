import PropTypes from 'prop-types'
import moment from 'moment'
import { useSelector } from 'react-redux'
import { Box, CircularProgress, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconClock } from '@tabler/icons-react'

const ACTIVE = {
    light: { bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#22c55e' },
    dark: { bg: 'rgba(34, 197, 94, 0.16)', text: '#86efac', border: 'rgba(134, 239, 172, 0.35)', dot: '#22c55e' }
}

const PAUSED = {
    light: { bg: 'rgba(0, 0, 0, 0.04)', text: 'rgba(0, 0, 0, 0.6)', border: 'rgba(0, 0, 0, 0.12)' },
    dark: { bg: 'rgba(255, 255, 255, 0.06)', text: 'rgba(255, 255, 255, 0.65)', border: 'rgba(255, 255, 255, 0.18)' }
}

const ScheduleStatusBadge = ({ scheduleStatus, size = 'md' }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    if (!scheduleStatus?.isScheduled) return null

    const isLoading = scheduleStatus.loading === true
    const isActive = !isLoading && scheduleStatus.enabled === true
    const palette = customization.isDarkMode ? 'dark' : 'light'
    const colors = isActive ? ACTIVE[palette] : PAUSED[palette]

    const tooltipText = isLoading
        ? 'Checking schedule status…'
        : isActive
        ? scheduleStatus.nextRunAt
            ? `Schedule active — next run ${moment(scheduleStatus.nextRunAt).format('MMM D, YYYY h:mm A')}`
            : 'Schedule active'
        : 'Schedule configured but turned off'

    const dims =
        size === 'sm'
            ? { px: 0.875, py: 0.25, fontSize: '0.65rem', dot: 5, icon: 10, gap: 0.625 }
            : { px: 1, py: 0.375, fontSize: '0.7rem', dot: 6, icon: 11, gap: 0.75 }

    return (
        <Tooltip title={tooltipText} placement='top' arrow>
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: dims.gap,
                    px: dims.px,
                    py: dims.py,
                    borderRadius: '999px',
                    fontSize: dims.fontSize,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    color: colors.text,
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    cursor: 'default',
                    userSelect: 'none',
                    flexShrink: 0,
                    transition: theme.transitions.create(['background-color', 'border-color'])
                }}
            >
                {isLoading ? (
                    <CircularProgress size={dims.icon} thickness={5} sx={{ color: colors.text }} />
                ) : isActive ? (
                    <Box
                        component='span'
                        sx={{
                            width: dims.dot,
                            height: dims.dot,
                            borderRadius: '50%',
                            backgroundColor: colors.dot,
                            boxShadow: `0 0 0 0 ${colors.dot}`,
                            animation: 'scheduleStatusPulse 1.8s ease-out infinite',
                            '@keyframes scheduleStatusPulse': {
                                '0%': { boxShadow: `0 0 0 0 ${colors.dot}99` },
                                '70%': { boxShadow: `0 0 0 6px ${colors.dot}00` },
                                '100%': { boxShadow: `0 0 0 0 ${colors.dot}00` }
                            }
                        }}
                    />
                ) : (
                    <IconClock size={dims.icon} stroke={2} />
                )}
                {isLoading ? 'Loading…' : isActive ? 'Scheduled' : 'Paused'}
            </Box>
        </Tooltip>
    )
}

ScheduleStatusBadge.propTypes = {
    scheduleStatus: PropTypes.shape({
        isScheduled: PropTypes.bool,
        enabled: PropTypes.bool,
        nextRunAt: PropTypes.string,
        cronExpression: PropTypes.string,
        loading: PropTypes.bool
    }),
    size: PropTypes.oneOf(['sm', 'md'])
}

export default ScheduleStatusBadge
