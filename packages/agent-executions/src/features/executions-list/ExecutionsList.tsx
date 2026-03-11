import { useEffect, useState } from 'react'
import { Stack, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material'
import { omit } from 'lodash'
import { useApiContext } from '../../infrastructure/store/ApiContext'
import { useApi } from '../../infrastructure/api/hooks'
import { ExecutionsListTable } from './ExecutionsListTable'
import { ExecutionFilters } from './ExecutionFilters'
import { ExecutionDetails } from '../execution-details/ExecutionDetails'
import { EmptyState } from '../../atoms/EmptyState'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '../../atoms/TablePagination'
import type { Execution, ExecutionFilters as ExecutionFiltersType, ExecutionNode, ExecutionMetadata } from '../../types'

export const ExecutionsList = () => {
    const { executionsApi } = useApiContext()

    const getAllExecutions = useApi(executionsApi.getAllExecutions)
    const deleteExecutionsApi = useApi(executionsApi.deleteExecutions)
    const getExecutionByIdApi = useApi(executionsApi.getExecutionById)

    const [isLoading, setLoading] = useState(true)
    const [executions, setExecutions] = useState<Execution[]>([])
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectedExecutionData, setSelectedExecutionData] = useState<ExecutionNode[]>([])
    const [selectedMetadata, setSelectedMetadata] = useState<ExecutionMetadata>({} as ExecutionMetadata)
    const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([])
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [filters, setFilters] = useState<ExecutionFiltersType>({
        state: '',
        startDate: null,
        endDate: null,
        agentflowId: '',
        agentflowName: '',
        sessionId: ''
    })

    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const handleFilterChange = (field: string, value: unknown) => {
        setFilters({ ...filters, [field]: value })
    }

    const onDateChange = (field: string, date: Date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(0, 0, 0, 0)
        setFilters({ ...filters, [field]: updatedDate })
    }

    const onChange = (page: number, limit: number) => {
        setCurrentPage(page)
        setPageLimit(limit)
        applyFilters(page, limit)
    }

    const applyFilters = (page?: number, limit?: number) => {
        setLoading(true)
        const pageNum = typeof page === 'number' ? page : currentPage
        const limitNum = typeof limit === 'number' ? limit : pageLimit

        const params: Record<string, unknown> = { page: pageNum, limit: limitNum }

        if (filters.state) params.state = filters.state

        if (filters.startDate) {
            const date = new Date(filters.startDate)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            params.startDate = `${year}-${month}-${day}T00:00:00.000Z`
        }

        if (filters.endDate) {
            const date = new Date(filters.endDate)
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

    const handleDeleteDialogOpen = () => {
        if (selectedExecutionIds.length > 0) {
            setOpenDeleteDialog(true)
        }
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
                const { data, total } = getAllExecutions.data as { data: Execution[]; total: number }
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
        if (deleteExecutionsApi.data) {
            getAllExecutions.request({ page: currentPage, limit: pageLimit })
            setSelectedExecutionIds([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteExecutionsApi.data])

    useEffect(() => {
        if (getExecutionByIdApi.data) {
            const execution = getExecutionByIdApi.data as Execution
            const executionDetails =
                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
            setSelectedExecutionData(executionDetails as ExecutionNode[])
            const newMetadata = {
                ...(omit(execution, ['executionData']) as ExecutionMetadata),
                agentflow: {
                    ...selectedMetadata.agentflow
                }
            }
            setSelectedMetadata(newMetadata)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getExecutionByIdApi.data])

    return (
        <Stack flexDirection='column' sx={{ gap: 3 }}>
            <ExecutionFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onDateChange={onDateChange}
                onApply={() => applyFilters(currentPage, pageLimit)}
                onReset={resetFilters}
                onDelete={handleDeleteDialogOpen}
                selectedCount={selectedExecutionIds.length}
            />

            {executions?.length > 0 && (
                <>
                    <ExecutionsListTable
                        data={executions}
                        isLoading={isLoading}
                        onSelectionChange={setSelectedExecutionIds}
                        onExecutionRowClick={(execution) => {
                            setOpenDrawer(true)
                            const executionDetails =
                                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
                            setSelectedExecutionData(executionDetails as ExecutionNode[])
                            setSelectedMetadata(omit(execution, ['executionData']) as ExecutionMetadata)
                        }}
                    />

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

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete {selectedExecutionIds.length} execution
                        {selectedExecutionIds.length !== 1 ? 's' : ''}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color='primary'>
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteExecutions} color='error'>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {!isLoading && (!executions || executions.length === 0) && <EmptyState />}
        </Stack>
    )
}
