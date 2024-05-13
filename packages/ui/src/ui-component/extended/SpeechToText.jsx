import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import { Typography, Box, Button, FormControl, ListItem, ListItemAvatar, ListItemText, MenuItem, Select } from '@mui/material'
import { IconX } from '@tabler/icons'

// Project import
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { Input } from '@/ui-component/input/Input'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import openAISVG from '@/assets/images/openai.svg'
import assemblyAIPng from '@/assets/images/assemblyai.png'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const speechToTextProviders = {
    openAIWhisper: {
        label: 'OpenAI Whisper',
        name: 'openAIWhisper',
        icon: openAISVG,
        url: 'https://platform.openai.com/docs/guides/speech-to-text',
        inputs: [
            {
                label: 'Подключить учетные данные',
                name: 'credential',
                type: 'credential',
                credentialNames: ['openAIApi']
            },
            {
                label: 'Язык',
                name: 'language',
                type: 'string',
                description: 'Язык входного аудио. Предоставление языка ввода в формате ISO-639-1 улучшит точность и задержку.',
                placeholder: 'en',
                optional: true
            },
            {
                label: 'Подсказка',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: `Дополнительный текст, определяющий стиль модели или продолжающий предыдущий аудиосегмент. Подсказка должна соответствовать языку аудио.`,
                optional: true
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description: `Температура выборки от 0 до 1. Более высокие значения, например 0,8, сделают выходные данные более случайными, а более низкие значения, например 0,2, сделают их более целенаправленными и детерминированными.`,
                optional: true
            }
        ]
    },
    assemblyAiTranscribe: {
        label: 'Assembly AI',
        name: 'assemblyAiTranscribe',
        icon: assemblyAIPng,
        url: 'https://www.assemblyai.com/',
        inputs: [
            {
                label: 'Подключить учетные данные',
                name: 'credential',
                type: 'credential',
                credentialNames: ['assemblyAIApi']
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
        const speechToText = setValue(true, selectedProvider, 'status')
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
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to save Speech To Text Configuration: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
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
                <Typography variant='h4' sx={{ mb: 1 }}>
                    Выберите сервис для распознования речи
                </Typography>
                <FormControl fullWidth>
                    <Select size='small' value={selectedProvider} onChange={handleProviderChange}>
                        <MenuItem value='none'>Отсутствует</MenuItem>
                        <MenuItem value='openAIWhisper'>StartAI Whisper</MenuItem>
                        <MenuItem value='assemblyAiTranscribe'>Assembly AI</MenuItem>
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
                Сохранить
            </StyledButton>
        </>
    )
}

SpeechToText.propTypes = {
    dialogProps: PropTypes.object
}

export default SpeechToText
