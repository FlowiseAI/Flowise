import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase, Typography, Stack } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

// icons
import { IconCopy, IconChevronLeft } from '@tabler/icons-react'
import { Available } from '@/ui-component/rbac/available'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| CANVAS HEADER ||============================== //

const MarketplaceCanvasHeader = ({ flowName, flowData, onChatflowCopy }) => {
    const { t } = useTranslation()
    const theme = useTheme()
    const navigate = useNavigate()

    return (
        <>
            <Box>
                <ButtonBase title={t('marketplaces.actions.back')} sx={{ borderRadius: '50%' }}>
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
                        color='inherit'
                        onClick={() => navigate(-1)}
                    >
                        <IconChevronLeft stroke={1.5} size='1.3rem' />
                    </Avatar>
                </ButtonBase>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <Stack flexDirection='row'>
                    <Typography
                        sx={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            ml: 2
                        }}
                    >
                        {flowName}
                    </Typography>
                </Stack>
            </Box>
            <Available permission={'chatflows:create,agentflows.create'}>
                <Box>
                    <StyledButton
                        color='secondary'
                        variant='contained'
                        title={t('marketplaces.actions.useChatflow')}
                        onClick={() => onChatflowCopy(flowData)}
                        startIcon={<IconCopy />}
                    >
                        {t('marketplaces.actions.useTemplate')}
                    </StyledButton>
                </Box>
            </Available>
        </>
    )
}

MarketplaceCanvasHeader.propTypes = {
    flowName: PropTypes.string,
    flowData: PropTypes.object,
    onChatflowCopy: PropTypes.func
}

export default MarketplaceCanvasHeader
