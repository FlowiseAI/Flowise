import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState, forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import moment from 'moment/moment'

// MUI
import {
    Stack,
    Box,
    Paper,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    IconButton,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    ListItemButton,
    Collapse,
    Accordion,
    AccordionSummary,
    Typography,
    AccordionDetails,
    Checkbox
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconChevronsUp, IconChevronsDown, IconTrash, IconX } from '@tabler/icons-react'

// Project imports
import { TableViewOnly } from '@/ui-component/table/Table'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import HistoryEmptySVG from '@/assets/images/upsert_history_empty.svg'

// Api
import vectorstoreApi from '@/api/vectorstore'
import useApi from '@/hooks/useApi'

// Store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { baseURL } from '@/store/constant'
import useNotifier from '@/utils/useNotifier'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const DatePickerCustomInput = forwardRef(function DatePickerCustomInput({ value, onClick }, ref) {
    return (
        <ListItemButton style={{ borderRadius: 15, border: '1px solid #e0e0e0' }} onClick={onClick} ref={ref}>
            {value}
        </ListItemButton>
    )
})

DatePickerCustomInput.propTypes = {
    value: PropTypes.string,
    onClick: PropTypes.func
}

function UpsertHistoryRow(props) {
    const [open, setOpen] = useState(false)
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    const isItemSelected = props.selected.indexOf(props.upsertHistory.id) !== -1

    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell padding='checkbox'>
                    <Checkbox
                        color='primary'
                        checked={isItemSelected}
                        onChange={(event) => props.handleSelect(event, props.upsertHistory.id)}
                        inputProps={{
                            'aria-labelledby': props.upsertHistory.id
                        }}
                    />
                </TableCell>
                <TableCell>{moment(props.upsertHistory.date).format('MMMM Do YYYY, h:mm:ss a')}</TableCell>
                <TableCell>{props.upsertHistory.result?.numAdded ?? '0'}</TableCell>
                <TableCell>{props.upsertHistory.result?.numUpdated ?? '0'}</TableCell>
                <TableCell>{props.upsertHistory.result?.numSkipped ?? '0'}</TableCell>
                <TableCell>{props.upsertHistory.result?.numDeleted ?? '0'}</TableCell>
                <TableCell>
                    <IconButton aria-label='expand row' size='small' color='inherit' onClick={() => setOpen(!open)}>
                        {open ? <IconChevronsUp /> : <IconChevronsDown />}
                    </IconButton>
                </TableCell>
            </TableRow>
            {open && (
                <TableRow sx={{ '& td': { border: 0 } }}>
                    <TableCell sx={{ pb: 0, pt: 0 }} colSpan={6}>
                        <Collapse in={open} timeout='auto' unmountOnExit>
                            <Box sx={{ mt: 1, mb: 2 }}>
                                {(props.upsertHistory.flowData ?? []).map((node, index) => {
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
                                                        <span style={{ color: 'rgb(116,66,16)', fontSize: '0.825rem' }}>{node.id}</span>
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
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

UpsertHistoryRow.propTypes = {
    upsertHistory: PropTypes.object,
    theme: PropTypes.any,
    isDarkMode: PropTypes.bool,
    selected: PropTypes.array,
    handleSelect: PropTypes.func
}

const UpsertHistoryDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()
    const getUpsertHistoryApi = useApi(vectorstoreApi.getUpsertHistory)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [chatflowUpsertHistory, setChatflowUpsertHistory] = useState([])
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)))
    const [endDate, setEndDate] = useState(new Date())
    const [selected, setSelected] = useState([])

    const onSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = chatflowUpsertHistory.map((n) => n.id)
            setSelected(newSelected)
            return
        }
        setSelected([])
    }

    const onStartDateSelected = (date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(0, 0, 0, 0)
        setStartDate(updatedDate)
        getUpsertHistoryApi.request(dialogProps.chatflow.id, {
            startDate: updatedDate,
            endDate: endDate
        })
    }

    const onEndDateSelected = (date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(23, 59, 59, 999)
        setEndDate(updatedDate)
        getUpsertHistoryApi.request(dialogProps.chatflow.id, {
            endDate: updatedDate,
            startDate: startDate
        })
    }

    const handleSelect = (event, id) => {
        const selectedIndex = selected.indexOf(id)
        let newSelected = []

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id)
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1))
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1))
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1))
        }
        setSelected(newSelected)
    }

    const handleRemoveHistory = async () => {
        try {
            await vectorstoreApi.deleteUpsertHistory(selected)
            enqueueSnackbar({
                message: 'Succesfully deleted upsert history',
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
            setChatflowUpsertHistory(chatflowUpsertHistory.filter((hist) => !selected.includes(hist.id)))
            setSelected([])
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to delete Upsert History: ${
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
            setSelected([])
        }
    }

    useEffect(() => {
        if (getUpsertHistoryApi.data) {
            setChatflowUpsertHistory(getUpsertHistoryApi.data)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUpsertHistoryApi.data])

    useEffect(() => {
        if (dialogProps.chatflow) {
            getUpsertHistoryApi.request(dialogProps.chatflow.id)
        }

        return () => {
            setChatflowUpsertHistory([])
            setStartDate(new Date(new Date().setMonth(new Date().getMonth() - 1)))
            setEndDate(new Date())
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='lg'
            aria-labelledby='upsert-history-dialog-title'
            aria-describedby='upsert-history-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='upsert-history-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 }}>
                        <div style={{ marginRight: 10 }}>
                            <b style={{ marginRight: 10 }}>From Date</b>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => onStartDateSelected(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                customInput={<DatePickerCustomInput />}
                            />
                        </div>
                        <div style={{ marginRight: 10 }}>
                            <b style={{ marginRight: 10 }}>To Date</b>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => onEndDateSelected(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                maxDate={new Date()}
                                customInput={<DatePickerCustomInput />}
                            />
                        </div>
                    </div>
                    {selected.length > 0 && (
                        <Button
                            sx={{ mt: 1, mb: 2 }}
                            variant='outlined'
                            onClick={handleRemoveHistory}
                            color='error'
                            startIcon={<IconTrash />}
                        >
                            Delete {selected.length} {selected.length === 1 ? 'row' : 'rows'}
                        </Button>
                    )}
                    {chatflowUpsertHistory.length <= 0 && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 7, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                    src={HistoryEmptySVG}
                                    alt='HistoryEmptySVG'
                                />
                            </Box>
                            <div>No Upsert History Yet</div>
                        </Stack>
                    )}
                    {chatflowUpsertHistory.length > 0 && (
                        <TableContainer component={Paper}>
                            <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding='checkbox'>
                                            <Checkbox
                                                color='primary'
                                                checked={selected.length === chatflowUpsertHistory.length}
                                                onChange={onSelectAllClick}
                                                inputProps={{
                                                    'aria-label': 'select all'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>
                                            Added{' '}
                                            <TooltipWithParser
                                                style={{ marginBottom: 2, marginLeft: 10 }}
                                                title={'Number of vector embeddings added to Vector Store'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            Updated{' '}
                                            <TooltipWithParser
                                                style={{ marginBottom: 2, marginLeft: 10 }}
                                                title={
                                                    'Updated existing vector embeddings. Only works when a Record Manager is connected to the Vector Store'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            Skipped{' '}
                                            <TooltipWithParser
                                                style={{ marginBottom: 2, marginLeft: 10 }}
                                                title={
                                                    'Number of same vector embeddings that exists, and were skipped re-upserting again. Only works when a Record Manager is connected to the Vector Store'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            Deleted{' '}
                                            <TooltipWithParser
                                                style={{ marginBottom: 2, marginLeft: 10 }}
                                                title={
                                                    'Deleted vector embeddings. Only works when a Record Manager with a Cleanup method is connected to the Vector Store'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>Details</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {chatflowUpsertHistory.map((upsertHistory, index) => (
                                        <UpsertHistoryRow
                                            key={index}
                                            upsertHistory={upsertHistory}
                                            theme={theme}
                                            isDarkMode={customization.isDarkMode}
                                            selected={selected}
                                            handleSelect={handleSelect}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Close</Button>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

UpsertHistoryDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default UpsertHistoryDialog
