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

            // Use streaming approach like in ChatMessage.jsx
            const mediaSource = new MediaSource()
            const audio = new Audio()
            audio.src = URL.createObjectURL(mediaSource)

            const streamingState = {
                mediaSource,
                sourceBuffer: null,
                audio,
                chunkQueue: [],
                isBuffering: false,
                abortController: new AbortController(),
                streamEnded: false
            }

            mediaSource.addEventListener('sourceopen', () => {
                try {
                    const mimeType = 'audio/mpeg'
                    streamingState.sourceBuffer = mediaSource.addSourceBuffer(mimeType)

                    streamingState.sourceBuffer.addEventListener('updateend', () => {
                        streamingState.isBuffering = false
                        if (streamingState.chunkQueue.length > 0 && !streamingState.sourceBuffer.updating) {
                            const chunk = streamingState.chunkQueue.shift()
                            try {
                                streamingState.sourceBuffer.appendBuffer(chunk)
                                streamingState.isBuffering = true
                            } catch (error) {
                                console.error('Error appending chunk:', error)
                            }
                        } else if (streamingState.streamEnded && streamingState.chunkQueue.length === 0) {
                            // All chunks processed and stream ended, now we can safely end the stream
                            try {
                                if (streamingState.mediaSource.readyState === 'open') {
                                    streamingState.mediaSource.endOfStream()
                                }
                            } catch (error) {
                                console.error('Error ending MediaSource stream:', error)
                            }
                        }
                    })

                    audio.play().catch((playError) => {
                        console.error('Error starting audio playback:', playError)
                    })
                } catch (error) {
                    console.error('Error setting up source buffer:', error)
                }
            })

            audio.addEventListener('playing', () => {
                enqueueSnackbar({
                    message: 'Test audio playing...',
                    options: { variant: 'info' }
                })
            })

            audio.addEventListener('ended', () => {
                enqueueSnackbar({
                    message: 'Test audio completed successfully',
                    options: { variant: 'success' }
                })
                // Cleanup
                if (streamingState.audio.src) {
                    URL.revokeObjectURL(streamingState.audio.src)
                }
            })

            const response = await fetch('/api/v1/text-to-speech/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-request-from': 'internal'
                },
                credentials: 'include',
                body: JSON.stringify(body),
                signal: streamingState.abortController.signal
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body.getReader()
            let buffer = ''

            let done = false
            while (!done) {
                if (streamingState.abortController.signal.aborted) {
                    reader.cancel()
                    break
                }

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
                        if (event) {
                            switch (event.event) {
                                case 'tts_data':
                                    if (event.data?.audioChunk) {
                                        const audioBuffer = Uint8Array.from(atob(event.data.audioChunk), (c) => c.charCodeAt(0))
                                        streamingState.chunkQueue.push(audioBuffer)

                                        if (streamingState.sourceBuffer && !streamingState.sourceBuffer.updating) {
                                            const chunk = streamingState.chunkQueue.shift()
                                            try {
                                                streamingState.sourceBuffer.appendBuffer(chunk)
                                                streamingState.isBuffering = true
                                            } catch (error) {
                                                console.error('Error appending initial chunk:', error)
                                            }
                                        }
                                    }
                                    break
                                case 'tts_end':
                                    streamingState.streamEnded = true
                                    // Check if we can end the stream immediately (no chunks queued and not updating)
                                    if (
                                        streamingState.sourceBuffer &&
                                        streamingState.chunkQueue.length === 0 &&
                                        !streamingState.sourceBuffer.updating &&
                                        streamingState.mediaSource.readyState === 'open'
                                    ) {
                                        try {
                                            streamingState.mediaSource.endOfStream()
                                        } catch (error) {
                                            console.error('Error ending MediaSource stream:', error)
                                        }
                                    }
                                    break
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error testing TTS:', error)
            enqueueSnackbar({
                message: `TTS test failed: ${error.message}`,
                options: { variant: 'error' }
            })
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
