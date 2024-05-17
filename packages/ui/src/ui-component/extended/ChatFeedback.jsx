import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const ChatFeedback = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [chatFeedbackStatus, setChatFeedbackStatus] = useState(false)
    const [chatbotConfig, setChatbotConfig] = useState({})

    const handleChange = (value) => {
        setChatFeedbackStatus(value)
    }

    const onSave = async () => {
        try {
            let value = {
                chatFeedback: {
                    status: chatFeedbackStatus
                }
            }
            chatbotConfig.chatFeedback = value.chatFeedback
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Chat Feedback Settings Saved',
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
                message: `Failed to save Chat Feedback Settings: ${
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
            let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            setChatbotConfig(chatbotConfig || {})
            if (chatbotConfig.chatFeedback) {
                setChatFeedbackStatus(chatbotConfig.chatFeedback.status)
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <SwitchInput label='Enable chat feedback' onChange={handleChange} value={chatFeedbackStatus} />
            </Box>
            <StyledButton style={{ marginBottom: 10, marginTop: 10 }} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

ChatFeedback.propTypes = {
    dialogProps: PropTypes.object
}

export default ChatFeedback
