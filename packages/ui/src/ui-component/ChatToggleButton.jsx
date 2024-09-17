import PropTypes from 'prop-types'
import { useTheme } from '@mui/material/styles'
import { ButtonBase, Avatar } from '@mui/material'
import ChatBubbleIcon from '@/icons/ChatBubbleIcon'

const ChatToggleButton = ({ onClick }) => {
    const theme = useTheme()

    return (
        <ButtonBase
            sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                ml: 1,
                '&:hover': {
                    background: theme.palette.secondary.light
                }
            }}
            onClick={onClick}
        >
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
            >
                <ChatBubbleIcon width='1.3rem' height='1.3rem' />
            </Avatar>
        </ButtonBase>
    )
}

ChatToggleButton.propTypes = {
    onClick: PropTypes.func.isRequired
}

export default ChatToggleButton
