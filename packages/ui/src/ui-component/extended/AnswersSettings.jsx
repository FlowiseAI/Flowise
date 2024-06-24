import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Button, Box, Typography, FormGroup, FormLabel, FormControl, FormControlLabel, Checkbox } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'
import { TooltipWithParser } from '../tooltip/TooltipWithParser'

const AnswersSettings = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state.canvas.chatflow)

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [visibility, setVisibility] = useState(chatflow.visibility || ['Private'])

    const handleChange = useCallback(
        (event, option) => {
            const updatedVisibility = visibility.includes(option) ? visibility.filter((v) => v !== option) : [...visibility, option]
            setVisibility(updatedVisibility)
        },
        [visibility]
    )

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                visibility: visibility
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Workflow Visibility Saved',
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
            console.log(error)
            enqueueSnackbar({
                message: `Failed to save Workflow Visibility: ${errorData}`,
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
        if (dialogProps.chatflow && dialogProps.chatflow.visibility) {
            setVisibility(dialogProps.chatflow.visibility || ['Private'])
        }
    }, [dialogProps])

    return (
        <>
            <Typography variant='h4' sx={{ mb: 1 }}>
                Workflow visibility
                <TooltipWithParser style={{ mb: 1, mt: 2, marginLeft: 10 }} title={'Control visibility and organization permissions'} />
            </Typography>
            <FormControl component='fieldset' sx={{ width: '100%', mb: 2 }}>
                <FormGroup>
                    {['Private', 'Organization', 'AnswerAI', 'Marketplace', 'Browser Extension'].map((type) => (
                        <FormControlLabel
                            key={type}
                            disabled={type === 'Private'}
                            control={<Checkbox checked={visibility.includes(type)} onChange={(event) => handleChange(event, type)} />}
                            label={type}
                        />
                    ))}
                </FormGroup>
            </FormControl>
            <StyledButton variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}
AnswersSettings.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AnswersSettings
