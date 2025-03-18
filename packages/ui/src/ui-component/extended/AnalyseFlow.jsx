import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// material-ui
import {
    Typography,
    Box,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconX } from '@tabler/icons-react'

// Project import
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { Input } from '@/ui-component/input/Input'
import { StyledButton } from '@/ui-component/button/StyledButton'
import langsmithPNG from '@/assets/images/langchain.png'
import langfuseSVG from '@/assets/images/langfuse.svg'
import lunarySVG from '@/assets/images/lunary.svg'
import langwatchSVG from '@/assets/images/langwatch.svg'
import arizePNG from '@/assets/images/arize.png'
import phoenixPNG from '@/assets/images/phoenix.png'
import opikPNG from '@/assets/images/opik.png'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const analyticProviders = [
    {
        label: 'LangSmith',
        name: 'langSmith',
        icon: langsmithPNG,
        url: 'https://smith.langchain.com',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['langsmithApi']
            },
            {
                label: 'Project Name',
                name: 'projectName',
                type: 'string',
                optional: true,
                description: 'If not provided, default will be used',
                placeholder: 'default'
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
        label: 'LangFuse',
        name: 'langFuse',
        icon: langfuseSVG,
        url: 'https://langfuse.com',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['langfuseApi']
            },
            {
                label: 'Release',
                name: 'release',
                type: 'string',
                optional: true,
                description: 'The release number/hash of the application to provide analytics grouped by release'
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
        label: 'Lunary',
        name: 'lunary',
        icon: lunarySVG,
        url: 'https://lunary.ai',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['lunaryApi']
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
        label: 'LangWatch',
        name: 'langWatch',
        icon: langwatchSVG,
        url: 'https://langwatch.ai',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['langwatchApi']
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
        label: 'Arize',
        name: 'arize',
        icon: arizePNG,
        url: 'https://arize.com',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['arizeApi']
            },
            {
                label: 'Project Name',
                name: 'projectName',
                type: 'string',
                optional: true,
                description: 'If not provided, default will be used.',
                placeholder: 'default'
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
        label: 'Phoenix',
        name: 'phoenix',
        icon: phoenixPNG,
        url: 'https://phoenix.arize.com',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['phoenixApi']
            },
            {
                label: 'Project Name',
                name: 'projectName',
                type: 'string',
                optional: true,
                description: 'If not provided, default will be used.',
                placeholder: 'default'
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
        label: 'Opik',
        name: 'opik',
        icon: opikPNG,
        url: 'https://www.comet.com/opik',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['opikApi']
            },
            {
                label: 'Project Name',
                name: 'opikProjectName',
                type: 'string',
                description: 'Name of your Opik project',
                placeholder: 'default'
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

const AnalyseFlow = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [analytic, setAnalytic] = useState({})
    const [providerExpanded, setProviderExpanded] = useState({})

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                analytic: JSON.stringify(analytic)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Analytic Configuration Saved',
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
                message: `Failed to save Analytic Configuration: ${
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
        if (!Object.prototype.hasOwnProperty.call(analytic, providerName)) {
            newVal = { ...analytic, [providerName]: {} }
        } else {
            newVal = { ...analytic }
        }

        newVal[providerName][inputParamName] = value
        setAnalytic(newVal)
    }

    const handleAccordionChange = (providerName) => (event, isExpanded) => {
        const accordianProviders = { ...providerExpanded }
        accordianProviders[providerName] = isExpanded
        setProviderExpanded(accordianProviders)
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.analytic) {
            try {
                setAnalytic(JSON.parse(dialogProps.chatflow.analytic))
            } catch (e) {
                setAnalytic({})
                console.error(e)
            }
        }

        return () => {
            setAnalytic({})
            setProviderExpanded({})
        }
    }, [dialogProps])

    return (
        <>
            {analyticProviders.map((provider, index) => (
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
                            {analytic[provider.name] && analytic[provider.name].status && (
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
                                        data={analytic[provider.name] ? { credential: analytic[provider.name].credentialId } : {}}
                                        inputParam={inputParam}
                                        onSelect={(newValue) => setValue(newValue, provider.name, 'credentialId')}
                                    />
                                )}
                                {providerExpanded[provider.name] && inputParam.type === 'boolean' && (
                                    <SwitchInput
                                        onChange={(newValue) => setValue(newValue, provider.name, inputParam.name)}
                                        value={
                                            analytic[provider.name] ? analytic[provider.name][inputParam.name] : inputParam.default ?? false
                                        }
                                    />
                                )}
                                {providerExpanded[provider.name] &&
                                    (inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                                        <Input
                                            inputParam={inputParam}
                                            onChange={(newValue) => setValue(newValue, provider.name, inputParam.name)}
                                            value={
                                                analytic[provider.name]
                                                    ? analytic[provider.name][inputParam.name]
                                                    : inputParam.default ?? ''
                                            }
                                        />
                                    )}
                            </Box>
                        ))}
                    </AccordionDetails>
                </Accordion>
            ))}
            <StyledButton style={{ marginBottom: 10, marginTop: 10 }} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

AnalyseFlow.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default AnalyseFlow
