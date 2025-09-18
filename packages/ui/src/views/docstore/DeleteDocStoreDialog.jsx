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
    Checkbox,
    FormControlLabel,
    DialogActions
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [removeFromVS, setRemoveFromVS] = useState(false)
    const [vsFlowData, setVSFlowData] = useState([])
    const [rmFlowData, setRMFlowData] = useState([])

    const getSpecificNodeApi = useApi(nodesApi.getSpecificNode)

    const handleAccordionChange = (nodeName) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeName] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    useEffect(() => {
        if (dialogProps.recordManagerConfig) {
            const nodeName = dialogProps.recordManagerConfig.name
            if (nodeName) getSpecificNodeApi.request(nodeName)

            if (dialogProps.vectorStoreConfig) {
                const nodeName = dialogProps.vectorStoreConfig.name
                if (nodeName) getSpecificNodeApi.request(nodeName)
            }
        }

        return () => {
            setNodeConfigExpanded({})
            setRemoveFromVS(false)
            setVSFlowData([])
            setRMFlowData([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (getSpecificNodeApi.data) {
            const nodeData = cloneDeep(initNode(getSpecificNodeApi.data, uuidv4()))

            let config = 'vectorStoreConfig'
            if (nodeData.category === 'Record Manager') config = 'recordManagerConfig'

            const paramValues = []

            for (const inputName in dialogProps[config].config) {
                const inputParam = nodeData.inputParams.find((inp) => inp.name === inputName)

                if (!inputParam) continue

                if (inputParam.type === 'credential') continue

                let paramValue = {}

                const inputValue = dialogProps[config].config[inputName]

                if (!inputValue) continue

                if (typeof inputValue === 'string' && inputValue.startsWith('{{') && inputValue.endsWith('}}')) {
                    continue
                }

                paramValue = {
                    label: inputParam?.label,
                    name: inputParam?.name,
                    type: inputParam?.type,
                    value: inputValue
                }
                paramValues.push(paramValue)
            }

            if (config === 'vectorStoreConfig') {
                setVSFlowData([
                    {
                        label: nodeData.label,
                        name: nodeData.name,
                        category: nodeData.category,
                        id: nodeData.id,
                        paramValues
                    }
                ])
            } else if (config === 'recordManagerConfig') {
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
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificNodeApi.data])

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
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                <span style={{ marginTop: '20px' }}>{dialogProps.description}</span>
                {dialogProps.type === 'STORE' && dialogProps.recordManagerConfig && (
                    <FormControlLabel
                        control={<Checkbox checked={removeFromVS} onChange={(event) => setRemoveFromVS(event.target.checked)} />}
                        label='Remove data from vector store and record manager'
                    />
                )}
                {removeFromVS && (
                    <div>
                        <TableContainer component={Paper}>
                            <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                <TableBody>
                                    <TableRow sx={{ '& td': { border: 0 } }}>
                                        <TableCell sx={{ pb: 0, pt: 0 }} colSpan={6}>
                                            <Box>
                                                {([...vsFlowData, ...rmFlowData] || []).map((node, index) => {
                                                    return (
                                                        <Accordion
                                                            expanded={nodeConfigExpanded[node.name] || true}
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
                                                                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
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
                                                            <AccordionDetails>
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
                        <span style={{ marginTop: '30px', fontStyle: 'italic', color: '#b35702' }}>
                            * Only data that were upserted with Record Manager will be deleted from vector store
                        </span>
                    </div>
                )}
            </DialogContent>
            <DialogActions sx={{ pr: 3, pb: 3 }}>
                <Button onClick={onCancel} color='primary'>
                    Cancel
                </Button>
                <Button variant='contained' onClick={() => onDelete(dialogProps.type, dialogProps.file, removeFromVS)} color='error'>
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
