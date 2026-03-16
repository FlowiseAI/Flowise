import { useEffect } from 'react'
import { Stack, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material'
import { useApiContext } from '@/infrastructure/store/ApiContext'
import type { GetAllExecutionsParams } from '@/infrastructure/api/executions'
import { ExecutionsListTable } from './ExecutionsListTable'
import { ExecutionFilters } from './ExecutionFilters'
import { ExecutionDetails } from '../execution-details/ExecutionDetails'
import { EmptyState } from '@/atoms/EmptyState'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/atoms/TablePagination'
import type { Execution } from '@/core/types'
import { useExecutionListState } from './state'
import { useApi } from '@/infrastructure/api/hooks'

export const ExecutionsList = () => {
    const { executionsApi } = useApiContext()
    const { state, actions } = useExecutionListState({ initialPageLimit: DEFAULT_ITEMS_PER_PAGE })

    const getAllExecutions = useApi(executionsApi.getAllExecutions)
    const deleteExecutionsApi = useApi(executionsApi.deleteExecutions)
    const getExecutionByIdApi = useApi(executionsApi.getExecutionById)

    useEffect(() => {
        getAllExecutions.request({ page: 1, limit: DEFAULT_ITEMS_PER_PAGE })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const { data: executions, total } = getAllExecutions.data ?? { total: 0 }

    const applyFilters = (page?: number, limit?: number) => {
        const pageNum = typeof page === 'number' ? page : state.currentPage
        const limitNum = typeof limit === 'number' ? limit : state.pageLimit

        const params: GetAllExecutionsParams = { page: pageNum, limit: limitNum }

        if (state.filters.state) params.state = state.filters.state

        if (state.filters.startDate) {
            const date = new Date(state.filters.startDate)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            params.startDate = `${year}-${month}-${day}T00:00:00.000Z`
        }

        if (state.filters.endDate) {
            const date = new Date(state.filters.endDate)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            params.endDate = `${year}-${month}-${day}T23:59:59.999Z`
        }

        if (state.filters.agentflowId) params.agentflowId = state.filters.agentflowId
        if (state.filters.agentflowName) params.agentflowName = state.filters.agentflowName
        if (state.filters.sessionId) params.sessionId = state.filters.sessionId

        getAllExecutions.request(params)
    }

    const onChange = (page: number, limit: number) => {
        actions.setPage(page, limit)
        applyFilters(page, limit)
    }

    const handleResetFilters = () => {
        actions.resetFilters()
        getAllExecutions.request({ page: 1, limit: state.pageLimit })
    }

    const handleDeleteDialogOpen = () => {
        if (state.selectedExecutionIds.length > 0) {
            actions.openDeleteDialog()
        }
    }

    const handleDeleteExecutions = () => {
        deleteExecutionsApi.request(state.selectedExecutionIds).then(() => {
            actions.setSelectedExecutionIds([])
            getAllExecutions.request({ page: state.currentPage, limit: state.pageLimit })
        })
        actions.closeDeleteDialog()
    }

    return (
        <Stack flexDirection='column' sx={{ gap: 3 }}>
            <ExecutionFilters
                filters={state.filters}
                onFilterChange={actions.setFilter}
                onDateChange={actions.setDateFilter}
                onApply={() => applyFilters(state.currentPage, state.pageLimit)}
                onReset={handleResetFilters}
                onDelete={handleDeleteDialogOpen}
                selectedCount={state.selectedExecutionIds.length}
            />

            {executions && executions.length > 0 && (
                <>
                    <ExecutionsListTable
                        data={executions as Execution[]}
                        isLoading={getAllExecutions.loading}
                        onSelectionChange={actions.setSelectedExecutionIds}
                        onExecutionRowClick={(execution) => {
                            actions.openDrawer(execution)
                        }}
                    />

                    {!getAllExecutions.loading && total > 0 && (
                        <TablePagination currentPage={state.currentPage} limit={state.pageLimit} total={total} onChange={onChange} />
                    )}

                    {state.selectedExecution && (
                        <ExecutionDetails
                            open={state.openDrawer}
                            execution={state.selectedExecution}
                            onClose={actions.closeDrawer}
                            onProceedSuccess={() => {
                                actions.closeDrawer()
                                getAllExecutions.request({ page: state.currentPage, limit: state.pageLimit })
                            }}
                            onUpdateSharing={() => {
                                getAllExecutions.request({ page: state.currentPage, limit: state.pageLimit })
                            }}
                            onRefresh={(executionId) => {
                                getAllExecutions.request({ page: state.currentPage, limit: state.pageLimit })
                                getExecutionByIdApi.request(executionId)
                            }}
                        />
                    )}
                </>
            )}

            <Dialog open={state.openDeleteDialog} onClose={actions.closeDeleteDialog}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete {state.selectedExecutionIds.length} execution
                        {state.selectedExecutionIds.length !== 1 ? 's' : ''}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={actions.closeDeleteDialog} color='primary'>
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteExecutions} color='error'>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {!getAllExecutions.loading && (!executions || executions.length === 0) && <EmptyState />}
        </Stack>
    )
}
