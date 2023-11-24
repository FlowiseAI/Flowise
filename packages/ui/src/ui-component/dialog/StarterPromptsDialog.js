import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from 'store/actions'

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
import { StyledButton } from 'ui-component/button/StyledButton'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import useNotifier from 'utils/useNotifier'

// API
import chatflowsApi from 'api/chatflows'

const StarterPromptsDialog = ({ show, dialogProps, onCancel, onConfirm = undefined }) => {
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

    const [chatbotConfig, setChatbotConfig] = useState({})

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
            let value = {
                starterPrompts: {
                    ...inputFields
                }
            }
            chatbotConfig.starterPrompts = value.starterPrompts
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
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
            if (onConfirm) {
                onConfirm()
            }
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
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            try {
                let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
                setChatbotConfig(chatbotConfig || {})
                if (chatbotConfig.starterPrompts) {
                    let inputFields = []
                    Object.getOwnPropertyNames(chatbotConfig.starterPrompts).forEach((key) => {
                        if (chatbotConfig.starterPrompts[key]) {
                            inputFields.push(chatbotConfig.starterPrompts[key])
                        }
                    })
                    setInputFields(inputFields)
                } else {
                    setInputFields([
                        {
                            prompt: ''
                        }
                    ])
                }
            } catch (e) {
                setInputFields([
                    {
                        prompt: ''
                    }
                ])
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
                <Box sx={{ '& > :not(style)': { m: 1 }, pt: 2 }}>
                    <List>
                        {inputFields.map((data, index) => {
                            return (
                                <div key={index} style={{ display: 'flex', width: '100%' }}>
                                    <Box sx={{ width: '90%', mb: 1 }}>
                                        <OutlinedInput
                                            sx={{ width: '100%' }}
                                            key={index}
                                            type='text'
                                            onChange={(e) => handleChange(index, e)}
                                            size='small'
                                            value={data.prompt}
                                            name='prompt'
                                            endAdornment={
                                                <InputAdornment position='end' sx={{ padding: '2px' }}>
                                                    <IconButton
                                                        size='small'
                                                        disabled={inputFields.length === 1}
                                                        onClick={removeInputFields}
                                                        edge='end'
                                                    >
                                                        <IconTrash />
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </Box>
                                    <Box sx={{ width: '10%' }}>
                                        {index === inputFields.length - 1 && (
                                            <IconButton onClick={addInputField}>
                                                <IconPlus />
                                            </IconButton>
                                        )}
                                    </Box>
                                    {/*<Box sx={{ width: '10%' }}>*/}
                                    {/*    {inputFields.length !== 1 && (*/}
                                    {/*        <IconButton onClick={removeInputFields}>*/}
                                    {/*            <IconTrash />*/}
                                    {/*        </IconButton>*/}
                                    {/*    )}*/}
                                    {/*</Box>*/}
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

StarterPromptsDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default StarterPromptsDialog
