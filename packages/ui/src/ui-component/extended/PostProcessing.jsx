import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box, Typography, OutlinedInput } from '@mui/material'
import { IconBulb, IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const sampleFunction = `let result\nconst main = () => {\n  result = $flow.rawOutput.replace("Alexandria", "Alexandria2") \n}\n\nawait main()\n\nreturn result;`

const PostProcessing = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [postProcessingEnabled, setPostProcessingEnabled] = useState(false)
    const [postProcessingFunction, setPostProcessingFunction] = useState('')
    const [chatbotConfig, setChatbotConfig] = useState({})

    const handleChange = (value) => {
        setPostProcessingEnabled(value)
    }

    const onSave = async () => {
        try {
            let value = {
                postProcessing: {
                    enabled: postProcessingEnabled,
                    customFunction: JSON.stringify(postProcessingFunction)
                }
            }
            chatbotConfig.postProcessing = value.postProcessing
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Post Processing Settings Saved',
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
                message: `Failed to save Post Processing Settings: ${
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
            if (chatbotConfig.postProcessing) {
                setPostProcessingEnabled(chatbotConfig.postProcessing.enabled)
                if (chatbotConfig.postProcessing.customFunction) {
                    setPostProcessingFunction(JSON.parse(chatbotConfig.postProcessing.customFunction))
                }
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <SwitchInput label='Enable Post Processing' onChange={handleChange} value={postProcessingEnabled} />
            </Box>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <Typography>JS Function</Typography>
                <OutlinedInput
                    id='custom-js-function'
                    type='text'
                    fullWidth
                    multiline={true}
                    minRows={4}
                    value={postProcessingFunction}
                    placeholder={sampleFunction}
                    name='form-title'
                    size='small'
                    onChange={(e) => {
                        setPostProcessingFunction(e.target.value)
                    }}
                />
            </Box>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 10,
                    background: '#d8f3dc',
                    padding: 10,
                    marginTop: 10
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}
                >
                    <IconBulb size={30} color='#2d6a4f' />
                    <span style={{ color: '#2d6a4f', marginLeft: 10, fontWeight: 500 }}>
                        The following variables are available to use in the custom function:{' '}
                        <pre>$flow.rawOutput, $flow.input, $flow.chatflowId, $flow.sessionId, $flow.chatId</pre>
                    </span>
                </div>
            </div>
            <StyledButton
                style={{ marginBottom: 10, marginTop: 10 }}
                variant='contained'
                disabled={!postProcessingFunction || postProcessingFunction?.trim().length === 0}
                onClick={onSave}
            >
                Save
            </StyledButton>
        </>
    )
}

PostProcessing.propTypes = {
    dialogProps: PropTypes.object
}

export default PostProcessing
