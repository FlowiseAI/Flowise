import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box, OutlinedInput, Typography } from '@mui/material'
import { IconX } from '@tabler/icons'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const Leads = ({ dialogProps }) => {
    const dispatch = useDispatch()

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
                    message: 'Leads configuration Saved',
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
                message: `Failed to save Leads configuration: ${errorData}`,
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
                <SwitchInput label='Enable Lead Capture' onChange={(value) => handleChange('status', value)} value={leadsConfig.status} />
                <Typography variant='h4'>Form fields</Typography>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                        <Typography>Title</Typography>
                        <OutlinedInput
                            id='form-title'
                            type='text'
                            fullWidth
                            value={leadsConfig.title}
                            placeholder='Let us know where we can reach you'
                            name='form-title'
                            onChange={(e) => {
                                handleChange('title', e.target.value)
                            }}
                        />
                    </Box>
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                        <SwitchInput label='Name' onChange={(value) => handleChange('name', value)} value={leadsConfig.name} />
                        <SwitchInput label='Email Address' onChange={(value) => handleChange('email', value)} value={leadsConfig.email} />
                        <SwitchInput label='Phone' onChange={(value) => handleChange('phone', value)} value={leadsConfig.phone} />
                    </Box>
                </Box>
                {/*<Typography variant='h4'>Configuration</Typography>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>Trigger</Typography>
                        <FormControl sx={{ width: '160px' }}>
                            <Select
                                value={leadsConfig.trigger || 'chatStart'}
                                onChange={(event) => handleChange('trigger', event.target.value)}
                            >
                                <MenuItem value='chatStart'>Chat Start</MenuItem>
                                <MenuItem value='chatEnd'>Chat End</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    {leadsConfig.trigger === 'chatEnd' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Typography>Time to wait (in minutes)</Typography>
                            <OutlinedInput
                                id='chatEndTimeout'
                                type='number'
                                value={leadsConfig.chatEndTimeout}
                                placeholder='2 minutes'
                                name='chatEndTimeout'
                                onChange={(e) => {
                                    handleChange('chatEndTimeout', e.target.value)
                                }}
                            />
                        </Box>
                    )}
                </Box>*/}
            </Box>
            <StyledButton style={{ marginBottom: 10, marginTop: 10 }} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

Leads.propTypes = {
    dialogProps: PropTypes.object
}

export default Leads
