import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import {
    Button,
    IconButton,
    Dialog,
    DialogContent,
    OutlinedInput,
    DialogTitle,
    DialogActions,
    Box,
    List,
    InputAdornment
} from '@mui/material'
import { IconX, IconTrash, IconPlus } from '@tabler/icons'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'

// store
import {
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction,
    SET_CHATFLOW,
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG
} from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const AllowedDomainsDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
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
            onConfirm()
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Allowed Origins: ${errorData}`,
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

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title || 'Allowed Origins'}
            </DialogTitle>
            <DialogContent>
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
                    </List>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton variant='contained' onClick={onSave}>
                    Save
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AllowedDomainsDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AllowedDomainsDialog
