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
    CircularProgress,
    Autocomplete,
    TextField
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
import AudioWaveform from '@/ui-component/extended/AudioWaveform'
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
                type: 'voice_select',
                description: 'The voice to use when generating the audio',
                default: 'alloy',
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
    const [testAudioSrc, setTestAudioSrc] = useState(null)
    const [isTestPlaying, setIsTestPlaying] = useState(false)
    const [testAudioRef, setTestAudioRef] = useState(null)
    const [isGeneratingTest, setIsGeneratingTest] = useState(false)
    const [resetWaveform, setResetWaveform] = useState(false)

    const resetTestAudio = () => {
        if (testAudioSrc) {
            URL.revokeObjectURL(testAudioSrc)
            setTestAudioSrc(null)
        }
        setIsTestPlaying(false)
        setResetWaveform(true)
        setTimeout(() => setResetWaveform(false), 100)
    }

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

        // Reset test audio when voice or credential is changed
        if ((inputParamName === 'voice' || inputParamName === 'credentialId') && providerName === selectedProvider) {
            resetTestAudio()
        }

        setTextToSpeech(newVal)
        return newVal
    }

    const handleProviderChange = (provider, configOverride = null) => {
        setSelectedProvider(provider)
        setVoices([])
        resetTestAudio()

        if (provider !== 'none') {
            const config = configOverride || textToSpeech
            const credentialId = config?.[provider]?.credentialId
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

        setIsGeneratingTest(true)

        try {
            const providerConfig = textToSpeech?.[selectedProvider] || {}
            const body = {
                text: 'Today is a wonderful day to build something with Flowise!',
                provider: selectedProvider,
                credentialId: providerConfig.credentialId,
                voice: providerConfig.voice,
                model: providerConfig.model
            }

            const response = await fetch('/api/v1/text-to-speech/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-request-from': 'internal'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const audioChunks = []
            const reader = response.body.getReader()
            let buffer = ''

            let done = false
            while (!done) {
                const result = await reader.read()
                done = result.done
                if (done) break

                const chunk = new TextDecoder().decode(result.value, { stream: true })
                buffer += chunk
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const eventBlock of lines) {
                    if (eventBlock.trim()) {
                        const event = parseSSEEvent(eventBlock)
                        if (event && event.event === 'tts_data' && event.data?.audioChunk) {
                            const audioBuffer = Uint8Array.from(atob(event.data.audioChunk), (c) => c.charCodeAt(0))
                            audioChunks.push(audioBuffer)
                        }
                    }
                }
            }

            if (audioChunks.length > 0) {
                // Combine all chunks into a single blob
                const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
                const combinedBuffer = new Uint8Array(totalLength)
                let offset = 0

                for (const chunk of audioChunks) {
                    combinedBuffer.set(chunk, offset)
                    offset += chunk.length
                }

                const audioBlob = new Blob([combinedBuffer], { type: 'audio/mpeg' })
                const audioUrl = URL.createObjectURL(audioBlob)

                // Clean up previous audio
                if (testAudioSrc) {
                    URL.revokeObjectURL(testAudioSrc)
                }

                setTestAudioSrc(audioUrl)
            } else {
                throw new Error('No audio data received')
            }
        } catch (error) {
            console.error('Error testing TTS:', error)
            enqueueSnackbar({
                message: `TTS test failed: ${error.message}`,
                options: { variant: 'error' }
            })
        } finally {
            setIsGeneratingTest(false)
        }
    }

    const parseSSEEvent = (eventBlock) => {
        const lines = eventBlock.trim().split('\n')
        const event = { event: null, data: null }

        for (const line of lines) {
            if (line.startsWith('event:')) {
                event.event = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
                const dataStr = line.substring(5).trim()
                try {
                    const parsed = JSON.parse(dataStr)
                    if (parsed.data) {
                        event.data = parsed.data
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e)
                }
            }
        }
        return event.event ? event : null
    }

    // Audio control functions for waveform component
    const handleTestPlay = async () => {
        // If audio already exists, just play it
        if (testAudioRef && testAudioSrc) {
            testAudioRef.play()
            setIsTestPlaying(true)
            return
        }

        // If no audio exists, generate it first
        if (!testAudioSrc) {
            await testTTS()
            // testTTS will set the audio source, and we'll play it in the next useEffect
        }
    }

    const handleTestPause = () => {
        if (testAudioRef) {
            testAudioRef.pause()
            setIsTestPlaying(false)
        }
    }

    const handleTestEnded = () => {
        setIsTestPlaying(false)
    }

    // Auto-play when audio is generated (if user clicked play)
    useEffect(() => {
        if (testAudioSrc && testAudioRef && !isTestPlaying) {
            // Small delay to ensure audio element is ready
            setTimeout(() => {
                testAudioRef.play()
                setIsTestPlaying(true)
            }, 100)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testAudioSrc, testAudioRef])

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
            resetTestAudio()
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
                                <a
                                    target='_blank'
                                    rel='noreferrer'
                                    href={textToSpeechProviders[selectedProvider].url}
                                    style={{
                                        color: theme?.customization?.isDarkMode ? '#90caf9' : '#1976d2',
                                        textDecoration: 'underline'
                                    }}
                                >
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
                                <Autocomplete
                                    size='small'
                                    sx={{ mt: 1 }}
                                    options={voices}
                                    loading={loadingVoices}
                                    getOptionLabel={(option) => option.name || ''}
                                    value={
                                        voices.find(
                                            (voice) =>
                                                voice.id === (textToSpeech?.[selectedProvider]?.[inputParam.name] || inputParam.default)
                                        ) || null
                                    }
                                    onChange={(event, newValue) => {
                                        setValue(newValue ? newValue.id : '', selectedProvider, inputParam.name)
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder={loadingVoices ? 'Loading voices...' : 'Choose a voice'}
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {loadingVoices ? <CircularProgress color='inherit' size={20} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                )
                                            }}
                                        />
                                    )}
                                    disabled={loadingVoices || !textToSpeech?.[selectedProvider]?.credentialId}
                                />
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

                    {/* Test Voice Section */}
                    <Box sx={{ p: 2 }}>
                        <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconVolume size={20} />
                            Test Voice
                        </Typography>

                        <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
                            Test text: &quot;Today is a wonderful day to build something with Flowise!&quot;
                        </Typography>

                        <AudioWaveform
                            audioSrc={testAudioSrc}
                            onPlay={handleTestPlay}
                            onPause={handleTestPause}
                            onEnded={handleTestEnded}
                            isPlaying={isTestPlaying}
                            isGenerating={isGeneratingTest}
                            disabled={!textToSpeech?.[selectedProvider]?.credentialId}
                            externalAudioRef={testAudioRef}
                            resetProgress={resetWaveform}
                        />

                        {/* Hidden audio element for waveform control */}
                        {testAudioSrc && (
                            <audio
                                ref={(ref) => setTestAudioRef(ref)}
                                src={testAudioSrc}
                                onPlay={() => setIsTestPlaying(true)}
                                onPause={() => setIsTestPlaying(false)}
                                onEnded={handleTestEnded}
                                style={{ display: 'none' }}
                            >
                                <track kind='captions' />
                            </audio>
                        )}
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
