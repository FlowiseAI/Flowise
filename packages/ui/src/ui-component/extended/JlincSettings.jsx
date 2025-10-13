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
import jlincPNG from '@/assets/images/jlinc.svg'

// store
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'
import Image from 'next/image'

const JlincSettings = ({ dialogProps }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [analytic, setAnalytic] = useState({})
    const [expanded, setExpanded] = useState(true)

    const jlincProvider = {
        label: 'JLINC',
        name: 'jlinc',
        icon: jlincPNG,
        url: 'https://jlinc.com',
        description: 'Auditable trace logging for compliance and governance',
        inputs: [
            {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['jlincApi']
            },
            {
                label: 'Agreement ID',
                name: 'agreementId',
                type: 'string',
                optional: true,
                description: 'The UUID of the agreement that transactions occur under',
                placeholder: '00000000-0000-0000-0000-000000000000'
            },
            {
                label: 'System Prefix',
                name: 'systemPrefix',
                type: 'string',
                optional: false,
                description: 'The prefix to give DID user shortnames',
                placeholder: 'MyProject'
            },
            {
                label: 'On/Off',
                name: 'status',
                type: 'boolean',
                optional: true
            }
        ]
    }

    const onSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                analytic: JSON.stringify(analytic)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'JLINC Configuration Saved',
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
                message: `Failed to save JLINC Configuration: ${
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

    const setValue = (value, inputParamName) => {
        let newVal = { ...analytic }
        if (!Object.prototype.hasOwnProperty.call(analytic, 'jlinc')) {
            newVal.jlinc = {}
        }
        newVal.jlinc[inputParamName] = value
        setAnalytic(newVal)
    }

    const handleAccordionChange = (event, isExpanded) => {
        setExpanded(isExpanded)
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.analytic) {
            try {
                const parsed = JSON.parse(dialogProps.chatflow.analytic)
                // Load entire analytic config to preserve other providers (Langfuse, LangSmith, etc.)
                setAnalytic(parsed || {})
            } catch (e) {
                setAnalytic({})
                console.error(e)
            }
        }

        return () => {
            setAnalytic({})
            setExpanded(true)
        }
    }, [dialogProps])

    return (
        <>
            <Box sx={{ mb: 2 }}>
                <Typography variant='body2' sx={{ mb: 2, color: 'text.secondary' }}>
                    {jlincProvider.description}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    Note: Environment variables (JLINC_*) will override these settings if configured.
                </Typography>
            </Box>
            <Accordion expanded={expanded} onChange={handleAccordionChange} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='jlinc-content' id='jlinc-header'>
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
                                <Image
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        padding: 10,
                                        objectFit: 'contain'
                                    }}
                                    alt='JLINC'
                                    src={jlincProvider.icon}
                                />
                            </div>
                        </ListItemAvatar>
                        <ListItemText
                            sx={{ ml: 1 }}
                            primary={jlincProvider.label}
                            secondary={
                                <a target='_blank' rel='noreferrer' href={jlincProvider.url}>
                                    {jlincProvider.url}
                                </a>
                            }
                        />
                        {analytic.jlinc && analytic.jlinc.status && (
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
                    {jlincProvider.inputs.map((inputParam, index) => (
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
                            {expanded && inputParam.type === 'credential' && (
                                <CredentialInputHandler
                                    data={analytic.jlinc ? { credential: analytic.jlinc.credentialId } : {}}
                                    inputParam={inputParam}
                                    onSelect={(newValue) => setValue(newValue, 'credentialId')}
                                />
                            )}
                            {expanded && inputParam.type === 'boolean' && (
                                <SwitchInput
                                    onChange={(newValue) => setValue(newValue, inputParam.name)}
                                    value={analytic.jlinc ? analytic.jlinc[inputParam.name] : inputParam.default ?? false}
                                />
                            )}
                            {expanded &&
                                (inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                                    <Input
                                        inputParam={inputParam}
                                        onChange={(newValue) => setValue(newValue, inputParam.name)}
                                        value={analytic.jlinc ? analytic.jlinc[inputParam.name] : inputParam.default ?? ''}
                                    />
                                )}
                        </Box>
                    ))}
                </AccordionDetails>
            </Accordion>
            <StyledButton style={{ marginBottom: 10, marginTop: 10 }} variant='contained' onClick={onSave}>
                Save
            </StyledButton>
        </>
    )
}

JlincSettings.propTypes = {
    dialogProps: PropTypes.object
}

export default JlincSettings
