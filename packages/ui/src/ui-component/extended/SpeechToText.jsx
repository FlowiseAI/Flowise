import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Typography, Box, Button, FormControl, ListItem, ListItemAvatar, ListItemText, MenuItem, Select } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { Input } from '@/ui-component/input/Input'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import openAISVG from '@/assets/images/openai.svg'
import assemblyAIPng from '@/assets/images/assemblyai.png'
import localAiPng from '@/assets/images/localai.png'
import azureSvg from '@/assets/images/azure_openai.svg'
import groqPng from '@/assets/images/groq.png'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

// If implementing a new provider, this must be updated in
// components/src/speechToText.ts as well
const SpeechToTextType = {
    OPENAI_WHISPER: 'openAIWhisper',
    ASSEMBLYAI_TRANSCRIBE: 'assemblyAiTranscribe',
    LOCALAI_STT: 'localAISTT',
    AZURE_COGNITIVE: 'azureCognitive',
    GROQ_WHISPER: 'groqWhisper'
}

// Weird quirk - the key must match the name property value.
const speechToTextProviders = {
    [SpeechToTextType.OPENAI_WHISPER]: {
        label: 'OpenAI Whisper',
        name: SpeechToTextType.OPENAI_WHISPER,
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
                label: 'Language',
                name: 'language',
                type: 'string',
                description:
                    'The language of the input audio. Supplying the input language in ISO-639-1 format will improve accuracy and latency.',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: `An optional text to guide the model's style or continue a previous audio segment. The prompt should match the audio language.`,
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: `The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.`,
                optional: true
            }
        ]
    },
    [SpeechToTextType.ASSEMBLYAI_TRANSCRIBE]: {
        label: 'Assembly AI',
        name: SpeechToTextType.ASSEMBLYAI_TRANSCRIBE,
        icon: assemblyAIPng,
        url: 'https://www.assemblyai.com/',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['assemblyAIApi']
            }
        ]
    },
    [SpeechToTextType.LOCALAI_STT]: {
        label: 'LocalAi STT',
        name: SpeechToTextType.LOCALAI_STT,
        icon: localAiPng,
        url: 'https://localai.io/features/audio-to-text/',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['localAIApi']
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                description: 'The base URL of the local AI server'
            },
            {
                label: 'Language',
                name: 'language',
                type: 'string',
                description:
                    'The language of the input audio. Supplying the input language in ISO-639-1 format will improve accuracy and latency.',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                description: `The STT model to load. Defaults to whisper-1 if left blank.`,
                placeholder: 'whisper-1',
                optional: true
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: `An optional text to guide the model's style or continue a previous audio segment. The prompt should match the audio language.`,
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: `The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.`,
                optional: true
            }
        ]
    },
    [SpeechToTextType.AZURE_COGNITIVE]: {
        label: 'Azure Cognitive Services',
        name: SpeechToTextType.AZURE_COGNITIVE,
        icon: azureSvg,
        url: 'https://azure.microsoft.com/en-us/products/cognitive-services/speech-services',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['azureCognitiveServices']
            },
            {
                label: 'Language',
                name: 'language',
                type: 'string',
                description: 'The recognition language (e.g., "en-US", "es-ES")',
                placeholder: 'en-US',
                optional: true
            },
            {
                label: 'Profanity Filter Mode',
                name: 'profanityFilterMode',
                type: 'options',
                description: 'How to handle profanity in the transcription',
                options: [
                    {
                        label: 'None',
                        name: 'None'
                    },
                    {
                        label: 'Masked',
                        name: 'Masked'
                    },
                    {
                        label: 'Removed',
                        name: 'Removed'
                    }
                ],
                default: 'Masked',
                optional: true
            },
            {
                label: 'Audio Channels',
                name: 'channels',
                type: 'string',
                description: 'Comma-separated list of audio channels to process (e.g., "0,1")',
                placeholder: '0,1',
                default: '0,1'
            }
        ]
    },
    [SpeechToTextType.GROQ_WHISPER]: {
        label: 'Groq Whisper',
        name: SpeechToTextType.GROQ_WHISPER,
        icon: groqPng,
        url: 'https://console.groq.com/',
        inputs: [
            {
                label: 'Model',
                name: 'model',
                type: 'string',
                description: `The STT model to load. Defaults to whisper-large-v3 if left blank.`,
                placeholder: 'whisper-large-v3',
                optional: true
            },
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['groqApi']
            },
            {
                label: 'Language',
                name: 'language',
                type: 'string',
                description:
                    'The language of the input audio. Supplying the input language in ISO-639-1 format will improve accuracy and latency.',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description:
                    'The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
                optional: true
            }
        ]
    }
}

