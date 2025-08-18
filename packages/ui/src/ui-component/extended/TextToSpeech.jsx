import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import {
    Typography,
    Box,
    Button,
    FormControl,
    ListItem,
    ListItemAvatar,
    ListItemText,
    MenuItem,
    Select,
    CircularProgress
} from '@mui/material'
import { IconX, IconVolume } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'

// Project import
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { Input } from '@/ui-component/input/Input'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import openAISVG from '@/assets/images/openai.svg'
import elevenLabsSVG from '@/assets/images/elevenlabs.svg'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'
import ttsApi from '@/api/tts'

const TextToSpeechType = {
    OPENAI_TTS: 'openai',
    ELEVEN_LABS_TTS: 'elevenlabs'
}

// Weird quirk - the key must match the name property value.
const textToSpeechProviders = {
    [TextToSpeechType.OPENAI_TTS]: {
        label: 'OpenAI TTS',
        name: TextToSpeechType.OPENAI_TTS,
        icon: openAISVG,
        url: 'https://platform.openai.com/docs/guides/text-to-speech',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['openAIApi']
            },
            {
                label: 'Voice',
                name: 'voice',
                type: 'options',
                description: 'The voice to use when generating the audio',
                options: [
                    { label: 'Alloy', name: 'alloy' },
                    { label: 'Echo', name: 'echo' },
                    { label: 'Fable', name: 'fable' },
                    { label: 'Onyx', name: 'onyx' },
                    { label: 'Nova', name: 'nova' },
                    { label: 'Shimmer', name: 'shimmer' }
                ],
                default: 'alloy',
                optional: true
            },
            {
                label: 'Model',
                name: 'model',
                type: 'options',
                description: 'The TTS model to use',
                options: [
                    { label: 'TTS-1', name: 'tts-1' },
                    { label: 'TTS-1 HD', name: 'tts-1-hd' }
                ],
                default: 'tts-1',
                optional: true
            }
        ]
    },
    [TextToSpeechType.ELEVEN_LABS_TTS]: {
        label: 'Eleven Labs TTS',
        name: TextToSpeechType.ELEVEN_LABS_TTS,
        icon: elevenLabsSVG,
        url: 'https://elevenlabs.io/',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['elevenLabsApi']
            },
            {
                label: 'Voice',
                name: 'voice',
                type: 'voice_select',
                description: 'The voice to use for text-to-speech',
                default: '21m00Tcm4TlvDq8ikWAM',
                optional: true
            }
        ]
    }
}

