import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
import { useTheme } from '@mui/material/styles'

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
    const handleChange = (enabled, row) => {
        onToggle(row, enabled)
    }

    const renderCellContent = (key, row) => {
        if (key === 'enabled') {
            return <SwitchInput onChange={(enabled) => handleChange(enabled, row)} value={row.enabled} />
        } else if (key === 'type' && row.schema) {
            // If there's schema information, add a tooltip
            let schemaContent
            if (Array.isArray(row.schema)) {
                // Handle array format: [{ name: "field", type: "string" }, ...]
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
                // Handle object format: { "field": "string", "field2": "number", ... }
                schemaContent = JSON.stringify(row.schema, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
            } else {
                schemaContent = 'No schema available'
            }

            return (
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography>{row[key]}</Typography>
                    <TooltipWithParser title={`<div>Schema:<br/>${schemaContent}</div>`} />
                </Stack>
            )
        } else {
            return row[key]
        }
    }

    return (
        <TableContainer component={Paper}>
            <Table size='small' sx={{ minWidth: 650, ...sx }} aria-label='simple table'>
                <TableHead>
                    <TableRow>
                        {columns.map((col, index) => (
                            <TableCell key={index}>{col.charAt(0).toUpperCase() + col.slice(1)}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            {Object.keys(row).map((key, index) => {
                                if (key !== 'id' && key !== 'schema') {
                                    return <TableCell key={index}>{renderCellContent(key, row)}</TableCell>
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

const OverrideConfig = ({ dialogProps }) => {
    const dispatch = useDispatch()
    const chatflow = useSelector((state) => state.canvas.chatflow)
    const chatflowid = chatflow.id
    const apiConfig = chatflow.apiConfig ? JSON.parse(chatflow.apiConfig) : {}

    useNotifier()
    const theme = useTheme()

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
        <Stack direction='column' spacing={2} sx={{ alignItems: 'start' }}>
            <Typography variant='h3'>
                Override Configuration
                <TooltipWithParser
                    style={{ mb: 1, mt: 2, marginLeft: 10 }}
                    title={
                        'Enable or disable which properties of the flow configuration can be overridden. Refer to the <a href="https://docs.flowiseai.com/using-flowise/api#override-config" target="_blank">documentation</a> for more information.'
                    }
                />
            </Typography>
            <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
                <SwitchInput label='Enable Override Configuration' onChange={setOverrideConfigStatus} value={overrideConfigStatus} />
                {overrideConfigStatus && (
                    <>
                        {nodeOverrides && nodeConfig && (
                            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
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
                            <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
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
            <StyledButton variant='contained' onClick={onOverrideConfigSave}>
                Save
            </StyledButton>
        </Stack>
    )
}

OverrideConfig.propTypes = {
    dialogProps: PropTypes.object
}

export default OverrideConfig
