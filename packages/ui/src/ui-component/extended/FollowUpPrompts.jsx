import PropTypes from 'prop-types'
import { Box, Button, FormControl, ListItem, ListItemAvatar, ListItemText, MenuItem, Select, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'

// Project Imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'
import chatflowsApi from '@/api/chatflows'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'
import anthropicIcon from '@/assets/images/anthropic.svg'
import azureOpenAiIcon from '@/assets/images/azure_openai.svg'
import mistralAiIcon from '@/assets/images/mistralai.svg'
import openAiIcon from '@/assets/images/openai.svg'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { Input } from '@/ui-component/input/Input'
import { AsyncDropdown } from '@/ui-component/dropdown/AsyncDropdown'

// Icons
import { IconX } from '@tabler/icons-react'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const promptDescription =
    'Prompt to generate questions based on the conversation history. You can use variable {history} to refer to the conversation history.'
const defaultPrompt =
    'Given the following conversations: {history}. Please help me predict the three most likely questions that human would ask and keeping each question short and concise.'

// update when adding new providers
const FollowUpPromptProviders = {
    ANTHROPIC: 'chatAnthropic',
    AZURE_OPENAI: 'azureChatOpenAI',
    GOOGLE_GENAI: 'chatGoogleGenerativeAI',
    MISTRALAI: 'chatMistralAI',
    OPENAI: 'chatOpenAI'
}

const followUpPromptsOptions = {
    [FollowUpPromptProviders.ANTHROPIC]: {
        label: 'Anthropic Claude',
        name: FollowUpPromptProviders.ANTHROPIC,
        icon: anthropicIcon,
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['anthropicApi']
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: promptDescription,
                optional: true,
                default: defaultPrompt
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                default: 0.9
            }
        ]
    },
    [FollowUpPromptProviders.AZURE_OPENAI]: {
        label: 'Azure ChatOpenAI',
        name: FollowUpPromptProviders.AZURE_OPENAI,
        icon: azureOpenAiIcon,
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['azureOpenAIApi']
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: promptDescription,
                optional: true,
                default: defaultPrompt
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                default: 0.9
            }
        ]
    },
    [FollowUpPromptProviders.GOOGLE_GENAI]: {
        label: 'Google Gemini',
        name: FollowUpPromptProviders.GOOGLE_GENAI,
        icon: azureOpenAiIcon,
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['googleGenerativeAI']
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                default: 'gemini-1.5-pro-latest',
                options: [
                    { label: 'gemini-1.5-flash-latest', name: 'gemini-1.5-flash-latest' },
                    { label: 'gemini-1.5-pro-latest', name: 'gemini-1.5-pro-latest' }
                ]
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: promptDescription,
                optional: true,
                default: defaultPrompt
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                default: 0.9
            }
        ]
    },
    [FollowUpPromptProviders.MISTRALAI]: {
        label: 'Mistral AI',
        name: FollowUpPromptProviders.MISTRALAI,
        icon: mistralAiIcon,
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['mistralAIApi']
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    { label: 'mistral-large-latest', name: 'mistral-large-latest' },
                    { label: 'mistral-large-2402', name: 'mistral-large-2402' }
                ]
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: promptDescription,
                optional: true,
                default: defaultPrompt
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                default: 0.9
            }
        ]
    },
    [FollowUpPromptProviders.OPENAI]: {
        label: 'OpenAI',
        name: FollowUpPromptProviders.OPENAI,
        icon: openAiIcon,
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['openAIApi']
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                description: promptDescription,
                optional: true,
                default: defaultPrompt
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                optional: true,
                default: 0.9
            }
        ]
    }
}

