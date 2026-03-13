import { memo } from 'react'
import PropTypes from 'prop-types'
import { IconHelp } from '@tabler/icons-react'
import { Tooltip } from '@mui/material'
import { StyledFab } from '@/ui-component/button/StyledFab'

/**
 * Floating help button to trigger interactive canvas guide
 * Positioned at bottom-right of canvas
 */
const GuideButton = ({ onClick, variant = 'default' }) => {
    const isSparkle = variant === 'sparkle'

    return (
        <Tooltip title='Interactive Guide' placement='left'>
            <StyledFab
                sx={{
                    position: 'fixed',
                    right: 20,
                    bottom: 20,
                    zIndex: 1000,
                    background: isSparkle ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (theme) => theme.palette.primary.main,
                    color: 'white',
                    animation: isSparkle ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                    '&:hover': {
                        background: isSparkle ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' : (theme) => theme.palette.primary.dark,
                        transform: 'scale(1.1)'
                    },
                    '@keyframes pulse': {
                        '0%, 100%': {
                            transform: 'scale(1)',
                            boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)'
                        },
                        '50%': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 0 0 10px rgba(102, 126, 234, 0)'
                        }
                    }
                }}
                size='medium'
                color='primary'
                aria-label='interactive guide'
                onClick={onClick}
                data-onboarding='guide-button'
            >
                <IconHelp size={24} />
            </StyledFab>
        </Tooltip>
    )
}

GuideButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.oneOf(['default', 'sparkle'])
}

export default memo(GuideButton)
