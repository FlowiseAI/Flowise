import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState, forwardRef } from 'react'
import ReactJson from 'flowise-react-json-view'
import DatePicker from 'react-datepicker'
import moment from 'moment/moment'
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
    Collapse
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconChevronsUp, IconChevronsDown } from '@tabler/icons'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import HistoryEmptySVG from '@/assets/images/upsert_history_empty.svg'
import vectorstoreApi from '@/api/vectorstore'
import useApi from '@/hooks/useApi'

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
    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell scope='row'>{moment(props.upsertHistory.date).format('DD-MMM-YY')}</TableCell>
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
                            <Box sx={{ mt: 1, mb: 2, borderRadius: '15px', border: '1px solid' }}>
                                <ReactJson
                                    theme={props.isDarkMode ? 'ocean' : 'rjv-default'}
                                    style={{ padding: 10, borderRadius: 10 }}
                                    src={props.upsertHistory.flowData}
                                    name={null}
                                    quotesOnKeys={false}
                                    enableClipboard={false}
                                    displayDataTypes={false}
                                    collapsed={3}
                                />
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
    isDarkMode: PropTypes.bool
}

const UpsertHistoryDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()
    const getUpsertHistoryApi = useApi(vectorstoreApi.getUpsertHistory)

    const [chatflowUpsertHistory, setChatflowUpsertHistory] = useState([])
    const [startDate, setStartDate] = useState(new Date().setMonth(new Date().getMonth() - 1))
    const [endDate, setEndDate] = useState(new Date())

    const onStartDateSelected = (date) => {
        setStartDate(date)
        getUpsertHistoryApi.request(dialogProps.chatflow.id, {
            startDate: date,
            endDate: endDate
        })
    }

    const onEndDateSelected = (date) => {
        setEndDate(date)
        getUpsertHistoryApi.request(dialogProps.chatflow.id, {
            endDate: date,
            startDate: startDate
        })
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
            setStartDate(new Date().setMonth(new Date().getMonth() - 1))
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
                                        <TableCell>Date</TableCell>
                                        <TableCell>Added</TableCell>
                                        <TableCell>Updated</TableCell>
                                        <TableCell>Skipped</TableCell>
                                        <TableCell>Deleted</TableCell>
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
