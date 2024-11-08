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
    Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// Project import
import RateLimit from '@/ui-component/extended/RateLimit'
import AllowedDomains from '@/ui-component/extended/AllowedDomains'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { SwitchInput } from '@/ui-component/switch/Switch'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// Icons
import { IconX } from '@tabler/icons-react'

// API
import useApi from '@/hooks/useApi'
import chatflowsApi from '@/api/chatflows'
import configApi from '@/api/config'

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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => (
                                    <TableCell key={index}>
                                        {key === 'enabled' ? (
                                            <SwitchInput onChange={(enabled) => handleChange(enabled, row)} value={row.enabled} />
                                        ) : (
                                            row[key]
                                        )}
                                    </TableCell>
                                ))}
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

    const formatObj = () => {
        const obj = {
            overrideConfig: { status: overrideConfigStatus }
        }

        if (overrideConfigStatus) {
            obj.overrideConfig = {
                ...obj.overrideConfig,
                config: overrideConfig
            }
        }

        return obj
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
                <RateLimit />
            </Box>
            <Box>
                <AllowedDomains dialogProps={dialogProps} />
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
                                            columns={overrideConfig[nodeLabel].length > 0 ? Object.keys(overrideConfig[nodeLabel][0]) : []}
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
