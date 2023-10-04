import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from 'store/actions'
import PropTypes from 'prop-types'

import { Box, Typography, Button, OutlinedInput } from '@mui/material'

// Project import
import { StyledButton } from 'ui-component/button/StyledButton'

// Icons
import { IconX } from '@tabler/icons'

// API
import chatflowsApi from 'api/chatflows'

// utils
import useNotifier from 'utils/useNotifier'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'

const Configuration = () => {
    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [limitMax, setLimitMax] = useState(apiConfig?.rateLimit?.limitMax ?? '')
    const [limitDuration, setLimitDuration] = useState(apiConfig?.rateLimit?.limitDuration ?? '')
    const [limitMsg, setLimitMsg] = useState(apiConfig?.rateLimit?.limitMsg ?? '')

    const formatObj = () => {
        const obj = {
            rateLimit: {}
        }
        const rateLimitValuesBoolean = [!limitMax, !limitDuration, !limitMsg]
        const rateLimitFilledValues = rateLimitValuesBoolean.filter((value) => value === false)
        if (rateLimitFilledValues.length >= 1 && rateLimitFilledValues.length <= 2) {
            throw new Error('Need to fill all rate limit input fields')
        } else if (rateLimitFilledValues.length === 3) {
            obj.rateLimit = {
                limitMax,
                limitDuration,
                limitMsg
            }
        }

        return obj
    }

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, {
                apiConfig: JSON.stringify(formatObj())
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'API Configuration Saved',
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
            console.error(error)
            const errorData = error.response
                ? error.response.data || `${error.response.status}: ${error.response.statusText}`
                : error.message
            enqueueSnackbar({
                message: `Failed to save API Configuration: ${errorData}`,
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
            <Box sx={{ pt: 2, pb: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography sx={{ mb: 1 }}>{fieldLabel}</Typography>
                    <OutlinedInput
                        id={fieldName}
                        type={fieldType}
                        fullWidth
                        value={message}
                        placeholder={placeholder}
                        name={fieldName}
                        onChange={(e) => {
                            onTextChanged(e.target.value, fieldName)
                        }}
                    />
                </div>
            </Box>
        )
    }

    return (
        <>
            {/*Rate Limit*/}
            <Typography variant='h4' sx={{ mb: 1, mt: 2 }}>
                Rate Limit{' '}
                <TooltipWithParser
                    style={{ mb: 1, mt: 2, marginLeft: 10 }}
                    title={
                        'Visit <a target="_blank" href="https://docs.flowiseai.com/rate-limit">Rate Limit Setup Guide</a> to set up Rate Limit correctly in your hosting environment.'
                    }
                />
            </Typography>
            {textField(limitMax, 'limitMax', 'Message Limit per Duration', 'number')}
            {textField(limitDuration, 'limitDuration', 'Duration in Second', 'number')}
            {textField(limitMsg, 'limitMsg', 'Limit Message', 'string')}

            <StyledButton style={{ marginBottom: 10, marginTop: 10 }} variant='contained' onClick={() => onSave()}>
                Save Changes
            </StyledButton>
        </>
    )
}

Configuration.propTypes = {
    isSessionMemory: PropTypes.bool
}

export default Configuration
