import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Button, IconButton, OutlinedInput, Box, List, InputAdornment } from '@mui/material'
import { IconX, IconTrash, IconPlus } from '@tabler/icons'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const AllowedDomains = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [inputFields, setInputFields] = useState([''])

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
                allowedOrigins: [...inputFields]
            }
            chatbotConfig.allowedOrigins = value.allowedOrigins
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Allowed Origins Saved',
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
                message: `Failed to save Allowed Origins: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
            } catch (e) {
                setInputFields([''])
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <span>Your chatbot will only work when used from the following domains.</span>
            </div>
            <Box sx={{ '& > :not(style)': { m: 1 }, pt: 2 }}>
                <List>
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
                </List>
            </Box>
            <StyledButton variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

AllowedDomains.propTypes = {
    dialogProps: PropTypes.object
}

export default AllowedDomains
