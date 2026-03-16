import { useReducer, useMemo } from 'react'
import { DEFAULT_ITEMS_PER_PAGE } from '@/atoms/TablePagination'
import type { Execution, ExecutionFilters } from '@/core/types'

export interface ExecutionListState {
    currentPage: number
    pageLimit: number
    openDrawer: boolean
    selectedExecution: Execution | null
    selectedExecutionIds: string[]
    openDeleteDialog: boolean
    filters: ExecutionFilters
}

const DEFAULT_FILTERS: ExecutionFilters = {
    state: '',
    startDate: null,
    endDate: null,
    agentflowId: '',
    agentflowName: '',
    sessionId: ''
}

type Action =
    | { type: 'SET_PAGE'; page: number; limit: number }
    | { type: 'SET_FILTERS'; field: string; value: unknown }
    | { type: 'SET_DATE_FILTER'; field: string; date: Date }
    | { type: 'RESET_FILTERS' }
    | { type: 'SET_SELECTED_EXECUTION_IDS'; ids: string[] }
    | { type: 'OPEN_DELETE_DIALOG' }
    | { type: 'CLOSE_DELETE_DIALOG' }
    | { type: 'OPEN_DRAWER'; execution: Execution }
    | { type: 'CLOSE_DRAWER' }
    | { type: 'CONFIRM_DELETE' }

function reducer(state: ExecutionListState, action: Action): ExecutionListState {
    switch (action.type) {
        case 'SET_PAGE':
            return { ...state, currentPage: action.page, pageLimit: action.limit }
        case 'SET_FILTERS':
            return { ...state, filters: { ...state.filters, [action.field]: action.value } }
        case 'SET_DATE_FILTER': {
            const updatedDate = new Date(action.date)
            updatedDate.setHours(0, 0, 0, 0)
            return { ...state, filters: { ...state.filters, [action.field]: updatedDate } }
        }
        case 'RESET_FILTERS':
            return { ...state, filters: { ...DEFAULT_FILTERS }, currentPage: 1 }
        case 'SET_SELECTED_EXECUTION_IDS':
            return { ...state, selectedExecutionIds: action.ids }
        case 'OPEN_DELETE_DIALOG':
            return { ...state, openDeleteDialog: true }
        case 'CLOSE_DELETE_DIALOG':
            return { ...state, openDeleteDialog: false }
        case 'OPEN_DRAWER':
            return {
                ...state,
                openDrawer: true,
                selectedExecution: action.execution
            }
        case 'CLOSE_DRAWER':
            return { ...state, openDrawer: false }
        case 'CONFIRM_DELETE':
            return { ...state, selectedExecutionIds: [], openDeleteDialog: false }
        default: {
            return state
        }
    }
}

export interface ExecutionListActions {
    setPage: (page: number, limit: number) => void
    setFilter: (field: string, value: unknown) => void
    setDateFilter: (field: string, date: Date) => void
    resetFilters: () => void
    setSelectedExecutionIds: (ids: string[]) => void
    openDeleteDialog: () => void
    closeDeleteDialog: () => void
    openDrawer: (execution: Execution) => void
    closeDrawer: () => void
    confirmDelete: () => void
}

export function useExecutionListState(
    options: {
        initialPage?: number
        initialPageLimit?: number
    } = {}
): {
    state: ExecutionListState
    actions: ExecutionListActions
} {
    const { initialPage = 1, initialPageLimit = DEFAULT_ITEMS_PER_PAGE } = options

    const [state, dispatch] = useReducer(reducer, {
        currentPage: initialPage,
        pageLimit: initialPageLimit,
        openDrawer: false,
        selectedExecution: {} as Execution,
        selectedExecutionIds: [],
        openDeleteDialog: false,
        filters: DEFAULT_FILTERS
    })

    const actions = useMemo<ExecutionListActions>(
        () => ({
            setPage: (page, limit) => dispatch({ type: 'SET_PAGE', page, limit }),
            setFilter: (field, value) => dispatch({ type: 'SET_FILTERS', field, value }),
            setDateFilter: (field, date) => dispatch({ type: 'SET_DATE_FILTER', field, date }),
            resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
            setSelectedExecutionIds: (ids) => dispatch({ type: 'SET_SELECTED_EXECUTION_IDS', ids }),
            openDeleteDialog: () => dispatch({ type: 'OPEN_DELETE_DIALOG' }),
            closeDeleteDialog: () => dispatch({ type: 'CLOSE_DELETE_DIALOG' }),
            openDrawer: (execution) => dispatch({ type: 'OPEN_DRAWER', execution }),
            closeDrawer: () => dispatch({ type: 'CLOSE_DRAWER' }),
            confirmDelete: () => dispatch({ type: 'CONFIRM_DELETE' })
        }),
        []
    )

    return { state, actions }
}
