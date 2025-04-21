import PropTypes from 'prop-types'
import { forwardRef } from 'react'

// material-ui
import { Avatar, ButtonBase } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// assets
import { IconSettings } from '@tabler/icons-react'

const ProfileAvatar = forwardRef(({ handleToggle }, ref) => {
    const theme = useTheme()

    return (
        <ButtonBase ref={ref} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Avatar
                variant='rounded'
                sx={{
                    ...theme.typography.commonAvatar,
                    ...theme.typography.mediumAvatar,
                    transition: 'all .2s ease-in-out',
                    background: theme.palette.secondary.light,
                    color: theme.palette.secondary.dark,
                    '&:hover': {
                        background: theme.palette.secondary.dark,
                        color: theme.palette.secondary.light
                    }
                }}
                onClick={handleToggle}
                color='inherit'
            >
                <IconSettings stroke={1.5} size='1.3rem' />
            </Avatar>
        </ButtonBase>
    )
})

ProfileAvatar.propTypes = {
    handleToggle: PropTypes.func
}

ProfileAvatar.displayName = 'ProfileAvatar'

export default ProfileAvatar
