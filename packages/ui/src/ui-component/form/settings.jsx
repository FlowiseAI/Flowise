import { useTheme } from '@mui/material/styles'
import { Box, Typography } from '@mui/material'
import { gridSpacing } from '@/store/constant'
import PropTypes from 'prop-types'

const SettingsSection = ({ action, children, title }) => {
    const theme = useTheme()

    return (
        <Box
            sx={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                border: 1,
                borderColor: theme.palette.grey[900] + 25,
                borderRadius: 2
            }}
        >
            <Box
                sx={{
                    gridColumn: 'span 2 / span 2',
                    px: 2.5,
                    py: 2,
                    borderBottom: 1,
                    borderColor: theme.palette.grey[900] + 25
                }}
            >
                <Typography sx={{ m: 0 }} variant='h3'>
                    {title}
                </Typography>
            </Box>
            <Box
                sx={{
                    gridColumn: 'span 2 / span 2',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: gridSpacing
                }}
            >
                {children}
            </Box>
            {action && (
                <Box
                    sx={{
                        gridColumn: 'span 2 / span 2',
                        px: 2.5,
                        py: 2,
                        borderTop: 1,
                        borderColor: theme.palette.grey[900] + 25
                    }}
                >
                    {action}
                </Box>
            )}
        </Box>
    )
}

SettingsSection.propTypes = {
    action: PropTypes.node,
    children: PropTypes.node,
    title: PropTypes.string
}

export default SettingsSection