const SpeechToText = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [speechToText, setSpeechToText] = useState({})
    const [selectedProvider, setSelectedProvider] = useState('none')

    const onSave = async () => {
        console.log('Save initiated', { selectedProvider, speechToText });
        
        try {
            // Ensure speechToText has 'none' key
            const updatedSpeechToText = { ...speechToText }
            if (!updatedSpeechToText.hasOwnProperty('none')) {
                updatedSpeechToText['none'] = { status: true }
            }

            // Validate required fields before saving
            if (selectedProvider !== 'none' && !updatedSpeechToText[selectedProvider]?.credentialId) {
                enqueueSnackbar({
                    message: 'Please select a credential for the Speech To Text provider',
                    options: {
                        variant: 'warning',
                        persist: true
                    }
                });
                return;
            }

            const speechToTextConfig = setValue(true, selectedProvider, 'status');
            console.log('Prepared Speech To Text Config:', speechToTextConfig);

            if (!dialogProps.chatflow?.id) {
                throw new Error('No chatflow ID found');
            }

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                speechToText: JSON.stringify(speechToTextConfig)
            });

            console.log('Save Response:', saveResp);

            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Speech To Text Configuration Saved Successfully',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                });
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data });
            } else {
                throw new Error('No data returned from save operation');
            }
        } catch (error) {
            console.error('Speech To Text Save Error:', error);
            
            const errorMessage = error.response?.data?.message || 
                                  error.message || 
                                  'An unknown error occurred while saving';
            
            enqueueSnackbar({
                message: `Failed to save Speech To Text Configuration: ${errorMessage}`,
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
            });
        }
    }

    const setValue = (value, providerName, inputParamName) => {
        let newVal = { ...speechToText }
        
        // Ensure 'none' key exists
        if (!newVal.hasOwnProperty('none')) {
            newVal['none'] = { status: true }
        }

        // Ensure the target provider exists
        if (!newVal.hasOwnProperty(providerName)) {
            newVal[providerName] = {}
        }

        newVal[providerName][inputParamName] = value

        if (inputParamName === 'status' && value === true) {
            // Turn off all other providers
            Object.keys(speechToTextProviders).forEach((key) => {
                const provider = speechToTextProviders[key]
                if (provider.name !== providerName) {
                    newVal[provider.name] = { ...newVal[provider.name], status: false }
                }
            })
            
            // Ensure 'none' is turned off if a specific provider is selected
            if (providerName !== 'none') {
                newVal['none'].status = false
            }
        }

        setSpeechToText(newVal)
        return newVal
    }

    const handleProviderChange = (event) => {
        setSelectedProvider(event.target.value)
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.speechToText) {
            try {
                const speechToText = JSON.parse(dialogProps.chatflow.speechToText)
                let selectedProvider = 'none'
                Object.keys(speechToTextProviders).forEach((key) => {
                    const providerConfig = speechToText[key]
                    if (providerConfig && providerConfig.status) {
                        selectedProvider = key
                    }
                })
                setSelectedProvider(selectedProvider)
                setSpeechToText(speechToText)
            } catch (e) {
                setSpeechToText({})
                setSelectedProvider('none')
                console.error(e)
            }
        }

        return () => {
            setSpeechToText({})
            setSelectedProvider('none')
        }
    }, [dialogProps])

    return (
        <>
            <Box fullWidth sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography>Providers</Typography>
                <FormControl fullWidth>
                    <Select size='small' value={selectedProvider} onChange={handleProviderChange}>
                        <MenuItem value='none'>None</MenuItem>
                        {Object.values(speechToTextProviders).map((provider) => (
                            <MenuItem key={provider.name} value={provider.name}>
                                {provider.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            {selectedProvider !== 'none' && (
                <>
                    <ListItem sx={{ mt: 3 }} alignItems='center'>
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
                                    src={speechToTextProviders[selectedProvider].icon}
                                />
                            </div>
                        </ListItemAvatar>
                        <ListItemText
                            sx={{ ml: 1 }}
                            primary={speechToTextProviders[selectedProvider].label}
                            secondary={
                                <a target='_blank' rel='noreferrer' href={speechToTextProviders[selectedProvider].url}>
                                    {speechToTextProviders[selectedProvider].url}
                                </a>
                            }
                        />
                    </ListItem>
                    {speechToTextProviders[selectedProvider].inputs.map((inputParam, index) => (
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
                            {inputParam.type === 'credential' && (
                                <CredentialInputHandler
                                    key={speechToText[selectedProvider]?.credentialId}
                                    data={
                                        speechToText[selectedProvider]?.credentialId
                                            ? { credential: speechToText[selectedProvider].credentialId }
                                            : {}
                                    }
                                    inputParam={inputParam}
                                    onSelect={(newValue) => setValue(newValue, selectedProvider, 'credentialId')}
                                />
                            )}
                            {inputParam.type === 'boolean' && (
                                <SwitchInput
                                    onChange={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                    value={
                                        speechToText[selectedProvider]
                                            ? speechToText[selectedProvider][inputParam.name]
                                            : inputParam.default ?? false
                                    }
                                />
                            )}
                            {(inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                                <Input
                                    inputParam={inputParam}
                                    onChange={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                    value={
                                        speechToText[selectedProvider]
                                            ? speechToText[selectedProvider][inputParam.name]
                                            : inputParam.default ?? ''
                                    }
                                />
                            )}

                            {inputParam.type === 'options' && (
                                <Dropdown
                                    name={inputParam.name}
                                    options={inputParam.options}
                                    onSelect={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                    value={
                                        speechToText[selectedProvider]
                                            ? speechToText[selectedProvider][inputParam.name]
                                            : inputParam.default ?? 'choose an option'
                                    }
                                />
                            )}
                        </Box>
                    ))}
                </>
            )}
            <StyledButton
                style={{ marginBottom: 10, marginTop: 10 }}
                disabled={selectedProvider !== 'none' && !speechToText[selectedProvider]?.credentialId}
                variant='contained'
                onClick={onSave}
            >
                Save
            </StyledButton>
        </>
    )
}

SpeechToText.propTypes = {
    dialogProps: PropTypes.object
}

export default SpeechToText
