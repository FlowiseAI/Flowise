import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// material-ui
import { Pagination, Box, Stack, TextField, MenuItem, Button, Grid, FormControl, InputLabel, Select } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'

// API
import useApi from '@/hooks/useApi'
import executionsApi from '@/api/executions'

// icons
import execution_empty from '@/assets/images/executions_empty.svg'

// const
import { ExecutionsListTable } from '@/ui-component/table/ExecutionsListTable'
import { ExecutionDetails } from './ExecutionDetails'
import { omit } from 'lodash'

// ==============================|| AGENT EXECUTIONS ||============================== //

const AgentExecutions = () => {
    const getAllExecutions = useApi(executionsApi.getAllExecutions)

    const [error, setError] = useState(null)
    const [isLoading, setLoading] = useState(true)
    const [executions, setExecutions] = useState([])
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectedExecutionData, setSelectedExecutionData] = useState([])
    const [selectedMetadata, setSelectedMetadata] = useState({})
    const [filters, setFilters] = useState({
        state: '',
        startDate: null,
        endDate: null,
        agentflowId: '',
        sessionId: ''
    })
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    })

    const handleFilterChange = (field, value) => {
        setFilters({
            ...filters,
            [field]: value
        })
    }

    const handlePageChange = (event, newPage) => {
        setPagination({
            ...pagination,
            page: newPage
        })
    }

    const applyFilters = () => {
        setLoading(true)
        const params = {
            page: pagination.page,
            limit: pagination.limit
        }

        if (filters.state) params.state = filters.state
        if (filters.startDate) params.startDate = filters.startDate.toISOString()
        if (filters.endDate) params.endDate = filters.endDate.toISOString()
        if (filters.agentflowId) params.agentflowId = filters.agentflowId
        if (filters.sessionId) params.sessionId = filters.sessionId

        getAllExecutions.request(params)
    }

    const resetFilters = () => {
        setFilters({
            state: '',
            startDate: null,
            endDate: null,
            agentflowId: '',
            sessionId: ''
        })
        getAllExecutions.request()
    }

    useEffect(() => {
        getAllExecutions.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllExecutions.data) {
            try {
                const { data, total } = getAllExecutions.data
                if (!Array.isArray(data)) return
                setExecutions(data)
                setPagination((prev) => ({ ...prev, total }))
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
        applyFilters()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader title='Agent Executions' />

                    {/* Filter Section */}
                    <Box sx={{ mb: 2, width: '100%' }}>
                        <Grid container spacing={2} alignItems='center'>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size='small'>
                                    <InputLabel id='state-select-label'>State</InputLabel>
                                    <Select
                                        labelId='state-select-label'
                                        value={filters.state}
                                        label='State'
                                        onChange={(e) => handleFilterChange('state', e.target.value)}
                                        size='small'
                                    >
                                        <MenuItem value=''>All</MenuItem>
                                        <MenuItem value='INPROGRESS'>In Progress</MenuItem>
                                        <MenuItem value='FINISHED'>Finished</MenuItem>
                                        <MenuItem value='ERROR'>Error</MenuItem>
                                        <MenuItem value='TERMINATED'>Terminated</MenuItem>
                                        <MenuItem value='TIMEOUT'>Timeout</MenuItem>
                                        <MenuItem value='STOPPED'>Stopped</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <DatePicker
                                    selected={filters.startDate}
                                    onChange={(date) => handleFilterChange('startDate', date)}
                                    dateFormat='yyyy-MM-dd'
                                    className='form-control'
                                    wrapperClassName='datePicker'
                                    maxDate={new Date()}
                                    customInput={<TextField size='small' label='Start date' fullWidth />}
                                />
                            </Grid>
                            <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                                <DatePicker
                                    selected={filters.endDate}
                                    onChange={(date) => handleFilterChange('endDate', date)}
                                    dateFormat='yyyy-MM-dd'
                                    className='form-control'
                                    wrapperClassName='datePicker'
                                    minDate={filters.startDate}
                                    maxDate={new Date()}
                                    customInput={<TextField size='small' label='End date' fullWidth />}
                                />
                            </Grid>
                            <Grid sx={{ ml: -1 }} item xs={12} md={2}>
                                <TextField
                                    fullWidth
                                    label='Session ID'
                                    value={filters.sessionId}
                                    onChange={(e) => handleFilterChange('sessionId', e.target.value)}
                                    size='small'
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Stack direction='row' spacing={1}>
                                    <Button variant='contained' color='primary' onClick={applyFilters} size='small'>
                                        Apply
                                    </Button>
                                    <Button variant='outlined' onClick={resetFilters} size='small'>
                                        Reset
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>

                    <ExecutionsListTable
                        data={executions}
                        isLoading={isLoading}
                        onExecutionRowClick={(execution) => {
                            setOpenDrawer(true)
                            const executionDetails =
                                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
                            setSelectedExecutionData(executionDetails)
                            setSelectedMetadata(omit(execution, ['executionData']))
                        }}
                    />

                    {/* Pagination */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={Math.ceil(pagination.total / pagination.limit)}
                            page={pagination.page}
                            onChange={handlePageChange}
                            color='primary'
                        />
                    </Box>

                    <ExecutionDetails
                        open={openDrawer}
                        execution={selectedExecutionData}
                        metadata={selectedMetadata}
                        onClose={() => setOpenDrawer(false)}
                        onProceedSuccess={() => {
                            setOpenDrawer(false)
                            getAllExecutions.request()
                        }}
                    />

                    {!isLoading && (!executions || executions.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                    src={execution_empty}
                                    alt='execution_empty'
                                />
                            </Box>
                            <div>No Executions Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}
        </MainCard>
    )
}

export default AgentExecutions
