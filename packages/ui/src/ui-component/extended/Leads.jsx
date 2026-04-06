import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box, OutlinedInput, Typography } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

// i18n
import { useTranslation } from 'react-i18next'

const Leads = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [leadsConfig, setLeadsConfig] = useState({})
    const [chatbotConfig, setChatbotConfig] = useState({})

    const handleChange = (key, value) => {
        setLeadsConfig({
            ...leadsConfig,
            [key]: value
        })
    }

    const onSave = async () => {
        try {
            let value = {
                leads: leadsConfig
            }
            chatbotConfig.leads = value.leads
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('components.leads.messages.success'),
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: t('components.leads.messages.error', { msg: errorData }),
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            setChatbotConfig(chatbotConfig || {})
            if (chatbotConfig.leads) {
                setLeadsConfig(chatbotConfig.leads)
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'start',
                    gap: 3,
                    mb: 2
                }}
            >
                <SwitchInput
                    label={t('components.leads.enableLeadCapture')}
                    onChange={(value) => handleChange('status', value)}
                    value={leadsConfig.status}
                />
                {leadsConfig && leadsConfig['status'] && (
                    <>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                            <Typography>{t('components.leads.form.title')}</Typography>
                            <OutlinedInput
                                id='form-title'
                                type='text'
                                fullWidth
                                multiline={true}
                                minRows={4}
                                value={leadsConfig.title}
                                placeholder={t('components.leads.form.placeholder')}
                                name='form-title'
                                size='small'
                                onChange={(e) => {
                                    handleChange('title', e.target.value)
                                }}
                            />
                        </Box>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                            <Typography>{t('components.leads.messageAfterLeadCaptured.title')}</Typography>
                            <OutlinedInput
                                id='success-message'
                                type='text'
                                fullWidth
                                multiline={true}
                                minRows={4}
                                value={leadsConfig.successMessage}
                                placeholder={t('components.leads.messageAfterLeadCaptured.placeholder')}
                                name='form-title'
                                size='small'
                                onChange={(e) => {
                                    handleChange('successMessage', e.target.value)
                                }}
                            />
                        </Box>
                        <Typography variant='h4'>{t('components.leads.formFields')}</Typography>
                        <Box sx={{ width: '100%' }}>
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                <SwitchInput
                                    label={t('common.labels.name')}
                                    onChange={(value) => handleChange('name', value)}
                                    value={leadsConfig.name}
                                />
                                <SwitchInput
                                    label={t('common.labels.email')}
                                    onChange={(value) => handleChange('email', value)}
                                    value={leadsConfig.email}
                                />
                                <SwitchInput
                                    label={t('common.labels.phone')}
                                    onChange={(value) => handleChange('phone', value)}
                                    value={leadsConfig.phone}
                                />
                            </Box>
                        </Box>
                    </>
                )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton
                    disabled={!leadsConfig['name'] && !leadsConfig['phone'] && !leadsConfig['email'] && leadsConfig['status']}
                    variant='contained'
                    onClick={onSave}
                    sx={{ minWidth: 100 }}
                >
                    {t('common.actions.save')}
                </StyledButton>
            </Box>
        </>
    )
}

Leads.propTypes = {
    dialogProps: PropTypes.object
}

export default Leads
