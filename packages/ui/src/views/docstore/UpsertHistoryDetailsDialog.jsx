import { useState } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import {
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
    TableCell
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { TableViewOnly } from '@/ui-component/table/Table'
import StatsCard from '@/ui-component/cards/StatsCard'

// const
import { baseURL } from '@/store/constant'

const UpsertHistoryDetailsDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }
    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 5,
                        marginTop: '10px'
                    }}
                >
                    <StatsCard title='Added' stat={dialogProps.numAdded ?? 0} />
                    <StatsCard title='Updated' stat={dialogProps.numUpdated ?? 0} />
                    <StatsCard title='Skipped' stat={dialogProps.numSkipped ?? 0} />
                    <StatsCard title='Deleted' stat={dialogProps.numDeleted ?? 0} />
                </div>
                <div>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                            <TableBody>
                                <TableRow sx={{ '& td': { border: 0 } }}>
                                    <TableCell sx={{ pb: 0, pt: 0 }} colSpan={6}>
                                        <Box sx={{ mt: 1, mb: 2 }}>
                                            {(dialogProps.flowData ?? []).map((node, index) => {
                                                return (
                                                    <Accordion
                                                        expanded={nodeConfigExpanded[node.id] || false}
                                                        onChange={handleAccordionChange(node.id)}
                                                        key={index}
                                                        disableGutters
                                                    >
                                                        <AccordionSummary
                                                            expandIcon={<ExpandMoreIcon />}
                                                            aria-controls={`nodes-accordian-${node.name}`}
                                                            id={`nodes-accordian-header-${node.name}`}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
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
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'row',
                                                                        width: 'max-content',
                                                                        borderRadius: 15,
                                                                        background: 'rgb(254,252,191)',
                                                                        padding: 5,
                                                                        paddingLeft: 10,
                                                                        paddingRight: 10,
                                                                        marginLeft: 10
                                                                    }}
                                                                >
                                                                    <span style={{ color: 'rgb(116,66,16)', fontSize: '0.825rem' }}>
                                                                        {node.id}
                                                                    </span>
                                                                </div>
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
                </div>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

UpsertHistoryDetailsDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default UpsertHistoryDetailsDialog