const FollowUpPrompts = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [followUpPromptsConfig, setFollowUpPromptsConfig] = useState({})
    const [chatbotConfig, setChatbotConfig] = useState({})
    const [selectedProvider, setSelectedProvider] = useState('none')

    const handleChange = (key, value) => {
        setFollowUpPromptsConfig({
            ...followUpPromptsConfig,
            [key]: value
        })
    }

    const handleSelectedProviderChange = (event) => {
        const selectedProvider = event.target.value
        setSelectedProvider(selectedProvider)
        handleChange('selectedProvider', selectedProvider)
    }

    const setValue = (value, providerName, inputParamName) => {
        let newVal = {}
        if (!Object.prototype.hasOwnProperty.call(followUpPromptsConfig, providerName)) {
            newVal = { ...followUpPromptsConfig, [providerName]: {} }
        } else {
            newVal = { ...followUpPromptsConfig }
        }

        newVal[providerName][inputParamName] = value
        if (inputParamName === 'status' && value === true) {
            // ensure that the others are turned off
            Object.keys(followUpPromptsOptions).forEach((key) => {
                const provider = followUpPromptsOptions[key]
                if (provider.name !== providerName) {
                    newVal[provider.name] = { ...followUpPromptsConfig[provider.name], status: false }
                }
            })
        }
        setFollowUpPromptsConfig(newVal)
        return newVal
    }

    const onSave = async () => {
        // TODO: saving without changing the prompt will not save the prompt
        try {
            let value = {
                followUpPrompts: { status: followUpPromptsConfig.status }
            }
            chatbotConfig.followUpPrompts = value.followUpPrompts

            // if the prompt is not set, save the default prompt
            if (!followUpPromptsConfig[followUpPromptsConfig.selectedProvider].prompt) {
                followUpPromptsConfig[followUpPromptsConfig.selectedProvider].prompt = followUpPromptsOptions[
                    followUpPromptsConfig.selectedProvider
                ].inputs.find((input) => input.name === 'prompt').default
            }

            if (!followUpPromptsConfig[followUpPromptsConfig.selectedProvider].temperature) {
                followUpPromptsConfig[followUpPromptsConfig.selectedProvider].temperature = followUpPromptsOptions[
                    followUpPromptsConfig.selectedProvider
                ].inputs.find((input) => input.name === 'temperature').default
            }

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig),
                followUpPrompts: JSON.stringify(followUpPromptsConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Follow-up Prompts configuration saved',
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
                message: `Failed to save follow-up prompts configuration: ${errorData}`,
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
        if (dialogProps.chatflow && dialogProps.chatflow.followUpPrompts) {
            let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            let followUpPromptsConfig = JSON.parse(dialogProps.chatflow.followUpPrompts)
            setChatbotConfig(chatbotConfig || {})
            if (followUpPromptsConfig) {
                setFollowUpPromptsConfig(followUpPromptsConfig)
                setSelectedProvider(followUpPromptsConfig.selectedProvider)
            }
        }

        return () => {}
    }, [dialogProps])

    const checkDisabled = () => {
        if (followUpPromptsConfig && followUpPromptsConfig.status) {
            if (selectedProvider === 'none') {
                return true
            }
            const provider = followUpPromptsOptions[selectedProvider]
            for (let inputParam of provider.inputs) {
                if (!inputParam.optional) {
                    const param = inputParam.name === 'credential' ? 'credentialId' : inputParam.name
                    if (
                        !followUpPromptsConfig[selectedProvider] ||
                        !followUpPromptsConfig[selectedProvider][param] ||
                        followUpPromptsConfig[selectedProvider][param] === ''
                    ) {
                        return true
                    }
                }
            }
        }
        return false
    }

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'start',
                    gap: 3,
                    mb: 2
                }}
            >
                <SwitchInput
                    label='Enable Follow-up Prompts'
                    onChange={(value) => handleChange('status', value)}
                    value={followUpPromptsConfig.status}
                />
                {followUpPromptsConfig && followUpPromptsConfig.status && (
                    <>
                        <Typography variant='h5'>Providers</Typography>
                        <FormControl fullWidth>
                            <Select size='small' value={selectedProvider} onChange={handleSelectedProviderChange}>
                                <MenuItem value='none'>None</MenuItem>
                                {Object.values(followUpPromptsOptions).map((provider) => (
                                    <MenuItem key={provider.name} value={provider.name}>
                                        {provider.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {selectedProvider !== 'none' && (
                            <>
                                <ListItem sx={{ p: 0 }} alignItems='center'>
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
                                                src={followUpPromptsOptions[selectedProvider].icon}
                                            />
                                        </div>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={followUpPromptsOptions[selectedProvider].label}
                                        secondary={
                                            <a target='_blank' rel='noreferrer' href={followUpPromptsOptions[selectedProvider].url}>
                                                {followUpPromptsOptions[selectedProvider].url}
                                            </a>
                                        }
                                    />
                                </ListItem>
                                {followUpPromptsOptions[selectedProvider].inputs.map((inputParam, index) => (
                                    <Box key={index} sx={{ px: 2, width: '100%' }}>
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
                                                key={`${selectedProvider}-${inputParam.name}`}
                                                data={
                                                    followUpPromptsConfig[selectedProvider]?.credentialId
                                                        ? { credential: followUpPromptsConfig[selectedProvider].credentialId }
                                                        : {}
                                                }
                                                inputParam={inputParam}
                                                onSelect={(newValue) => setValue(newValue, selectedProvider, 'credentialId')}
                                            />
                                        )}

                                        {(inputParam.type === 'string' ||
                                            inputParam.type === 'password' ||
                                            inputParam.type === 'number') && (
                                            <Input
                                                key={`${selectedProvider}-${inputParam.name}`}
                                                inputParam={inputParam}
                                                onChange={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                                value={
                                                    followUpPromptsConfig[selectedProvider] &&
                                                    followUpPromptsConfig[selectedProvider][inputParam.name]
                                                        ? followUpPromptsConfig[selectedProvider][inputParam.name]
                                                        : inputParam.default ?? ''
                                                }
                                            />
                                        )}

                                        {inputParam.type === 'asyncOptions' && (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                    <AsyncDropdown
                                                        key={`${selectedProvider}-${inputParam.name}`}
                                                        name={inputParam.name}
                                                        nodeData={{
                                                            name: followUpPromptsOptions[selectedProvider].name,
                                                            inputParams: followUpPromptsOptions[selectedProvider].inputs
                                                        }}
                                                        value={
                                                            followUpPromptsConfig[selectedProvider] &&
                                                            followUpPromptsConfig[selectedProvider][inputParam.name]
                                                                ? followUpPromptsConfig[selectedProvider][inputParam.name]
                                                                : inputParam.default ?? 'choose an option'
                                                        }
                                                        onSelect={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {inputParam.type === 'options' && (
                                            <Dropdown
                                                name={inputParam.name}
                                                options={inputParam.options}
                                                onSelect={(newValue) => setValue(newValue, selectedProvider, inputParam.name)}
                                                value={
                                                    followUpPromptsConfig[selectedProvider] &&
                                                    followUpPromptsConfig[selectedProvider][inputParam.name]
                                                        ? followUpPromptsConfig[selectedProvider][inputParam]
                                                        : inputParam.default ?? 'choose an option'
                                                }
                                            />
                                        )}
                                    </Box>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Box>
            <StyledButton disabled={checkDisabled()} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

FollowUpPrompts.propTypes = {
    dialogProps: PropTypes.object
}

export default FollowUpPrompts
