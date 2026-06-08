import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Card
} from '@mui/material'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconX, IconBox, IconVariable } from '@tabler/icons-react'

// API
import useApi from '@/hooks/useApi'
import chatflowsApi from '@/api/chatflows'
import configApi from '@/api/config'
import variablesApi from '@/api/variables'

// utils

const OverrideConfigTable = ({ columns, onToggle, rows, sx }) => {
    const customization = useSelector((state) => state.customization)
    const isDark = customization?.isDarkMode

    const handleChange = (enabled, row) => {
        onToggle(row, enabled)
    }

    const renderCellContent = (key, row) => {
        if (key === 'enabled') {
            return <SwitchInput onChange={(enabled) => handleChange(enabled, row)} value={row.enabled} />
        } else if (key === 'type' && row.schema) {
            let schemaContent
            if (Array.isArray(row.schema)) {
                schemaContent =
                    '[<br>' +
                    row.schema
                        .map(
                            (item) =>
                                `&nbsp;&nbsp;${JSON.stringify(
                                    {
                                        [item.name]: item.type
                                    },
                                    null,
                                    2
                                )}`
                        )
                        .join(',<br>') +
                    '<br>]'
            } else if (typeof row.schema === 'object' && row.schema !== null) {
                schemaContent = JSON.stringify(row.schema, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
            } else {
                schemaContent = 'No schema available'
            }

            return (
                <Stack direction='row' alignItems='center' spacing={0.5}>
                    <Typography sx={{ fontSize: '0.8rem' }}>{row[key]}</Typography>
                    <TooltipWithParser title={`<div>Schema:<br/>${schemaContent}</div>`} />
                </Stack>
            )
        } else {
            return <Typography sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{row[key]}</Typography>
        }
    }

    const columnLabels = { label: 'Label', name: 'Name', type: 'Type', enabled: 'On' }

    return (
        <TableContainer
            component={Paper}
            elevation={0}
            sx={{
                borderRadius: 0,
                boxShadow: 'none',
                bgcolor: 'transparent'
            }}
        >
            <Table size='small' sx={{ ...sx }} aria-label='override config table'>
                <TableHead>
                    <TableRow>
                        {columns.map((col, index) => (
                            <TableCell
                                key={index}
                                sx={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    py: 1.5,
                                    borderBottom: '1px solid',
                                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                    ...(col === 'enabled' ? { width: 50, textAlign: 'center' } : {}),
                                    ...(col === 'type' ? { width: 100 } : {})
                                }}
                            >
                                {columnLabels[col] || col.charAt(0).toUpperCase() + col.slice(1)}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            {Object.keys(row).map((key, index) => {
                                if (key !== 'id' && key !== 'schema') {
                                    return (
                                        <TableCell
                                            key={index}
                                            sx={{
                                                py: 1.5,
                                                borderBottom: '1px solid',
                                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                                ...(key === 'enabled' ? { textAlign: 'center' } : {})
                                            }}
                                        >
                                            {renderCellContent(key, row)}
                                        </TableCell>
                                    )
                                }
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

OverrideConfigTable.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    sx: PropTypes.object,
    onToggle: PropTypes.func
}

const OverrideConfig = ({ dialogProps, hideTitle = false }) => {
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [nodeConfig, setNodeConfig] = useState(null)
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [overrideConfigStatus, setOverrideConfigStatus] = useState(
        apiConfig?.overrideConfig?.status !== undefined ? apiConfig.overrideConfig.status : false
    )
    const [nodeOverrides, setNodeOverrides] = useState(apiConfig?.overrideConfig?.nodes !== undefined ? apiConfig.overrideConfig.nodes : {})
    const [variableOverrides, setVariableOverrides] = useState(
        apiConfig?.overrideConfig?.variables !== undefined ? apiConfig.overrideConfig.variables : []
    )

    const getConfigApi = useApi(configApi.getConfig)
    const getAllVariablesApi = useApi(variablesApi.getAllVariables)

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    const formatObj = () => {
        let apiConfig = JSON.parse(dialogProps.chatflow.apiConfig)
        if (apiConfig === null || apiConfig === undefined) {
            apiConfig = {}
        }

        let overrideConfig = { status: overrideConfigStatus }
        if (overrideConfigStatus) {
            const filteredNodeOverrides = {}
            for (const key in nodeOverrides) {
                filteredNodeOverrides[key] = nodeOverrides[key].filter((node) => node.enabled)
            }

            overrideConfig = {
                ...overrideConfig,
                nodes: filteredNodeOverrides,
                variables: variableOverrides.filter((node) => node.enabled)
            }
        }
        apiConfig.overrideConfig = overrideConfig

        return apiConfig
    }

    const onNodeOverrideToggle = (node, property, status) => {
        setNodeOverrides((prev) => {
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

    const onVariableOverrideToggle = (id, status) => {
        setVariableOverrides((prev) => {
            return prev.map((item) => {
                if (item.id === id) {
                    item.enabled = status
                }
                return item
            })
        })
    }

    const groupByNodeLabel = (nodes) => {
        const result = {}
        const newNodeOverrides = {}
        const seenNodes = new Set()

        nodes.forEach((item) => {
            const { node, nodeId, label, name, type, schema } = item
            seenNodes.add(node)

            if (!result[node]) {
                result[node] = {
                    nodeIds: [],
                    params: []
                }
            }

            if (!newNodeOverrides[node]) {
                // If overrideConfigStatus is true, copy existing config for this node
                newNodeOverrides[node] = overrideConfigStatus ? [...(nodeOverrides[node] || [])] : []
            }

            if (!result[node].nodeIds.includes(nodeId)) result[node].nodeIds.push(nodeId)

            const param = { label, name, type, schema }

            if (!result[node].params.some((existingParam) => JSON.stringify(existingParam) === JSON.stringify(param))) {
                result[node].params.push(param)
                const paramExists = newNodeOverrides[node].some(
                    (existingParam) => existingParam.label === label && existingParam.name === name && existingParam.type === type
                )
                if (!paramExists) {
                    newNodeOverrides[node].push({ ...param, enabled: false })
                }
            }
        })

        // Sort the nodeIds array
        for (const node in result) {
            result[node].nodeIds.sort()
        }
        setNodeConfig(result)

        if (!overrideConfigStatus) {
            setNodeOverrides(newNodeOverrides)
        } else {
            const updatedNodeOverrides = { ...newNodeOverrides }

            Object.keys(updatedNodeOverrides).forEach((node) => {
                if (!seenNodes.has(node)) {
                    delete updatedNodeOverrides[node]
                }
            })

            seenNodes.forEach((node) => {
                if (!updatedNodeOverrides[node]) {
                    updatedNodeOverrides[node] = newNodeOverrides[node]
                }
            })

            setNodeOverrides(updatedNodeOverrides)
        }
    }

    const groupByVariableLabel = (variables) => {
        const newVariables = []
        const seenVariables = new Set()

        variables.forEach((item) => {
            const { id, name, type } = item
            seenVariables.add(id)

            const param = { id, name, type }
            const existingVariable = variableOverrides?.find((existingParam) => existingParam.id === id)

            if (existingVariable) {
                if (!newVariables.some((existingVariable) => existingVariable.id === id)) {
                    newVariables.push({ ...existingVariable })
                }
            } else {
                if (!newVariables.some((existingVariable) => existingVariable.id === id)) {
                    newVariables.push({ ...param, enabled: false })
                }
            }
        })

        if (variableOverrides) {
            variableOverrides.forEach((existingVariable) => {
                if (!seenVariables.has(existingVariable.id)) {
                    const index = newVariables.findIndex((newVariable) => newVariable.id === existingVariable.id)
                    if (index !== -1) {
                        newVariables.splice(index, 1)
                    }
                }
            })
        }

        setVariableOverrides(newVariables)
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
            getAllVariablesApi.request()
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

    useEffect(() => {
        if (getAllVariablesApi.data) {
            groupByVariableLabel(getAllVariablesApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllVariablesApi.data])

    return (
        <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
            {!hideTitle && (
                <Typography variant='h3'>
                    Override Configuration
                    <TooltipWithParser
                        style={{ mb: 1, mt: 2, marginLeft: 10 }}
                        title={
                            'Enable or disable which properties of the flow configuration can be overridden. Refer to the <a href="https://docs.flowiseai.com/using-flowise/prediction#configuration-override" target="_blank">documentation</a> for more information.'
                        }
                    />
                </Typography>
            )}
            <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                <SwitchInput label='Enable Override Configuration' onChange={setOverrideConfigStatus} value={overrideConfigStatus} />
                {overrideConfigStatus && (
                    <>
                        {nodeOverrides && nodeConfig && (
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: customization.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                                    p: 2
                                }}
                            >
                                <Stack sx={{ mt: 1, mb: 2, ml: 1, alignItems: 'center' }} direction='row' spacing={2}>
                                    <IconBox />
                                    <Typography variant='h4'>Nodes</Typography>
                                </Stack>
                                <Stack direction='column'>
                                    {Object.keys(nodeOverrides)
                                        .sort()
                                        .map((nodeLabel) => (
                                            <Accordion
                                                expanded={nodeConfigExpanded[nodeLabel] || false}
                                                onChange={handleAccordionChange(nodeLabel)}
                                                key={nodeLabel}
                                                disableGutters
                                                sx={{
                                                    '&:before': {
                                                        bgcolor: customization.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
                                                    }
                                                }}
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
                                                <AccordionDetails sx={{ p: 0 }}>
                                                    <OverrideConfigTable
                                                        rows={nodeOverrides[nodeLabel]}
                                                        columns={
                                                            nodeOverrides[nodeLabel].length > 0
                                                                ? Object.keys(nodeOverrides[nodeLabel][0]).filter(
                                                                      (key) => key !== 'schema' && key !== 'id'
                                                                  )
                                                                : []
                                                        }
                                                        onToggle={(property, status) =>
                                                            onNodeOverrideToggle(nodeLabel, property.name, status)
                                                        }
                                                    />
                                                </AccordionDetails>
                                            </Accordion>
                                        ))}
                                </Stack>
                            </Card>
                        )}
                        {variableOverrides && variableOverrides.length > 0 && (
                            <Card
                                elevation={0}
                                sx={{
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: customization.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                                    p: 2
                                }}
                            >
                                <Stack sx={{ mt: 1, mb: 2, ml: 1, alignItems: 'center' }} direction='row' spacing={2}>
                                    <IconVariable />
                                    <Typography variant='h4'>Variables</Typography>
                                </Stack>
                                <OverrideConfigTable
                                    rows={variableOverrides}
                                    columns={['name', 'type', 'enabled']}
                                    onToggle={(property, status) => onVariableOverrideToggle(property.id, status)}
                                />
                            </Card>
                        )}
                    </>
                )}
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton variant='contained' onClick={onOverrideConfigSave} sx={{ minWidth: 100 }}>
                    Save
                </StyledButton>
            </Box>
        </Stack>
    )
}

OverrideConfig.propTypes = {
    dialogProps: PropTypes.object,
    hideTitle: PropTypes.bool
}

export default OverrideConfig
