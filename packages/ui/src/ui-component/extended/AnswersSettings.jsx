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
import merge from 'lodash/merge'

const AnswersSettings = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state.canvas.chatflow)

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [answersConfig, setAnswersConfig] = useState(
        merge(
            {
                workflowVisibility: ['Private']
            },
            chatflow.answersConfig ? JSON.parse(chatflow.answersConfig) : {}
        )
    )

    const handleChange = useCallback(
        (event, fieldName, option) => {
            const updatedOptions = answersConfig[fieldName] || []
            if (event.target.checked) {
                if (!updatedOptions.includes(option)) {
                    updatedOptions.push(option)
                }
            } else {
                const index = updatedOptions.indexOf(option)
                if (index > -1) {
                    updatedOptions.splice(index, 1)
                }
            }
            setAnswersConfig({ ...answersConfig, [fieldName]: updatedOptions })
        },
        [answersConfig]
    )

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                answersConfig: JSON.stringify(answersConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Answers Settings Saved',
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
                message: `Failed to save Answers Settings: ${errorData}`,
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
        if (dialogProps.chatflow && dialogProps.chatflow.answersConfig) {
            let answersConfig = merge(
                {
                    workflowVisibility: ['Private']
                },
                dialogProps.chatflow.answersConfig ? JSON.parse(dialogProps.chatflow.answersConfig) : {}
            )

            setAnswersConfig(answersConfig || {})
        }

        return () => {}
    }, [dialogProps])
    console.log('AnswerSettings', { answersConfig })
    return (
        <>
            <Typography variant='h4' sx={{ mb: 1 }}>
                Workflow visibility
                <TooltipWithParser style={{ mb: 1, mt: 2, marginLeft: 10 }} title={'Control visibility and organization permissions'} />
            </Typography>
            <FormControl component='fieldset' sx={{ width: '100%', mb: 2 }}>
                <FormGroup>
                    <FormControlLabel
                        disabled
                        sx={{ '.MuiFormControlLabel-label.Mui-disabled': { color: 'rgba(255, 255, 255, 0.38)' } }}
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('Private') ?? true}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'Private')}
                            />
                        }
                        label='Private'
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('Organization')}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'Organization')}
                            />
                        }
                        label='Organization'
                    />
                    {/* <FormControlLabel
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('API')}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'API')}
                            />
                        }
                        label='API'
                    /> */}
                    {/* <FormControlLabel
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('Embedded')}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'Embedded')}
                            />
                        }
                        label='Embedded'
                    /> */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('AnswerAI')}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'AnswerAI')}
                            />
                        }
                        label='AnswerAI'
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={answersConfig?.workflowVisibility?.includes('Browser Extension')}
                                onChange={(event) => handleChange(event, 'workflowVisibility', 'Browser Extension')}
                            />
                        }
                        label='Browser Extension'
                    />
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