const TextToSpeech = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()
    const theme = useTheme()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [textToSpeech, setTextToSpeech] = useState(null)
    const [selectedProvider, setSelectedProvider] = useState('none')
    const [voices, setVoices] = useState([])
    const [loadingVoices, setLoadingVoices] = useState(false)

    const onSave = async () => {
        const textToSpeechConfig = setValue(true, selectedProvider, 'status')
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                textToSpeech: JSON.stringify(textToSpeechConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Text To Speech Configuration Saved',
                    options: {
                        key: Date.now() + Math.random(),
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
                message: `Failed to save Text To Speech Configuration: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: Date.now() + Math.random(),
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
        if (!textToSpeech || !Object.hasOwn(textToSpeech, providerName)) {
            newVal = { ...(textToSpeech || {}), [providerName]: {} }
        } else {
            newVal = { ...textToSpeech }
        }

        newVal[providerName][inputParamName] = value
        if (inputParamName === 'status' && value === true) {
            // ensure that the others are turned off
            Object.keys(textToSpeechProviders).forEach((key) => {
                const provider = textToSpeechProviders[key]
                if (provider.name !== providerName) {
                    newVal[provider.name] = { ...(textToSpeech?.[provider.name] || {}), status: false }
                }
            })
            if (providerName !== 'none' && newVal['none']) {
                newVal['none'].status = false
            }
        }
        setTextToSpeech(newVal)
        return newVal
    }

    const handleProviderChange = (provider, configOverride = null) => {
        setSelectedProvider(() => provider)
        setVoices([])
        if (provider !== 'none') {
            const config = configOverride || textToSpeech?.[provider]
            const credentialId = config?.credentialId
            if (credentialId) {
                loadVoicesForProvider(provider, credentialId)
            }
        }
    }

    const loadVoicesForProvider = async (provider, credentialId) => {
        if (provider === 'none' || !credentialId) return

        setLoadingVoices(true)
        try {
            const params = new URLSearchParams({ provider })
            params.append('credentialId', credentialId)

            const response = await ttsApi.listVoices(params)

            if (response.data) {
                const voicesData = await response.data
                setVoices(voicesData)
            } else {
                setVoices([])
            }
        } catch (error) {
            console.error('Error loading voices:', error)
            setVoices([])
        } finally {
            setLoadingVoices(false)
        }
    }

    const testTTS = async () => {
        if (selectedProvider === 'none' || !textToSpeech?.[selectedProvider]?.credentialId) {
            enqueueSnackbar({
                message: 'Please select a provider and configure credentials first',
                options: { variant: 'warning' }
            })
            return
        }

        try {
            const providerConfig = textToSpeech?.[selectedProvider] || {}
            const body = {
                text: 'Today is a wonderful day to build something with Flowise!',
                provider: selectedProvider,
                credentialId: providerConfig.credentialId,
                voice: providerConfig.voice,
                model: providerConfig.model
            }
            const response = await ttsApi.generateVoice(body)
            if (response.data) {
                const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
                const audioUrl = URL.createObjectURL(audioBlob)
                const audio = new Audio(audioUrl)

                audio
                    .play()
                    .then(() => {
                        enqueueSnackbar({
                            message: 'Test audio played successfully',
                            options: { variant: 'success' }
                        })
                    })
                    .catch((error) => {
                        console.error('Error playing audio:', error)
                        enqueueSnackbar({
                            message: 'Error playing test audio',
                            options: { variant: 'error' }
                        })
                    })

                // Clean up URL after audio finishes
                audio.addEventListener('ended', () => {
                    URL.revokeObjectURL(audioUrl)
                })
            } else {
                throw new Error(`TTS request failed: ${response.status}`)
            }
        } catch (error) {
            console.error('Error testing TTS:', error)
            enqueueSnackbar({
                message: `TTS test failed: ${error.message}`,
                options: { variant: 'error' }
            })
        }
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.textToSpeech) {
            try {
                const textToSpeechConfig = JSON.parse(dialogProps.chatflow.textToSpeech)
                let selectedProvider = 'none'
                Object.keys(textToSpeechProviders).forEach((key) => {
                    const providerConfig = textToSpeechConfig[key]
                    if (providerConfig && providerConfig.status) {
                        selectedProvider = key
                    }
                })
                setSelectedProvider(selectedProvider)
                setTextToSpeech(textToSpeechConfig)
                handleProviderChange(selectedProvider, textToSpeechConfig)
            } catch {
                setTextToSpeech(null)
                setSelectedProvider('none')
            }
        }

        return () => {
            setTextToSpeech(null)
            setSelectedProvider('none')
            setVoices([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    return (
        <>
            <Box fullWidth sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography>Providers</Typography>
                <FormControl fullWidth>
                    <Select
                        size='small'
                        value={selectedProvider}
                        onChange={(event) => handleProviderChange(event.target.value)}
                        sx={{
                            '& .MuiSvgIcon-root': {
                                color: theme?.customization?.isDarkMode ? '#fff' : 'inherit'
                            }
                        }}
                    >
                        <MenuItem value='none'>None</MenuItem>
                        {Object.values(textToSpeechProviders).map((provider) => (
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
                                    alt='TTS Provider'
                                    src={textToSpeechProviders[selectedProvider].icon}
                                />
                            </div>
                        </ListItemAvatar>
                        <ListItemText
                            sx={{ ml: 1 }}
                            primary={textToSpeechProviders[selectedProvider].label}
                            secondary={
                                <a target='_blank' rel='noreferrer' href={textToSpeechProviders[selectedProvider].url}>
                                    {textToSpeechProviders[selectedProvider].url}
                                </a>
                            }
                        />
                    </ListItem>
                    {textToSpeechProviders[selectedProvider].inputs.map((inputParam) => (
                        <Box key={`${selectedProvider}-${inputParam.name}`} sx={{ p: 2 }}>
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
                                    key={textToSpeech?.[selectedProvider]?.credentialId}
                                    data={
                                        textToSpeech?.[selectedProvider]?.credentialId
                                            ? { credential: textToSpeech?.[selectedProvider]?.credentialId }
                                            : {}
                                    }
                                    inputParam={inputParam}
                                    onSelect={(newValue) => {
                                        setValue(newValue, selectedProvider, 'credentialId')
                                        // Load voices when credential is updated
                                        if (newValue && selectedProvider !== 'none') {
                                            setTimeout(() => loadVoicesForProvider(selectedProvider, newValue), 100)
                                        }
                                    }}
                                />
                            )}
                            {inputParam.type === 'boolean' && (
                                <SwitchInput
                                    onChange={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                    value={
                                        textToSpeech?.[selectedProvider]
                                            ? textToSpeech[selectedProvider][inputParam.name]
                                            : inputParam.default ?? false
                                    }
                                />
                            )}
                            {(inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                                <Input
                                    inputParam={inputParam}
                                    onChange={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                    value={
                                        textToSpeech?.[selectedProvider]
                                            ? textToSpeech[selectedProvider][inputParam.name]
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
                                        textToSpeech?.[selectedProvider]
                                            ? textToSpeech[selectedProvider][inputParam.name]
                                            : inputParam.default ?? 'choose an option'
                                    }
                                />
                            )}
                            {inputParam.type === 'voice_select' && (
                                <Box>
                                    {loadingVoices ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={16} />
                                            <Typography variant='body2'>Loading voices...</Typography>
                                        </Box>
                                    ) : (
                                        <Dropdown
                                            name={inputParam.name}
                                            options={voices.map((voice) => ({ label: voice.name, name: voice.id }))}
                                            onSelect={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                            value={
                                                textToSpeech?.[selectedProvider]
                                                    ? textToSpeech[selectedProvider][inputParam.name]
                                                    : inputParam.default ?? 'choose a voice'
                                            }
                                        />
                                    )}
                                </Box>
                            )}
                        </Box>
                    ))}

                    {/* Auto-play Toggle */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Automatically play audio
                                <TooltipWithParser
                                    style={{ marginLeft: 10 }}
                                    title='When enabled, bot responses will be automatically converted to speech and played'
                                />
                            </Typography>
                        </div>
                        <SwitchInput
                            onChange={(newValue) => setValue(newValue, selectedProvider, 'autoPlay')}
                            value={textToSpeech?.[selectedProvider] ? textToSpeech[selectedProvider].autoPlay ?? false : false}
                        />
                    </Box>

                    {/* Test TTS Button */}
                    <Box sx={{ p: 2 }}>
                        <StyledButton
                            variant='outlined'
                            size='small'
                            startIcon={<IconVolume />}
                            onClick={testTTS}
                            disabled={!textToSpeech?.[selectedProvider]?.credentialId}
                        >
                            Test Voice
                        </StyledButton>
                    </Box>
                </>
            )}
            <StyledButton
                style={{ marginBottom: 10, marginTop: 10 }}
                disabled={selectedProvider !== 'none' && !textToSpeech?.[selectedProvider]?.credentialId}
                variant='contained'
                onClick={onSave}
            >
                Save
            </StyledButton>
        </>
    )
}

TextToSpeech.propTypes = {
    dialogProps: PropTypes.object
}

export default TextToSpeech
