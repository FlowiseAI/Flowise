import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Button, IconButton, OutlinedInput, Box, InputAdornment, Stack, Typography } from '@mui/material'
import { IconX, IconTrash, IconPlus } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

// i18n
import { useTranslation } from 'react-i18next'

const AllowedDomains = ({ dialogProps, onConfirm, hideTitle = false }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [inputFields, setInputFields] = useState([''])
    const [errorMessage, setErrorMessage] = useState('')

    const [chatbotConfig, setChatbotConfig] = useState({})

    const addInputField = () => {
        setInputFields([...inputFields, ''])
    }
    const removeInputFields = (index) => {
        const rows = [...inputFields]
        rows.splice(index, 1)
        setInputFields(rows)
    }

    const handleChange = (index, evnt) => {
        const { value } = evnt.target
        const list = [...inputFields]
        list[index] = value
        setInputFields(list)
    }

    const onSave = async () => {
        try {
            let value = {
                allowedOrigins: [...inputFields],
                allowedOriginsError: errorMessage
            }
            chatbotConfig.allowedOrigins = value.allowedOrigins
            chatbotConfig.allowedOriginsError = value.allowedOriginsError

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('components.allowedDomains.messages.saved'),
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
                onConfirm?.()
            }
        } catch (error) {
            enqueueSnackbar({
                message: t('components.allowedDomains.messages.failed', {
                    msg: typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }),
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
            try {
                let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
                setChatbotConfig(chatbotConfig || {})
                if (chatbotConfig.allowedOrigins) {
                    let inputFields = [...chatbotConfig.allowedOrigins]
                    setInputFields(inputFields)
                } else {
                    setInputFields([''])
                }
                if (chatbotConfig.allowedOriginsError) {
                    setErrorMessage(chatbotConfig.allowedOriginsError)
                } else {
                    setErrorMessage('')
                }
            } catch (e) {
                setInputFields([''])
                setErrorMessage('')
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
            {!hideTitle && (
                <Typography variant='h3'>
                    {t('components.allowedDomains.title')}
                    <TooltipWithParser style={{ mb: 1, mt: 2, marginLeft: 10 }} title={t('components.allowedDomains.tooltip')} />
                </Typography>
            )}
            <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                <Stack direction='column' spacing={2}>
                    <Typography>{t('components.allowedDomains.shortTitle')}</Typography>
                    {inputFields.map((origin, index) => {
                        return (
                            <div key={index} style={{ display: 'flex', width: '100%' }}>
                                <Box sx={{ width: '100%', mb: 1 }}>
                                    <OutlinedInput
                                        sx={{ width: '100%' }}
                                        key={index}
                                        type='text'
                                        onChange={(e) => handleChange(index, e)}
                                        size='small'
                                        value={origin}
                                        name='origin'
                                        placeholder='https://example.com'
                                        endAdornment={
                                            <InputAdornment position='end' sx={{ padding: '2px' }}>
                                                {inputFields.length > 1 && (
                                                    <IconButton
                                                        sx={{ height: 30, width: 30 }}
                                                        size='small'
                                                        color='error'
                                                        disabled={inputFields.length === 1}
                                                        onClick={() => removeInputFields(index)}
                                                        edge='end'
                                                    >
                                                        <IconTrash />
                                                    </IconButton>
                                                )}
                                            </InputAdornment>
                                        }
                                    />
                                </Box>
                                <Box sx={{ width: '5%', mb: 1 }}>
                                    {index === inputFields.length - 1 && (
                                        <IconButton color='primary' onClick={addInputField}>
                                            <IconPlus />
                                        </IconButton>
                                    )}
                                </Box>
                            </div>
                        )
                    })}
                </Stack>
                <Stack direction='column' spacing={1}>
                    <Typography>
                        {t('components.allowedDomains.error.title')}
                        <TooltipWithParser style={{ mb: 1, mt: 2, marginLeft: 10 }} title={t('components.allowedDomains.error.tooltip')} />
                    </Typography>
                    <OutlinedInput
                        sx={{ width: '100%' }}
                        type='text'
                        size='small'
                        fullWidth
                        placeholder={t('components.allowedDomains.error.placeholder')}
                        value={errorMessage}
                        onChange={(e) => {
                            setErrorMessage(e.target.value)
                        }}
                    />
                </Stack>
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton variant='contained' onClick={onSave} sx={{ minWidth: 100 }}>
                    {t('components.allowedDomains.actions.save')}
                </StyledButton>
            </Box>
        </Stack>
    )
}

AllowedDomains.propTypes = {
    dialogProps: PropTypes.object,
    onConfirm: PropTypes.func,
    hideTitle: PropTypes.bool
}

export default AllowedDomains
