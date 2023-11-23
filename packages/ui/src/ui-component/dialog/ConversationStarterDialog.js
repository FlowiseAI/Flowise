import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from 'store/actions'

// material-ui
import { Button, IconButton, Dialog, DialogContent, OutlinedInput, DialogTitle, DialogActions, Box, List, Divider } from '@mui/material'
import { IconX, IconTrash, IconPlus } from '@tabler/icons'

// Project import
import { StyledButton } from 'ui-component/button/StyledButton'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import useNotifier from 'utils/useNotifier'

// API
import chatflowsApi from 'api/chatflows'

const ConversationStarterDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [inputFields, setInputFields] = useState([
        {
            prompt: ''
        }
    ])

    const addInputField = () => {
        setInputFields([
            ...inputFields,
            {
                prompt: ''
            }
        ])
    }
    const removeInputFields = (index) => {
        const rows = [...inputFields]
        rows.splice(index, 1)
        setInputFields(rows)
    }

    const handleChange = (index, evnt) => {
        const { name, value } = evnt.target
        const list = [...inputFields]
        list[index][name] = value
        setInputFields(list)
    }

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: {
                    starterPrompts: JSON.stringify(inputFields)
                }
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Conversation Starter Prompts Saved',
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
            onCancel()
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Conversation Starter Prompts: ${errorData}`,
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
        if (dialogProps.chatflow && dialogProps.chatbotConfig.starterPrompts) {
            try {
                setInputFields(JSON.parse(dialogProps.chatbotConfig.starterPrompts))
            } catch (e) {
                setInputFields([
                    {
                        prompt: ''
                    }
                ])
                console.error(e)
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
                {dialogProps.title || 'Conversation Starter Prompts'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <List>
                        {inputFields.map((data, index) => {
                            return (
                                <div key={index} style={{ display: 'flex', width: '100%', flexDirection: 'row' }}>
                                    <Box sx={{ width: '85%', mb: 1 }}>
                                        <OutlinedInput
                                            sx={{ width: '100%' }}
                                            key={index}
                                            type='text'
                                            onChange={(e) => handleChange(index, e)}
                                            value={data.prompt}
                                            name='prompt'
                                        />
                                    </Box>
                                    <Box sx={{ width: '10%' }}>
                                        {inputFields.length !== 1 && (
                                            <IconButton onClick={removeInputFields}>
                                                <IconTrash />
                                            </IconButton>
                                        )}
                                    </Box>
                                    <Box sx={{ width: '10%' }}>
                                        {index === inputFields.length - 1 && (
                                            <IconButton onClick={addInputField}>
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
                <Divider />
                <StyledButton variant='contained' color={'error'} onClick={onCancel}>
                    Cancel
                </StyledButton>
                <StyledButton variant='contained' onClick={onSave}>
                    Save
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ConversationStarterDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default ConversationStarterDialog
