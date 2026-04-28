import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { cloneDeep } from 'lodash'
import {
    Button,
    Box,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
    Table,
    TableBody,
    TableContainer,
    TableRow,
    TableCell,
    DialogActions,
    Card,
    Stack,
    Link
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/Settings'
import { IconAlertTriangle } from '@tabler/icons-react'
import { TableViewOnly } from '@/ui-component/table/Table'
import { v4 as uuidv4 } from 'uuid'

// const
import { baseURL } from '@/store/constant'
import nodesApi from '@/api/nodes'

// Hooks
import useApi from '@/hooks/useApi'
import { initNode } from '@/utils/genericHelper'

const DeleteDocStoreDialog = ({ show, dialogProps, onCancel, onDelete }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [vsFlowData, setVSFlowData] = useState([])
    const [rmFlowData, setRMFlowData] = useState([])

    const getVectorStoreNodeApi = useApi(nodesApi.getSpecificNode)
    const getRecordManagerNodeApi = useApi(nodesApi.getSpecificNode)

    const handleAccordionChange = (nodeName) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeName] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    useEffect(() => {
        if (dialogProps.recordManagerConfig) {
            const nodeName = dialogProps.recordManagerConfig.name
            if (nodeName) getRecordManagerNodeApi.request(nodeName)
        }

        if (dialogProps.vectorStoreConfig) {
            const nodeName = dialogProps.vectorStoreConfig.name
            if (nodeName) getVectorStoreNodeApi.request(nodeName)
        }

        return () => {
            setNodeConfigExpanded({})
            setVSFlowData([])
            setRMFlowData([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    // Process Vector Store node data
    useEffect(() => {
        if (getVectorStoreNodeApi.data && dialogProps.vectorStoreConfig) {
            const nodeData = cloneDeep(initNode(getVectorStoreNodeApi.data, uuidv4()))

            const paramValues = []

            for (const inputName in dialogProps.vectorStoreConfig.config) {
                const inputParam = nodeData.inputParams.find((inp) => inp.name === inputName)

                if (!inputParam) continue

                if (inputParam.type === 'credential') continue

                const inputValue = dialogProps.vectorStoreConfig.config[inputName]

                if (!inputValue) continue

                if (typeof inputValue === 'string' && inputValue.startsWith('{{') && inputValue.endsWith('}}')) {
                    continue
                }

                paramValues.push({
                    label: inputParam?.label,
                    name: inputParam?.name,
                    type: inputParam?.type,
                    value: inputValue
                })
            }

            setVSFlowData([
                {
                    label: nodeData.label,
                    name: nodeData.name,
                    category: nodeData.category,
                    id: nodeData.id,
                    paramValues
                }
            ])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getVectorStoreNodeApi.data])

    // Process Record Manager node data
    useEffect(() => {
        if (getRecordManagerNodeApi.data && dialogProps.recordManagerConfig) {
            const nodeData = cloneDeep(initNode(getRecordManagerNodeApi.data, uuidv4()))

            const paramValues = []

            for (const inputName in dialogProps.recordManagerConfig.config) {
                const inputParam = nodeData.inputParams.find((inp) => inp.name === inputName)

                if (!inputParam) continue

                if (inputParam.type === 'credential') continue

                const inputValue = dialogProps.recordManagerConfig.config[inputName]

                if (!inputValue) continue

                if (typeof inputValue === 'string' && inputValue.startsWith('{{') && inputValue.endsWith('}}')) {
                    continue
                }

                paramValues.push({
                    label: inputParam?.label,
                    name: inputParam?.name,
                    type: inputParam?.type,
                    value: inputValue
                })
            }

            setRMFlowData([
                {
                    label: nodeData.label,
                    name: nodeData.name,
                    category: nodeData.category,
                    id: nodeData.id,
                    paramValues
                }
            ])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getRecordManagerNodeApi.data])

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth={dialogProps.recordManagerConfig ? 'md' : 'sm'}
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxHeight: '75vh',
                    position: 'relative',
                    px: 3,
                    pb: 3,
                    overflow: 'auto'
                }}
            >
                <span style={{ marginTop: '20px' }}>{dialogProps.description}</span>
                {dialogProps.vectorStoreConfig && !dialogProps.recordManagerConfig && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 10,
                            background: 'rgb(254,252,191)',
                            padding: 10
                        }}
                    >
                        <IconAlertTriangle size={70} color='orange' />
                        <span style={{ color: 'rgb(116,66,16)', marginLeft: 10 }}>
                            <strong>Note:</strong> Without a Record Manager configured, only the document chunks will be removed from the
                            document store. The actual vector embeddings in your vector store database will remain unchanged. To enable
                            automatic cleanup of vector store data, please configure a Record Manager.{' '}
                            <Link
                                href='https://docs.flowiseai.com/integrations/langchain/record-managers'
                                target='_blank'
                                rel='noopener noreferrer'
                                sx={{ fontWeight: 500, color: 'rgb(116,66,16)', textDecoration: 'underline' }}
                            >
                                Learn more
                            </Link>
                        </span>
                    </div>
                )}
                {vsFlowData && vsFlowData.length > 0 && rmFlowData && rmFlowData.length > 0 && (
                    <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
                        <Stack sx={{ mt: 1, mb: 2, ml: 1, alignItems: 'center' }} direction='row' spacing={2}>
                            <SettingsIcon />
                            <Typography variant='h4'>Configuration</Typography>
                        </Stack>
                        <Stack direction='column'>
                            <TableContainer component={Paper} sx={{ maxHeight: '400px', overflow: 'auto' }}>
                                <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                    <TableBody>
                                        <TableRow sx={{ '& td': { border: 0 } }}>
                                            <TableCell sx={{ pb: 0, pt: 0 }} colSpan={6}>
                                                <Box>
                                                    {([...vsFlowData, ...rmFlowData] || []).map((node, index) => {
                                                        return (
                                                            <Accordion
                                                                expanded={nodeConfigExpanded[node.name] || false}
                                                                onChange={handleAccordionChange(node.name)}
                                                                key={index}
                                                                disableGutters
                                                            >
                                                                <AccordionSummary
                                                                    expandIcon={<ExpandMoreIcon />}
                                                                    aria-controls={`nodes-accordian-${node.name}`}
                                                                    id={`nodes-accordian-header-${node.name}`}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center'
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                width: 40,
                                                                                height: 40,
                                                                                marginRight: 10,
                                                                                borderRadius: '50%',
                                                                                backgroundColor: 'white'
                                                                            }}
                                                                        >
                                                                            <img
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '100%',
                                                                                    padding: 7,
                                                                                    borderRadius: '50%',
                                                                                    objectFit: 'contain'
                                                                                }}
                                                                                alt={node.name}
                                                                                src={`${baseURL}/api/v1/node-icon/${node.name}`}
                                                                            />
                                                                        </div>
                                                                        <Typography variant='h5'>{node.label}</Typography>
                                                                    </div>
                                                                </AccordionSummary>
                                                                <AccordionDetails sx={{ p: 0 }}>
                                                                    {node.paramValues[0] && (
                                                                        <TableViewOnly
                                                                            sx={{ minWidth: 150 }}
                                                                            rows={node.paramValues}
                                                                            columns={Object.keys(node.paramValues[0])}
                                                                        />
                                                                    )}
                                                                </AccordionDetails>
                                                            </Accordion>
                                                        )
                                                    })}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Stack>
                    </Card>
                )}
            </DialogContent>
            <DialogActions sx={{ pr: 3, pb: 3 }}>
                <Button onClick={onCancel} color='primary'>
                    Cancel
                </Button>
                <Button variant='contained' onClick={() => onDelete(dialogProps.type, dialogProps.file)} color='error'>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

DeleteDocStoreDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onDelete: PropTypes.func
}

export default DeleteDocStoreDialog
