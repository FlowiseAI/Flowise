import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    IconButton,
    InputAdornment,
    List,
    OutlinedInput,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { useDispatch, useSelector } from 'react-redux'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import { useEffect, useState } from 'react'
import chatflowsApi from '@/api/chatflows'
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import PropTypes from 'prop-types'
import useApi from '@/hooks/useApi'
import configApi from '@/api/config'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// Icons

// API

// utils

const OverrideConfigTable = ({ columns, onToggle, rows, sx }) => {
    const handleChange = (enabled, row) => {
        onToggle(row.name, enabled)
    }

    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650, ...sx }} aria-label='simple table'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index}>{col.charAt(0).toUpperCase() + col.slice(1)}</TableCell>
                            ))}
                            <TableCell>Enable</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => (
                                    <TableCell key={index}>{row[key]}</TableCell>
                                ))}
                                <TableCell>
                                    <SwitchInput onChange={(enabled) => handleChange(enabled, row)} value={row.enabled} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

OverrideConfigTable.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    sx: PropTypes.object,
    onToggle: PropTypes.func
}

const Security = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [inputFields, setInputFields] = useState([''])
    const [errorMessage, setErrorMessage] = useState('')
    const [chatbotConfig, setChatbotConfig] = useState({})
    const [rateLimitStatus, setRateLimitStatus] = useState(apiConfig?.rateLimit?.status !== undefined ? apiConfig.rateLimit.status : false)
    const [limitMax, setLimitMax] = useState(apiConfig?.rateLimit?.limitMax ?? '')
    const [limitDuration, setLimitDuration] = useState(apiConfig?.rateLimit?.limitDuration ?? '')
    const [limitMsg, setLimitMsg] = useState(apiConfig?.rateLimit?.limitMsg ?? '')
    const [nodeConfig, setNodeConfig] = useState(null)
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [overrideConfigStatus, setOverrideConfigStatus] = useState(
        apiConfig?.overrideConfig?.status !== undefined ? apiConfig.overrideConfig.status : false
    )
    const [overrideConfig, setOverrideConfig] = useState(
        apiConfig?.overrideConfig?.config !== undefined ? apiConfig.overrideConfig.config : {}
    )

    const getConfigApi = useApi(configApi.getConfig)

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    const addInputField = () => {
        setInputFields([...inputFields, ''])
    }

    const removeInputFields = (index) => {
        const rows = [...inputFields]
        rows.splice(index, 1)
        setInputFields(rows)
    }

    const handleInputChange = (index, evnt) => {
        const { value } = evnt.target
        const list = [...inputFields]
        list[index] = value
        setInputFields(list)
    }

    const onAllowedDomainsSave = async () => {
        try {
            let value = {
                allowedOrigins: [...inputFields],
                allowedOriginsError: errorMessage
            }
            chatbotConfig.allowedOrigins = value.allowedOrigins
            chatbotConfig.allowedOriginsError = value.allowedOriginsError

            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Allowed Origins Saved',
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
                message: `Failed to save Allowed Origins: ${
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

    const formatObj = () => {
        const obj = {
            overrideConfig: { status: overrideConfigStatus },
            rateLimit: { status: rateLimitStatus }
        }

        if (rateLimitStatus) {
            const rateLimitValuesBoolean = [!limitMax, !limitDuration, !limitMsg]
            const rateLimitFilledValues = rateLimitValuesBoolean.filter((value) => value === false)
            if (rateLimitFilledValues.length >= 1 && rateLimitFilledValues.length <= 2) {
                throw new Error('Need to fill all rate limit input fields')
            } else if (rateLimitFilledValues.length === 3) {
                obj.rateLimit = {
                    ...obj.rateLimit,
                    limitMax,
                    limitDuration,
                    limitMsg
                }
            }
        }

        if (overrideConfigStatus) {
            obj.overrideConfig = {
                ...obj.overrideConfig,
                config: overrideConfig
            }
        }

        return obj
    }

    const handleRateLimitStatus = (value) => {
        setRateLimitStatus(value)
    }

    const checkDisabled = () => {
        if (rateLimitStatus) {
            if (limitMax === '' || limitDuration === '' || limitMsg === '') {
                return true
            }
        }
        return false
    }

    const onRateLimitSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, {
                apiConfig: JSON.stringify(formatObj())
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Rate Limit Configuration Saved',
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
                message: `Failed to save Rate Limit Configuration: ${
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

    const onTextChanged = (value, fieldName) => {
        switch (fieldName) {
            case 'limitMax':
                setLimitMax(value)
                break
            case 'limitDuration':
                setLimitDuration(value)
                break
            case 'limitMsg':
                setLimitMsg(value)
                break
        }
    }

    const textField = (message, fieldName, fieldLabel, fieldType = 'string', placeholder = '') => {
        return (
            <Box sx={{ pt: 2, pb: 2 }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start'
                    }}
                >
                    <Typography sx={{ mb: 1 }}>{fieldLabel}</Typography>
                    <OutlinedInput
                        id={fieldName}
                        type={fieldType}
                        fullWidth
                        value={message}
                        placeholder={placeholder}
                        name={fieldName}
                        size='small'
                        onChange={(e) => {
                            onTextChanged(e.target.value, fieldName)
                        }}
                    />
                </div>
            </Box>
        )
    }

    const onPropertyToggle = (node, property, status) => {
        setOverrideConfig((prev) => {
            const newConfig = { ...prev }
            newConfig[node] = newConfig[node].map((item) => {
                if (item.name === property) {
                    item.enabled = status
                }
                return item
            })
            return newConfig
        })
    }

    const groupByNodeLabel = (nodes) => {
        const result = {}
        const overrideConfig = {}

        nodes.forEach((item) => {
            const { node, nodeId, label, name, type } = item

            if (!result[node]) {
                result[node] = {
                    nodeIds: [],
                    params: []
                }
            }

            if (!overrideConfig[node]) {
                overrideConfig[node] = []
            }

            if (!result[node].nodeIds.includes(nodeId)) result[node].nodeIds.push(nodeId)

            const param = { label, name, type }

            if (!result[node].params.some((existingParam) => JSON.stringify(existingParam) === JSON.stringify(param))) {
                result[node].params.push(param)
                overrideConfig[node].push({ ...param, enabled: false })
            }
        })

        // Sort the nodeIds array
        for (const node in result) {
            result[node].nodeIds.sort()
        }
        setNodeConfig(result)

        if (!overrideConfigStatus) {
            setOverrideConfig(overrideConfig)
        }
    }

    const onOverrideConfigSave = async () => {
        try {
            const saveResp = await chatflowsApi.updateChatflow(chatflowid, {
                apiConfig: JSON.stringify(formatObj())
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Override Configuration Saved',
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
                message: `Failed to save Override Configuration: ${
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

    useEffect(() => {
        if (dialogProps.chatflow) {
            getConfigApi.request(dialogProps.chatflow.id)
        }
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            try {
                let chatbotConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
                setChatbotConfig(chatbotConfig || {})
                if (chatbotConfig.allowedOrigins) {
                    let inputFields = [...chatbotConfig.allowedOrigins]
                    setInputFields(inputFields)
                } else {
                    setInputFields([''])
                }
                if (chatbotConfig.allowedOriginsError) {
                    setErrorMessage(chatbotConfig.allowedOriginsError)
                } else {
                    setErrorMessage('')
                }
            } catch (e) {
                setInputFields([''])
                setErrorMessage('')
            }
        }

        return () => {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (getConfigApi.data) {
            groupByNodeLabel(getConfigApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getConfigApi.data])

    return (
        <Stack sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                {/*Rate Limit*/}
                <Typography variant='h4' sx={{ mb: 1 }}>
                    Rate Limit{' '}
                    <TooltipWithParser
                        style={{ mb: 1, mt: 2, marginLeft: 10 }}
                        title={
                            'Visit <a target="_blank" href="https://docs.flowiseai.com/rate-limit">Rate Limit Setup Guide</a> to set up Rate Limit correctly in your hosting environment.'
                        }
                    />
                </Typography>
                <SwitchInput label='Enable Rate Limit' onChange={handleRateLimitStatus} value={rateLimitStatus} />
                {rateLimitStatus && (
                    <>
                        {textField(limitMax, 'limitMax', 'Message Limit per Duration', 'number', '5')}
                        {textField(limitDuration, 'limitDuration', 'Duration in Second', 'number', '60')}
                        {textField(limitMsg, 'limitMsg', 'Limit Message', 'string', 'You have reached the quota')}
                    </>
                )}
                <StyledButton
                    disabled={checkDisabled()}
                    style={{ marginBottom: 10, marginTop: 10 }}
                    variant='contained'
                    onClick={onRateLimitSave}
                >
                    Save
                </StyledButton>
            </Box>
            <Box>
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Typography variant='h4' sx={{ mb: 1 }}>
                            Allowed Domains
                            <TooltipWithParser
                                style={{ mb: 1, mt: 2, marginLeft: 10 }}
                                title={'Your chatbot will only work when used from the following domains.'}
                            />
                        </Typography>
                    </Box>
                    <List>
                        {inputFields.map((origin, index) => {
                            return (
                                <div key={index} style={{ display: 'flex', width: '100%' }}>
                                    <Box sx={{ width: '100%', mb: 1 }}>
                                        <OutlinedInput
                                            sx={{ width: '100%' }}
                                            key={index}
                                            type='text'
                                            onChange={(e) => handleInputChange(index, e)}
                                            size='small'
                                            value={origin}
                                            name='origin'
                                            placeholder='https://example.com'
                                            endAdornment={
                                                <InputAdornment position='end' sx={{ padding: '2px' }}>
                                                    {inputFields.length > 1 && (
                                                        <IconButton
                                                            sx={{ height: 30, width: 30 }}
                                                            size='small'
                                                            color='error'
                                                            disabled={inputFields.length === 1}
                                                            onClick={() => removeInputFields(index)}
                                                            edge='end'
                                                        >
                                                            <IconTrash />
                                                        </IconButton>
                                                    )}
                                                </InputAdornment>
                                            }
                                        />
                                    </Box>
                                    <Box sx={{ width: '5%', mb: 1 }}>
                                        {index === inputFields.length - 1 && (
                                            <IconButton color='primary' onClick={addInputField}>
                                                <IconPlus />
                                            </IconButton>
                                        )}
                                    </Box>
                                </div>
                            )
                        })}
                    </List>
                </Box>
                <Box sx={{ pt: 2, pb: 2 }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start'
                        }}
                    >
                        <Typography sx={{ mb: 1 }}>
                            Error Message
                            <TooltipWithParser
                                style={{ mb: 1, mt: 2, marginLeft: 10 }}
                                title={'Custom error message that will be shown when for unauthorized domain'}
                            />
                        </Typography>
                        <OutlinedInput
                            sx={{ width: '100%' }}
                            type='text'
                            size='small'
                            fullWidth
                            placeholder='Unauthorized domain!'
                            value={errorMessage}
                            onChange={(e) => {
                                setErrorMessage(e.target.value)
                            }}
                        />
                    </div>
                </Box>
                <StyledButton variant='contained' onClick={onAllowedDomainsSave}>
                    Save
                </StyledButton>
            </Box>
            <Box>
                <Typography variant='h4' sx={{ mb: 1 }}>
                    Override Configuration
                    <TooltipWithParser
                        style={{ mb: 1, mt: 2, marginLeft: 10 }}
                        title={'Enable or disable which properties of the chatbot configuration can be overridden by the user.'}
                    />
                </Typography>
                <SwitchInput label='Enable Override Configuration' onChange={setOverrideConfigStatus} value={overrideConfigStatus} />
                {overrideConfigStatus && overrideConfig && nodeConfig && getConfigApi.data && getConfigApi.data.length > 0 && (
                    <>
                        {Object.keys(overrideConfig)
                            .sort()
                            .map((nodeLabel) => (
                                <Accordion
                                    expanded={nodeConfigExpanded[nodeLabel] || false}
                                    onChange={handleAccordionChange(nodeLabel)}
                                    key={nodeLabel}
                                    disableGutters
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`nodes-accordian-${nodeLabel}`}
                                        id={`nodes-accordian-header-${nodeLabel}`}
                                    >
                                        <Stack flexDirection='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Typography variant='h5'>{nodeLabel}</Typography>
                                            {nodeConfig[nodeLabel].nodeIds.length > 0 &&
                                                nodeConfig[nodeLabel].nodeIds.map((nodeId, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            width: 'max-content',
                                                            borderRadius: 15,
                                                            background: 'rgb(254,252,191)',
                                                            padding: 5,
                                                            paddingLeft: 10,
                                                            paddingRight: 10
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: 'rgb(116,66,16)',
                                                                fontSize: '0.825rem'
                                                            }}
                                                        >
                                                            {nodeId}
                                                        </span>
                                                    </div>
                                                ))}
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <OverrideConfigTable
                                            rows={overrideConfig[nodeLabel]}
                                            columns={Object.keys(nodeConfig[nodeLabel].params[0]).slice(-3)}
                                            onToggle={(property, status) => onPropertyToggle(nodeLabel, property, status)}
                                        />
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                    </>
                )}
                <StyledButton variant='contained' onClick={onOverrideConfigSave}>
                    Save
                </StyledButton>
            </Box>
        </Stack>
    )
}

Security.propTypes = {
    dialogProps: PropTypes.object
}

export default Security
