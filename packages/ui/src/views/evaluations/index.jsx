import React, { useEffect, useState, useCallback } from 'react'
import * as PropTypes from 'prop-types'
import moment from 'moment/moment'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import {
    Checkbox,
    Skeleton,
    TableCell,
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import evaluationApi from '@/api/evaluations'
import useApi from '@/hooks/useApi'

// Hooks
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { useError } from '@/store/context/ErrorContext'

// project
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import CreateEvaluationDialog from '@/views/evaluations/CreateEvaluationDialog'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// icons
import {
    IconChartHistogram,
    IconPlus,
    IconChartBar,
    IconRefresh,
    IconTrash,
    IconX,
    IconChevronsUp,
    IconChevronsDown,
    IconPlayerPlay,
    IconPlayerPause
} from '@tabler/icons-react'
import empty_evalSVG from '@/assets/images/empty_evals.svg'

const EvalsEvaluation = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    useNotifier()
    const { error } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const createNewEvaluation = useApi(evaluationApi.createEvaluation)
    const getAllEvaluations = useApi(evaluationApi.getAllEvaluations)

    const [showNewEvaluationDialog, setShowNewEvaluationDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [isTableLoading, setTableLoading] = useState(false)
    const [selected, setSelected] = useState([])
    const [autoRefresh, setAutoRefresh] = useState(false)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)
    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllEvaluations.request(params)
    }

    const onSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = rows.filter((item) => item?.latestEval).map((n) => n.id)
            setSelected(newSelected)
            return
        }
        setSelected([])
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

    const createEvaluation = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Start New Evaluation',
            data: {}
        }
        setDialogProps(dialogProp)
        setShowNewEvaluationDialog(true)
    }

    const deleteEvaluationsAllVersions = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${selected.length} ${
                selected.length > 1 ? 'evaluations' : 'evaluation'
            }? This will delete all versions of the evaluation.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const isDeleteAllVersion = true
                const deleteResp = await evaluationApi.deleteEvaluations(selected, isDeleteAllVersion)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: `${selected.length} ${selected.length > 1 ? 'evaluations' : 'evaluation'} deleted`,
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
                    onRefresh()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete ${selected.length > 1 ? 'evaluations' : 'evaluation'}: ${
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
            setSelected([])
        }
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllEvaluations.data) {
            const evalRows = getAllEvaluations.data.data
            setTotal(getAllEvaluations.data.total)
            if (evalRows) {
                // Prepare the data for the table
                for (let i = 0; i < evalRows.length; i++) {
                    const evalRow = evalRows[i]
                    evalRows[i].runDate = moment(evalRow.runDate).format('DD-MMM-YYYY, hh:mm:ss A')
                    evalRows[i].average_metrics =
                        typeof evalRow.average_metrics === 'object' ? evalRow.average_metrics : JSON.parse(evalRow.average_metrics)
                    evalRows[i].usedFlows =
                        typeof evalRow.chatflowName === 'object' ? evalRow.chatflowName : JSON.parse(evalRow.chatflowName)
                    evalRows[i].chatIds = typeof evalRow.chatflowId === 'object' ? evalRow.chatflowId : JSON.parse(evalRow.chatflowId)
                }
                setRows(evalRows)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllEvaluations.data])

    useEffect(() => {
        if (createNewEvaluation.data) {
            const evalRows = createNewEvaluation.data
            for (let i = 0; i < evalRows.length; i++) {
                const evalRow = evalRows[i]
                evalRows[i].runDate = moment(evalRow.runDate).format('DD-MMM-YYYY, hh:mm:ss A')
                evalRows[i].average_metrics =
                    typeof evalRow.average_metrics === 'object' ? evalRow.average_metrics : JSON.parse(evalRow.average_metrics)
                evalRows[i].usedFlows = typeof evalRow.chatflowName === 'object' ? evalRow.chatflowName : JSON.parse(evalRow.chatflowName)
                evalRows[i].chatIds = typeof evalRow.chatflowId === 'object' ? evalRow.chatflowId : JSON.parse(evalRow.chatflowId)
            }
            setRows(evalRows)
        }
        setLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewEvaluation.data])

    const onConfirm = (evaluationData) => {
        setShowNewEvaluationDialog(false)
        setLoading(true)
        createNewEvaluation.request(evaluationData)
    }

    useEffect(() => {
        if (createNewEvaluation.error) {
            // Change to Notifstack
            enqueueSnackbar({
                message: `Failed to create new evaluation: ${
                    typeof createNewEvaluation.error.response?.data === 'object'
                        ? createNewEvaluation.error.response.data.message
                        : createNewEvaluation.error.response?.data || createNewEvaluation.error.message || 'Unknown error'
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
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewEvaluation.error])

    const onRefresh = useCallback(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllEvaluations])

    useEffect(() => {
        setTableLoading(getAllEvaluations.loading)
    }, [getAllEvaluations.loading])

    useEffect(() => {
        let intervalId = null

        if (autoRefresh) {
            intervalId = setInterval(() => {
                onRefresh()
            }, 5000)
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [autoRefresh, onRefresh])

    const toggleAutoRefresh = () => {
        setAutoRefresh(!autoRefresh)
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader isBackButton={false} isEditButton={false} search={false} title={'Evaluations'} description=''>
                            <ToggleButton
                                value='auto-refresh'
                                selected={autoRefresh}
                                onChange={toggleAutoRefresh}
                                size='small'
                                sx={{
                                    borderRadius: 2,
                                    height: '100%',
                                    backgroundColor: 'transparent',
                                    color: autoRefresh ? '#ff9800' : '#4caf50',
                                    border: '1px solid transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        color: autoRefresh ? '#f57c00' : '#388e3c',
                                        border: '1px solid transparent'
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: 'transparent',
                                        color: '#ff9800',
                                        border: '1px solid transparent',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            color: '#f57c00',
                                            border: '1px solid transparent'
                                        }
                                    }
                                }}
                                title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh (every 5s)'}
                            >
                                {autoRefresh ? <IconPlayerPause /> : <IconPlayerPlay />}
                            </ToggleButton>
                            <IconButton
                                sx={{
                                    borderRadius: 2,
                                    height: '100%',
                                    color: theme.palette.secondary.main,
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        color: theme.palette.secondary.dark
                                    }
                                }}
                                onClick={onRefresh}
                                title='Refresh'
                            >
                                <IconRefresh />
                            </IconButton>
                            <StyledPermissionButton
                                permissionId={'evaluations:create'}
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={createEvaluation}
                                startIcon={<IconPlus />}
                            >
                                New Evaluation
                            </StyledPermissionButton>
                        </ViewHeader>
                        {selected.length > 0 && (
                            <StyledPermissionButton
                                permissionId={'evaluations:delete'}
                                sx={{ mt: 1, mb: 2, width: 'max-content' }}
                                variant='outlined'
                                onClick={deleteEvaluationsAllVersions}
                                color='error'
                                startIcon={<IconTrash />}
                            >
                                Delete {selected.length} {selected.length === 1 ? 'evaluation' : 'evaluations'}
                            </StyledPermissionButton>
                        )}
                        {!isTableLoading && rows.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={empty_evalSVG}
                                        alt='empty_evalSVG'
                                    />
                                </Box>
                                <div>No Evaluations Yet</div>
                            </Stack>
                        ) : (
                            <>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <TableCell padding='checkbox'>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={selected.length === (rows.filter((item) => item?.latestEval) || []).length}
                                                        onChange={onSelectAllClick}
                                                        inputProps={{
                                                            'aria-label': 'select all'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell width={10}> </TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Latest Version</TableCell>
                                                <TableCell>Average Metrics</TableCell>
                                                <TableCell>Last Evaluated</TableCell>
                                                <TableCell>Flow(s)</TableCell>
                                                <TableCell>Dataset</TableCell>
                                                <TableCell> </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isTableLoading ? (
                                                <>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                </>
                                            ) : (
                                                <>
                                                    {rows
                                                        .filter((item) => item?.latestEval)
                                                        .map((item, index) => (
                                                            <EvaluationRunRow
                                                                rows={rows.filter((row) => row.name === item.name)}
                                                                item={item}
                                                                key={index}
                                                                theme={theme}
                                                                selected={selected}
                                                                customization={customization}
                                                                onRefresh={onRefresh}
                                                                handleSelect={handleSelect}
                                                            />
                                                        ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {/* Pagination and Page Size Controls */}
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showNewEvaluationDialog && (
                <CreateEvaluationDialog
                    show={showNewEvaluationDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowNewEvaluationDialog(false)}
                    onConfirm={onConfirm}
                ></CreateEvaluationDialog>
            )}
            <ConfirmDialog />
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

function EvaluationRunRow(props) {
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [open, setOpen] = useState(false)
    const [childSelected, setChildSelected] = useState([])

    const theme = useTheme()
    const navigate = useNavigate()
    const { confirm } = useConfirm()
    const dispatch = useDispatch()

    const showResults = (item) => {
        navigate(`/evaluation_results/${item.id}`)
    }

    const goToDataset = (id) => {
        window.open(`/dataset_rows/${id}`, '_blank')
    }

    const onSelectAllChildClick = (event) => {
        if (event.target.checked) {
            const newSelected = (props?.rows || []).map((n) => n.id)
            setChildSelected(newSelected)
            return
        }
        setChildSelected([])
    }

    const handleSelectChild = (event, id) => {
        const selectedIndex = childSelected.indexOf(id)
        let newSelected = []

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(childSelected, id)
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(childSelected.slice(1))
        } else if (selectedIndex === childSelected.length - 1) {
            newSelected = newSelected.concat(childSelected.slice(0, -1))
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(childSelected.slice(0, selectedIndex), childSelected.slice(selectedIndex + 1))
        }
        setChildSelected(newSelected)
    }

    const deleteChildEvaluations = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${childSelected.length} ${childSelected.length > 1 ? 'evaluations' : 'evaluation'}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await evaluationApi.deleteEvaluations(childSelected)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: `${childSelected.length} evaluations deleted.`,
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
                    props.onRefresh()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete Evaluation: ${
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
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#ffc107'
            case 'completed':
                return '#52b69a'
            case 'error':
                return '#f44336'
            default:
                return '#bcbcbc'
        }
    }

    const getPassRateColor = (passPcnt) => {
        if (passPcnt > 90) {
            return '#52b69a'
        } else if (passPcnt >= 50) {
            return '#f48c06'
        } else {
            return '#f44336'
        }
    }

    return (
        <React.Fragment>
            <StyledTableRow>
                <StyledTableCell padding='checkbox'>
                    <Checkbox
                        color='primary'
                        checked={props.selected.indexOf(props.item.id) !== -1}
                        onChange={(event) => props.handleSelect(event, props.item.id)}
                    />
                </StyledTableCell>
                <StyledTableCell>
                    <div
                        style={{
                            display: 'flex',
                            width: '20px',
                            height: '20px',
                            backgroundColor: getStatusColor(props.item.status),
                            borderRadius: '50%'
                        }}
                        title={props.item?.status === 'error' ? props.item?.average_metrics?.error : ''}
                    ></div>
                </StyledTableCell>
                <StyledTableCell>{props.item.name}</StyledTableCell>
                <StyledTableCell>
                    {props.item.version}{' '}
                    {props.item.version > 0 && (
                        <IconButton aria-label='expand row' size='small' color='inherit' onClick={() => setOpen(!open)}>
                            {props.item.version > 0 && open ? <IconChevronsUp /> : <IconChevronsDown />}
                        </IconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>
                    <Stack flexDirection='row' sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                            variant='outlined'
                            size='small'
                            color='info'
                            label={
                                props.item.average_metrics?.totalRuns
                                    ? 'Total Runs: ' + props.item.average_metrics?.totalRuns
                                    : 'Total Runs: N/A'
                            }
                        />
                        {props.item.average_metrics?.averageCost && (
                            <Chip variant='outlined' size='small' color='info' label={props.item.average_metrics?.averageCost} />
                        )}
                        <Chip
                            variant='outlined'
                            size='small'
                            color='info'
                            label={
                                props.item.average_metrics?.averageLatency
                                    ? 'Avg Latency: ' + props.item.average_metrics?.averageLatency + 'ms'
                                    : 'Avg Latency: N/A'
                            }
                        />
                        {props.item.average_metrics?.passPcnt >= 0 && (
                            <Chip
                                variant='raised'
                                size='small'
                                sx={{
                                    color: 'white',
                                    backgroundColor: getPassRateColor(props.item.average_metrics?.passPcnt)
                                }}
                                label={
                                    props.item.average_metrics?.passPcnt
                                        ? 'Pass Rate: ' + props.item.average_metrics.passPcnt + '%'
                                        : 'Pass Rate: N/A'
                                }
                            />
                        )}
                    </Stack>
                </StyledTableCell>
                <StyledTableCell>{moment(props.item.runDate).format('DD-MMM-YYYY, hh:mm:ss A')}</StyledTableCell>
                <StyledTableCell>
                    <Stack flexDirection='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        {props.item?.usedFlows?.map((usedFlow, index) => (
                            <Chip
                                key={index}
                                style={{
                                    width: 'max-content',
                                    borderRadius: '25px'
                                }}
                                label={usedFlow}
                            ></Chip>
                        ))}
                    </Stack>
                </StyledTableCell>
                <StyledTableCell>
                    <Chip
                        clickable
                        style={{
                            border: 'none',
                            width: 'max-content',
                            borderRadius: '25px',
                            boxShadow: props.customization.isDarkMode
                                ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                        }}
                        variant='outlined'
                        label={props.item.datasetName}
                        onClick={() => goToDataset(props.item.datasetId)}
                    ></Chip>
                </StyledTableCell>
                <TableCell>
                    <IconButton
                        title='View Results'
                        color='primary'
                        disabled={props.item.status === 'pending'}
                        onClick={() => showResults(props.item)}
                    >
                        <IconChartHistogram />
                    </IconButton>
                </TableCell>
            </StyledTableRow>
            {open && childSelected.length > 0 && (
                <TableRow sx={{ '& td': { border: 0 } }}>
                    <StyledTableCell colSpan={12}>
                        <Button
                            sx={{ mt: 2, width: 'max-content' }}
                            variant='outlined'
                            onClick={deleteChildEvaluations}
                            color='error'
                            startIcon={<IconTrash />}
                        >
                            Delete {childSelected.length} {childSelected.length === 1 ? 'evaluation' : 'evaluations'}
                        </Button>
                    </StyledTableCell>
                </TableRow>
            )}
            {open && (
                <>
                    <TableRow sx={{ '& td': { border: 0 } }}>
                        <StyledTableCell colSpan={12} sx={{ p: 2 }}>
                            <Collapse in={open} timeout='auto' unmountOnExit>
                                <Box sx={{ borderRadius: 2, border: 1, borderColor: theme.palette.grey[900] + 25, overflow: 'hidden' }}>
                                    <Table aria-label='chatflow table'>
                                        <TableHead style={{ height: 10 }}>
                                            <TableRow>
                                                <TableCell padding='checkbox'>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={childSelected.length === (props.rows || []).length}
                                                        onChange={onSelectAllChildClick}
                                                    />
                                                </TableCell>
                                                <TableCell>Version</TableCell>
                                                <TableCell>Last Run</TableCell>
                                                <TableCell>Average Metrics</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell> </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {props.rows.length > 0 &&
                                                props.rows.map((childItem, childIndex) => (
                                                    <React.Fragment key={childIndex}>
                                                        <TableRow sx={{ '& td': { border: 0 } }}>
                                                            <StyledTableCell padding='checkbox'>
                                                                <Checkbox
                                                                    color='primary'
                                                                    checked={childSelected.indexOf(childItem.id) !== -1}
                                                                    onChange={(event) => handleSelectChild(event, childItem.id)}
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell>{childItem.version}</StyledTableCell>
                                                            <StyledTableCell>
                                                                {moment(childItem.runDate).format('DD-MMM-YYYY, hh:mm:ss A')}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                <Stack
                                                                    flexDirection='row'
                                                                    sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
                                                                >
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        color='info'
                                                                        label={
                                                                            childItem.average_metrics?.totalRuns
                                                                                ? 'Total Runs: ' + childItem.average_metrics?.totalRuns
                                                                                : 'Total Runs: N/A'
                                                                        }
                                                                    />
                                                                    {childItem.average_metrics?.averageCost && (
                                                                        <Chip
                                                                            variant='outlined'
                                                                            size='small'
                                                                            color='info'
                                                                            label={childItem.average_metrics?.averageCost}
                                                                        />
                                                                    )}
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        color='info'
                                                                        label={
                                                                            childItem.average_metrics?.averageLatency
                                                                                ? 'Avg Latency: ' +
                                                                                  childItem.average_metrics?.averageLatency +
                                                                                  'ms'
                                                                                : 'Avg Latency: N/A'
                                                                        }
                                                                    />
                                                                    {childItem.average_metrics?.passPcnt >= 0 && (
                                                                        <Chip
                                                                            variant='raised'
                                                                            size='small'
                                                                            sx={{
                                                                                color: 'white',
                                                                                backgroundColor: getPassRateColor(
                                                                                    childItem.average_metrics?.passPcnt
                                                                                )
                                                                            }}
                                                                            label={
                                                                                childItem.average_metrics?.passPcnt
                                                                                    ? 'Pass rate: ' +
                                                                                      childItem.average_metrics.passPcnt +
                                                                                      '%'
                                                                                    : 'Pass rate: N/A'
                                                                            }
                                                                        />
                                                                    )}
                                                                </Stack>
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                <Chip
                                                                    variant='contained'
                                                                    size='small'
                                                                    sx={{
                                                                        color: 'white',
                                                                        backgroundColor: getStatusColor(childItem.status)
                                                                    }}
                                                                    label={childItem.status}
                                                                    title={
                                                                        childItem.status === 'error' ? childItem.average_metrics.error : ''
                                                                    }
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                <IconButton
                                                                    title='View Results'
                                                                    color='primary'
                                                                    disabled={childItem.status === 'pending'}
                                                                    onClick={() => showResults(childItem)}
                                                                >
                                                                    <IconChartBar />
                                                                </IconButton>
                                                            </StyledTableCell>
                                                        </TableRow>
                                                    </React.Fragment>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Collapse>
                        </StyledTableCell>
                    </TableRow>
                </>
            )}
        </React.Fragment>
    )
}
EvaluationRunRow.propTypes = {
    item: PropTypes.object,
    selected: PropTypes.array,
    rows: PropTypes.arrayOf(PropTypes.object),
    theme: PropTypes.any,
    customization: PropTypes.object,
    onRefresh: PropTypes.func,
    handleSelect: PropTypes.func
}
export default EvalsEvaluation
