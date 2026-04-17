import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// material-ui
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    useTheme
} from '@mui/material'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import { Available } from '@/ui-component/rbac/available'

// API
import executionsApi from '@/api/executions'
import useApi from '@/hooks/useApi'
import { useSelector } from 'react-redux'

// icons
import execution_empty from '@/assets/images/executions_empty.svg'
import { IconTrash } from '@tabler/icons-react'

// const
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import { ExecutionsListTable } from '@/ui-component/table/ExecutionsListTable'
import { omit } from 'lodash'
import { ExecutionDetails } from './ExecutionDetails'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| AGENT EXECUTIONS ||============================== //

const AgentExecutions = () => {
    const { t } = useTranslation()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const borderColor = theme.palette.grey[900] + 25

    const getAllExecutions = useApi(executionsApi.getAllExecutions)
    const deleteExecutionsApi = useApi(executionsApi.deleteExecutions)
    const getExecutionByIdApi = useApi(executionsApi.getExecutionById)

    const [error, setError] = useState(null)
    const [isLoading, setLoading] = useState(true)
    const [executions, setExecutions] = useState([])
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectedExecutionData, setSelectedExecutionData] = useState([])
    const [selectedMetadata, setSelectedMetadata] = useState({})
    const [selectedExecutionIds, setSelectedExecutionIds] = useState([])
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [filters, setFilters] = useState({
        state: '',
        startDate: null,
        endDate: null,
        agentflowId: '',
        agentflowName: '',
        sessionId: ''
    })

    const handleFilterChange = (field, value) => {
        setFilters({
            ...filters,
            [field]: value
        })
    }

    const onDateChange = (field, date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(0, 0, 0, 0)

        setFilters({
            ...filters,
            [field]: updatedDate
        })
    }

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(() => Number(localStorage.getItem('executionsPageSize') || DEFAULT_ITEMS_PER_PAGE))
    const [total, setTotal] = useState(0)
    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        localStorage.setItem('executionsPageSize', pageLimit)
        applyFilters(page, pageLimit)
    }

    const applyFilters = (page, limit) => {
        setLoading(true)
        // Ensure page and limit are numbers, not objects
        const pageNum = typeof page === 'number' ? page : currentPage
        const limitNum = typeof limit === 'number' ? limit : pageLimit

        const params = {
            page: pageNum,
            limit: limitNum
        }

        if (filters.state) params.state = filters.state

        // Create date strings that preserve the exact date values
        if (filters.startDate) {
            const date = new Date(filters.startDate)
            // Format date as YYYY-MM-DD and set to start of day in UTC
            // This ensures the server sees the same date we've selected regardless of timezone
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            params.startDate = `${year}-${month}-${day}T00:00:00.000Z`
        }

        if (filters.endDate) {
            const date = new Date(filters.endDate)
            // Format date as YYYY-MM-DD and set to end of day in UTC
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            params.endDate = `${year}-${month}-${day}T23:59:59.999Z`
        }

        if (filters.agentflowId) params.agentflowId = filters.agentflowId
        if (filters.agentflowName) params.agentflowName = filters.agentflowName
        if (filters.sessionId) params.sessionId = filters.sessionId

        getAllExecutions.request(params)
    }

    const resetFilters = () => {
        setFilters({
            state: '',
            startDate: null,
            endDate: null,
            agentflowId: '',
            agentflowName: '',
            sessionId: ''
        })
        setCurrentPage(1)
        getAllExecutions.request({ page: 1, limit: pageLimit })
    }

    const handleExecutionSelectionChange = (selectedIds) => {
        setSelectedExecutionIds(selectedIds)
    }

    const handleDeleteDialogOpen = () => {
        if (selectedExecutionIds.length > 0) {
            setOpenDeleteDialog(true)
        }
    }

    const handleDeleteDialogClose = () => {
        setOpenDeleteDialog(false)
    }

    const handleDeleteExecutions = () => {
        deleteExecutionsApi.request(selectedExecutionIds)
        setOpenDeleteDialog(false)
    }

    useEffect(() => {
        getAllExecutions.request({ page: 1, limit: DEFAULT_ITEMS_PER_PAGE })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllExecutions.data) {
            try {
                const { data, total } = getAllExecutions.data
                if (!Array.isArray(data)) return
                setExecutions(data)
                setTotal(total)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllExecutions.data])

    useEffect(() => {
        setLoading(getAllExecutions.loading)
    }, [getAllExecutions.loading])

    useEffect(() => {
        setError(getAllExecutions.error)
    }, [getAllExecutions.error])

    useEffect(() => {
        if (deleteExecutionsApi.data) {
            // Refresh the executions list
            getAllExecutions.request({
                page: currentPage,
                limit: pageLimit
            })
            setSelectedExecutionIds([])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteExecutionsApi.data])

    useEffect(() => {
        if (getExecutionByIdApi.data) {
            const execution = getExecutionByIdApi.data
            const executionDetails =
                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
            setSelectedExecutionData(executionDetails)
            const newMetadata = {
                ...omit(execution, ['executionData']),
                agentflow: {
                    ...selectedMetadata.agentflow
                }
            }
            setSelectedMetadata(newMetadata)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getExecutionByIdApi.data])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader title={t('agentExecution.title')} description={t('agentExecution.description')} />

                    {/* Filter Section */}
                    <Box sx={{ mb: 2, width: '100%' }}>
                        <Grid container spacing={2} alignItems='center'>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size='small'>
                                    <InputLabel id='state-select-label'>{t('common.labels.state')}</InputLabel>
                                    <Select
                                        labelId='state-select-label'
                                        value={filters.state}
                                        label={t('common.labels.state')}
                                        onChange={(e) => handleFilterChange('state', e.target.value)}
                                        size='small'
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: borderColor
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: customization.isDarkMode ? '#fff' : 'inherit'
                                            }
                                        }}
                                    >
                                        <MenuItem value=''>{t('agentExecution.filters.state.items.all')}</MenuItem>
                                        <MenuItem value='INPROGRESS'>{t('agentExecution.filters.state.items.inProgress')}</MenuItem>
                                        <MenuItem value='FINISHED'>{t('agentExecution.filters.state.items.finished')}</MenuItem>
                                        <MenuItem value='ERROR'>{t('common.labels.error')}</MenuItem>
                                        <MenuItem value='TERMINATED'>{t('agentExecution.filters.state.items.terminated')}</MenuItem>
                                        <MenuItem value='TIMEOUT'>{t('agentExecution.filters.state.items.timeout')}</MenuItem>
                                        <MenuItem value='STOPPED'>{t('agentExecution.filters.state.items.stopped')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <DatePicker
                                    selected={filters.startDate}
                                    onChange={(date) => onDateChange('startDate', date)}
                                    selectsStart
                                    startDate={filters.startDate}
                                    className='form-control'
                                    wrapperClassName='datePicker'
                                    maxDate={new Date()}
                                    customInput={
                                        <TextField
                                            size='small'
                                            label={t('agentExecution.filters.startDate')}
                                            fullWidth
                                            sx={{
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: borderColor
                                                }
                                            }}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                                <DatePicker
                                    selected={filters.endDate}
                                    onChange={(date) => onDateChange('endDate', date)}
                                    selectsEnd
                                    endDate={filters.endDate}
                                    className='form-control'
                                    wrapperClassName='datePicker'
                                    minDate={filters.startDate}
                                    maxDate={new Date()}
                                    customInput={
                                        <TextField
                                            size='small'
                                            label={t('agentExecution.filters.endDate')}
                                            fullWidth
                                            sx={{
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: borderColor
                                                }
                                            }}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                                <TextField
                                    fullWidth
                                    label={t('agentExecution.filters.agentflow')}
                                    value={filters.agentflowName}
                                    onChange={(e) => handleFilterChange('agentflowName', e.target.value)}
                                    size='small'
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: borderColor
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                                <TextField
                                    fullWidth
                                    label={t('agentExecution.filters.sessionId')}
                                    value={filters.sessionId}
                                    onChange={(e) => handleFilterChange('sessionId', e.target.value)}
                                    size='small'
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: borderColor
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Stack direction='row' spacing={1}>
                                    <Button
                                        variant='contained'
                                        color='primary'
                                        onClick={() => applyFilters(currentPage, pageLimit)}
                                        size='small'
                                    >
                                        {t('common.actions.apply')}
                                    </Button>
                                    <Button variant='outlined' onClick={resetFilters} size='small'>
                                        {t('agentExecution.actions.reset')}
                                    </Button>
                                    <Available permissions={['executions:delete']}>
                                        <Tooltip title={t('agentExecution.actions.deleteSelected')}>
                                            <span>
                                                <IconButton
                                                    sx={{ height: 30, width: 30 }}
                                                    size='small'
                                                    color='error'
                                                    onClick={handleDeleteDialogOpen}
                                                    edge='end'
                                                    disabled={selectedExecutionIds.length === 0}
                                                >
                                                    <IconTrash />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Available>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>

                    {executions?.length > 0 && (
                        <>
                            <ExecutionsListTable
                                data={executions}
                                isLoading={isLoading}
                                onSelectionChange={handleExecutionSelectionChange}
                                onExecutionRowClick={(execution) => {
                                    setOpenDrawer(true)
                                    const executionDetails =
                                        typeof execution.executionData === 'string'
                                            ? JSON.parse(execution.executionData)
                                            : execution.executionData
                                    setSelectedExecutionData(executionDetails)
                                    setSelectedMetadata(omit(execution, ['executionData']))
                                }}
                            />

                            {/* Pagination and Page Size Controls */}
                            {!isLoading && total > 0 && (
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            )}

                            <ExecutionDetails
                                open={openDrawer}
                                execution={selectedExecutionData}
                                metadata={selectedMetadata}
                                onClose={() => setOpenDrawer(false)}
                                onProceedSuccess={() => {
                                    setOpenDrawer(false)
                                    getAllExecutions.request()
                                }}
                                onUpdateSharing={() => {
                                    getAllExecutions.request()
                                }}
                                onRefresh={(executionId) => {
                                    getAllExecutions.request()
                                    getExecutionByIdApi.request(executionId)
                                }}
                            />
                        </>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog
                        open={openDeleteDialog}
                        onClose={handleDeleteDialogClose}
                        aria-labelledby='alert-dialog-title'
                        aria-describedby='alert-dialog-description'
                    >
                        <DialogTitle id='alert-dialog-title'>{t('agentExecution.dialogs.confirmDeletion.title')}</DialogTitle>
                        <DialogContent>
                            <DialogContentText id='alert-dialog-description'>
                                {t('agentExecution.dialogs.confirmDeletion.description', { count: selectedExecutionIds.length })}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleDeleteDialogClose} color='primary'>
                                {t('common.actions.cancel')}
                            </Button>
                            <Button onClick={handleDeleteExecutions} color='error'>
                                {t('common.actions.delete')}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {!isLoading && (!executions || executions.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                    src={execution_empty}
                                    alt='execution_empty'
                                />
                            </Box>
                            <div>{t('agentExecution.dialogs.confirmDeletion.executionEmpty')}</div>
                        </Stack>
                    )}
                </Stack>
            )}
        </MainCard>
    )
}

export default AgentExecutions
