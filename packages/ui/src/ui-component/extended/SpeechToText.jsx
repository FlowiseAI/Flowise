import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Typography, Box, Button, FormControl, ListItem, ListItemAvatar, ListItemText, MenuItem, Select } from '@mui/material'
import { IconX } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'

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

// i18n
import { useTranslation } from 'react-i18next'

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
        label: 'components.speechToText.providers.openAIWhisper',
        name: SpeechToTextType.OPENAI_WHISPER,
        icon: openAISVG,
        url: 'https://platform.openai.com/docs/guides/speech-to-text',
        inputs: [
            {
                label: 'components.speechToText.inputs.connectCredential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['openAIApi']
            },
            {
                label: 'components.speechToText.inputs.language.tit;e',
                name: 'language',
                type: 'string',
                description: 'components.speechToText.inputs.language.description',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.prompt.title',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: 'components.speechToText.inputs.prompt.description',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.temperature.title',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: 'components.speechToText.inputs.temperature.description',
                optional: true
            }
        ]
    },
    [SpeechToTextType.ASSEMBLYAI_TRANSCRIBE]: {
        label: 'components.speechToText.providers.assemblyAi',
        name: SpeechToTextType.ASSEMBLYAI_TRANSCRIBE,
        icon: assemblyAIPng,
        url: 'https://www.assemblyai.com/',
        inputs: [
            {
                label: 'components.speechToText.inputs.connectCredential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['assemblyAIApi']
            }
        ]
    },
    [SpeechToTextType.LOCALAI_STT]: {
        label: 'components.speechToText.providers.localAiSTT',
        name: SpeechToTextType.LOCALAI_STT,
        icon: localAiPng,
        url: 'https://localai.io/features/audio-to-text/',
        inputs: [
            {
                label: 'components.speechToText.inputs.connectCredential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['localAIApi']
            },
            {
                label: 'components.speechToText.inputs.baseUrl.title',
                name: 'baseUrl',
                type: 'string',
                description: 'components.speechToText.inputs.baseUrl.description'
            },
            {
                label: 'components.speechToText.inputs.language.title',
                name: 'language',
                type: 'string',
                description: 'components.speechToText.inputs.language.description',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.model.title',
                name: 'model',
                type: 'string',
                description: 'components.speechToText.inputs.model.description.localAiSTT',
                placeholder: 'whisper-1',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.prompt.title',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: 'components.speechToText.inputs.prompt.description',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.temperature.title',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: 'components.speechToText.inputs.temperature.description',
                optional: true
            }
        ]
    },
    [SpeechToTextType.AZURE_COGNITIVE]: {
        label: 'components.speechToText.providers.azureCognitive',
        name: SpeechToTextType.AZURE_COGNITIVE,
        icon: azureSvg,
        url: 'https://azure.microsoft.com/en-us/products/cognitive-services/speech-services',
        inputs: [
            {
                label: 'components.speechToText.inputs.connectCredential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['azureCognitiveServices']
            },
            {
                label: 'components.speechToText.inputs.language.title',
                name: 'language',
                type: 'string',
                description: 'components.speechToText.inputs.language.description',
                placeholder: 'en-US',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.profanityFilterMode.title',
                name: 'profanityFilterMode',
                type: 'options',
                description: 'components.speechToText.inputs.profanityFilterMode.description',
                options: [
                    {
                        label: 'components.speechToText.providers.none',
                        name: 'None'
                    },
                    {
                        label: 'components.speechToText.inputs.profanityFilterMode.options.masked',
                        name: 'Masked'
                    },
                    {
                        label: 'components.speechToText.inputs.profanityFilterMode.options.removed',
                        name: 'Removed'
                    }
                ],
                default: 'Masked',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.audioChannels.title',
                name: 'channels',
                type: 'string',
                description: 'components.speechToText.inputs.audioChannels.description',
                placeholder: '0,1',
                default: '0,1'
            }
        ]
    },
    [SpeechToTextType.GROQ_WHISPER]: {
        label: 'components.speechToText.providers.groqWhisper',
        name: SpeechToTextType.GROQ_WHISPER,
        icon: groqPng,
        url: 'https://console.groq.com/',
        inputs: [
            {
                label: 'components.speechToText.inputs.model.title',
                name: 'model',
                type: 'string',
                description: 'components.speechToText.inputs.model.description.groq',
                placeholder: 'whisper-large-v3',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.connectCredential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['groqApi']
            },
            {
                label: 'components.speechToText.inputs.language.title',
                name: 'language',
                type: 'string',
                description: 'components.speechToText.inputs.language.description',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'components.speechToText.inputs.temperature.title',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: 'components.speechToText.inputs.temperature.description',
                optional: true
            }
        ]
    }
}

const SpeechToText = ({ dialogProps, onConfirm }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    useNotifier()
    const theme = useTheme()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [speechToText, setSpeechToText] = useState({})
    const [selectedProvider, setSelectedProvider] = useState('none')

    const onSave = async () => {
        const speechToText = setValue(true, selectedProvider, 'status')
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                speechToText: JSON.stringify(speechToText)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: t('components.speechToText.messages.success'),
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
                onConfirm?.()
            }
        } catch (error) {
            enqueueSnackbar({
                message: t('components.speechToText.messages.error', {
                    msg: typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }),
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
            // ensure that the others are turned off
            Object.keys(speechToTextProviders).forEach((key) => {
                const provider = speechToTextProviders[key]
                if (provider.name !== providerName) {
                    newVal[provider.name] = { ...speechToText[provider.name], status: false }
                }
            })
            if (providerName !== 'none' && newVal['none']) {
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
                <Typography>{t('components.speechToText.providersLabel')}</Typography>
                <FormControl fullWidth>
                    <Select
                        size='small'
                        value={selectedProvider}
                        onChange={handleProviderChange}
                        sx={{
                            '& .MuiSvgIcon-root': {
                                color: theme?.customization?.isDarkMode ? '#fff' : 'inherit'
                            }
                        }}
                    >
                        <MenuItem value='none'>{t('components.speechToText.providers.none')}</MenuItem>
                        {Object.values(speechToTextProviders).map((provider) => (
                            <MenuItem key={provider.name} value={provider.name}>
                                {t(provider.label)}
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
                                    backgroundColor: 'white',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
                            primary={t(speechToTextProviders[selectedProvider].label)}
                            secondary={
                                <a
                                    target='_blank'
                                    rel='noreferrer'
                                    href={speechToTextProviders[selectedProvider].url}
                                    style={{
                                        color: theme?.customization?.isDarkMode ? '#90caf9' : '#1976d2',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {speechToTextProviders[selectedProvider].url}
                                </a>
                            }
                        />
                    </ListItem>
                    {speechToTextProviders[selectedProvider].inputs.map((inputParam, index) => (
                        <Box key={index} sx={{ p: 2 }}>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <Typography>
                                    {t(inputParam.label)}
                                    {!inputParam.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                    {inputParam.description && (
                                        <TooltipWithParser style={{ marginLeft: 10 }} title={t(inputParam.description)} />
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
                                    options={inputParam.options.map((opt) => ({
                                        label: t(opt.label),
                                        name: opt.name
                                    }))}
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton
                    disabled={selectedProvider !== 'none' && !speechToText[selectedProvider]?.credentialId}
                    variant='contained'
                    onClick={onSave}
                    sx={{ minWidth: 100 }}
                >
                    {t('components.speechToText.actions.save')}
                </StyledButton>
            </Box>
        </>
    )
}

SpeechToText.propTypes = {
    dialogProps: PropTypes.object,
    onConfirm: PropTypes.func
}

export default SpeechToText
