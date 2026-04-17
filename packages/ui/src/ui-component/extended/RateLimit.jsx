import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import PropTypes from 'prop-types'

import { Typography, Button, OutlinedInput, Stack, Box } from '@mui/material'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'

// Icons
import { IconX } from '@tabler/icons-react'

// API
import chatflowsApi from '@/api/chatflows'

// utils
import useNotifier from '@/utils/useNotifier'

// i18n
import { useTranslation, Trans } from 'react-i18next'

const RateLimit = ({ dialogProps, hideTitle = false }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [rateLimitStatus, setRateLimitStatus] = useState(apiConfig?.rateLimit?.status !== undefined ? apiConfig.rateLimit.status : false)
    const [limitMax, setLimitMax] = useState(apiConfig?.rateLimit?.limitMax ?? '')
    const [limitDuration, setLimitDuration] = useState(apiConfig?.rateLimit?.limitDuration ?? '')
    const [limitMsg, setLimitMsg] = useState(apiConfig?.rateLimit?.limitMsg ?? '')

    const formatObj = () => {
        let apiConfig = JSON.parse(dialogProps.chatflow.apiConfig)
        if (apiConfig === null || apiConfig === undefined) {
            apiConfig = {}
        }
        let obj = { status: rateLimitStatus }

        if (rateLimitStatus) {
            const rateLimitValuesBoolean = [!limitMax, !limitDuration, !limitMsg]
            const rateLimitFilledValues = rateLimitValuesBoolean.filter((value) => value === false)
            if (rateLimitFilledValues.length >= 1 && rateLimitFilledValues.length <= 2) {
                throw new Error('Need to fill all rate limit input fields')
            } else if (rateLimitFilledValues.length === 3) {
                obj = {
                    ...obj,
                    limitMax,
                    limitDuration,
                    limitMsg
                }
            }
        }
        apiConfig.rateLimit = obj
        return apiConfig
    }

    const handleChange = (value) => {
        setRateLimitStatus(value)
    }

    const checkDisabled = () => {
        if (rateLimitStatus) {
            if (limitMax === '' || limitDuration === '' || limitMsg === '') {
                return true
            }
        }
        return false
    }

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, {
                apiConfig: JSON.stringify(formatObj())
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('components.rateLimit.messages.success'),
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
            enqueueSnackbar({
                message: t('components.rateLimit.messages.error', {
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

    const onTextChanged = (value, fieldName) => {
        switch (fieldName) {
            case 'limitMax':
                setLimitMax(value)
                break
            case 'limitDuration':
                setLimitDuration(value)
                break
            case 'limitMsg':
                setLimitMsg(value)
                break
        }
    }

    const textField = (message, fieldName, fieldLabel, fieldType = 'string', placeholder = '') => {
        return (
            <Stack direction='column' spacing={1}>
                <Typography>{fieldLabel}</Typography>
                <OutlinedInput
                    id={fieldName}
                    type={fieldType}
                    fullWidth
                    value={message}
                    placeholder={placeholder}
                    name={fieldName}
                    size='small'
                    onChange={(e) => {
                        onTextChanged(e.target.value, fieldName)
                    }}
                />
            </Stack>
        )
    }

    return (
        <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
            {!hideTitle && (
                <Typography variant='h3'>
                    {t('components.rateLimit.title')}
                    <TooltipWithParser
                        style={{ marginLeft: 10 }}
                        title={
                            <Trans
                                i18nKey='components.rateLimit.docsHelp'
                                components={{
                                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                                    a: <a href='https://docs.flowiseai.com/configuration/rate-limit' target='_blank' rel='noreferrer' />
                                }}
                            />
                        }
                    />
                </Typography>
            )}
            <SwitchInput label={t('components.rateLimit.enableLabel')} onChange={handleChange} value={rateLimitStatus} />
            {rateLimitStatus && (
                <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                    {textField(limitMax, 'limitMax', t('components.rateLimit.limitMax'), 'number', '5')}
                    {textField(limitDuration, 'limitDuration', t('components.rateLimit.limitDuration'), 'number', '60')}
                    {textField(
                        limitMsg,
                        'limitMsg',
                        t('components.rateLimit.limitMsg.title'),
                        'string',
                        t('components.rateLimit.limitMsg.placeholder')
                    )}
                </Stack>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton disabled={checkDisabled()} variant='contained' onClick={() => onSave()} sx={{ minWidth: 100 }}>
                    {t('common.actions.save')}
                </StyledButton>
            </Box>
        </Stack>
    )
}

RateLimit.propTypes = {
    isSessionMemory: PropTypes.bool,
    dialogProps: PropTypes.object,
    hideTitle: PropTypes.bool
}

export default RateLimit
