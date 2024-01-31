import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from 'store/actions'

// material-ui
import {
    Typography,
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconX } from '@tabler/icons'

// Project import
import CredentialInputHandler from 'views/canvas/CredentialInputHandler'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from 'ui-component/switch/Switch'
import { Input } from 'ui-component/input/Input'
import { StyledButton } from 'ui-component/button/StyledButton'
import openAISVG from 'assets/images/openai.svg'
import assemblyAIPng from 'assets/images/assemblyai.png'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import useNotifier from 'utils/useNotifier'

// API
import chatflowsApi from 'api/chatflows'

const speechToTextProviders = [
    {
        label: 'OpenAI Whisper',
        name: 'openAIWhisper',
        icon: openAISVG,
        url: 'https://platform.openai.com/docs/guides/speech-to-text',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['openAIApi']
            },
            {
                label: 'On/Off',
                name: 'status',
                type: 'boolean',
                optional: true
            }
        ]
    },
    {
        label: 'Assembly AI',
        name: 'assemblyAiTranscribe',
        icon: assemblyAIPng,
        url: 'https://www.assemblyai.com/',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['assemblyAIApi']
            },
            {
                label: 'On/Off',
                name: 'status',
                type: 'boolean',
                optional: true
            }
        ]
    }
]

const SpeechToTextDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [speechToText, setSpeechToText] = useState({})
    const [providerExpanded, setProviderExpanded] = useState({})

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                speechToText: JSON.stringify(speechToText)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Speech To Text Configuration Saved',
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
                message: `Failed to save Speech To Text Configuration: ${errorData}`,
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

    const setValue = (value, providerName, inputParamName) => {
        let newVal = {}
        if (!Object.prototype.hasOwnProperty.call(speechToText, providerName)) {
            newVal = { ...speechToText, [providerName]: {} }
        } else {
            newVal = { ...speechToText }
        }

        newVal[providerName][inputParamName] = value
        if (inputParamName === 'status' && value === true) {
            //ensure that the others are turned off
            speechToTextProviders.forEach((provider) => {
                if (provider.name !== providerName) {
                    newVal[provider.name] = { ...speechToText[provider.name], status: false }
                }
            })
        }
        setSpeechToText(newVal)
    }

    const handleAccordionChange = (providerName) => (event, isExpanded) => {
        const accordionProviders = { ...providerExpanded }
        accordionProviders[providerName] = isExpanded
        setProviderExpanded(accordionProviders)
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.speechToText) {
            try {
                setSpeechToText(JSON.parse(dialogProps.chatflow.speechToText))
            } catch (e) {
                setSpeechToText({})
                console.error(e)
            }
        }

        return () => {
            setSpeechToText({})
            setProviderExpanded({})
        }
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
                Speech To Text Configuration
            </DialogTitle>
            <DialogContent>
                {speechToTextProviders.map((provider, index) => (
                    <Accordion
                        expanded={providerExpanded[provider.name] || false}
                        onChange={handleAccordionChange(provider.name)}
                        disableGutters
                        key={index}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={provider.name} id={provider.name}>
                            <ListItem style={{ padding: 0, margin: 0 }} alignItems='center'>
                                <ListItemAvatar>
                                    <div
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: '50%',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <img
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                padding: 10,
                                                objectFit: 'contain'
                                            }}
                                            alt='AI'
                                            src={provider.icon}
                                        />
                                    </div>
                                </ListItemAvatar>
                                <ListItemText
                                    sx={{ ml: 1 }}
                                    primary={provider.label}
                                    secondary={
                                        <a target='_blank' rel='noreferrer' href={provider.url}>
                                            {provider.url}
                                        </a>
                                    }
                                />
                                {speechToText[provider.name] && speechToText[provider.name].status && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignContent: 'center',
                                            alignItems: 'center',
                                            background: '#d8f3dc',
                                            borderRadius: 15,
                                            padding: 5,
                                            paddingLeft: 7,
                                            paddingRight: 7,
                                            marginRight: 10
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 15,
                                                height: 15,
                                                borderRadius: '50%',
                                                backgroundColor: '#70e000'
                                            }}
                                        />
                                        <span style={{ color: '#006400', marginLeft: 10 }}>ON</span>
                                    </div>
                                )}
                            </ListItem>
                        </AccordionSummary>
                        <AccordionDetails>
                            {provider.inputs.map((inputParam, index) => (
                                <Box key={index} sx={{ p: 2 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            {inputParam.label}
                                            {!inputParam.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                            {inputParam.description && (
                                                <TooltipWithParser style={{ marginLeft: 10 }} title={inputParam.description} />
                                            )}
                                        </Typography>
                                    </div>
                                    {providerExpanded[provider.name] && inputParam.type === 'credential' && (
                                        <CredentialInputHandler
                                            data={
                                                speechToText[provider.name] ? { credential: speechToText[provider.name].credentialId } : {}
                                            }
                                            inputParam={inputParam}
                                            onSelect={(newValue) => setValue(newValue, provider.name, 'credentialId')}
                                        />
                                    )}
                                    {inputParam.type === 'boolean' && (
                                        <SwitchInput
                                            onChange={(newValue) => setValue(newValue, provider.name, inputParam.name)}
                                            value={
                                                speechToText[provider.name]
                                                    ? speechToText[provider.name][inputParam.name]
                                                    : inputParam.default ?? false
                                            }
                                        />
                                    )}
                                    {providerExpanded[provider.name] &&
                                        (inputParam.type === 'string' ||
                                            inputParam.type === 'password' ||
                                            inputParam.type === 'number') && (
                                            <Input
                                                inputParam={inputParam}
                                                onChange={(newValue) => setValue(newValue, provider.name, inputParam.name)}
                                                value={
                                                    speechToText[provider.name]
                                                        ? speechToText[provider.name][inputParam.name]
                                                        : inputParam.default ?? ''
                                                }
                                            />
                                        )}
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                ))}
            </DialogContent>
            <DialogActions>
                <StyledButton variant='contained' onClick={onSave}>
                    Save
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

SpeechToTextDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default SpeechToTextDialog
