import { useState } from 'react'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import {
    Box,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    useTheme,
    Checkbox
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import { useConfigContext } from '../../infrastructure/store/ConfigContext'
import { getIconFromStatus, getIconColor } from '../../atoms/StatusIcon'
import type { Execution, ExecutionState } from '../../types'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

interface ExecutionsListTableProps {
    data: Execution[]
    isLoading: boolean
    onExecutionRowClick: (execution: Execution) => void
    onSelectionChange?: (selectedIds: string[]) => void
}

export const ExecutionsListTable = ({ data, isLoading, onExecutionRowClick, onSelectionChange }: ExecutionsListTableProps) => {
    const theme = useTheme()
    const config = useConfigContext()

    const localStorageKeyOrder = 'executions_order'
    const localStorageKeyOrderBy = 'executions_orderBy'

    const [order, setOrder] = useState<'asc' | 'desc'>((localStorage.getItem(localStorageKeyOrder) as 'asc' | 'desc') || 'desc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem(localStorageKeyOrderBy) || 'updatedDate')
    const [selected, setSelected] = useState<string[]>([])

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem(localStorageKeyOrder, newOrder)
        localStorage.setItem(localStorageKeyOrderBy, property)
    }

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = data.map((n) => n.id)
            setSelected(newSelected)
            onSelectionChange?.(newSelected)
        } else {
            setSelected([])
            onSelectionChange?.([])
        }
    }

    const handleClick = (event: React.MouseEvent, id: string) => {
        event.stopPropagation()
        const selectedIndex = selected.indexOf(id)
        let newSelected: string[] = []

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
        onSelectionChange?.(newSelected)
    }

    const isSelected = (id: string) => selected.indexOf(id) !== -1

    const sortedData = data
        ? [...data].sort((a, b) => {
              if (orderBy === 'name') {
                  const aName = a.agentflow?.name || ''
                  const bName = b.agentflow?.name || ''
                  return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
              } else if (orderBy === 'updatedDate') {
                  return order === 'asc'
                      ? new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime()
                      : new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime()
              } else if (orderBy === 'createdDate') {
                  return order === 'asc'
                      ? new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
                      : new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
              }
              return 0
          })
        : []

    return (
        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
            <Table sx={{ minWidth: 650 }} size='small' aria-label='executions table'>
                <TableHead
                    sx={{
                        backgroundColor: config.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                        height: 56
                    }}
                >
                    <TableRow>
                        <StyledTableCell padding='checkbox'>
                            <Checkbox
                                color='primary'
                                indeterminate={selected.length > 0 && selected.length < data.length}
                                checked={data.length > 0 && selected.length === data.length}
                                onChange={handleSelectAllClick}
                                inputProps={{ 'aria-label': 'select all executions' }}
                            />
                        </StyledTableCell>
                        <StyledTableCell>Status</StyledTableCell>
                        <StyledTableCell>
                            <TableSortLabel
                                active={orderBy === 'updatedDate'}
                                direction={order}
                                onClick={() => handleRequestSort('updatedDate')}
                            >
                                Last Updated
                            </TableSortLabel>
                        </StyledTableCell>
                        <StyledTableCell component='th' scope='row'>
                            <TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleRequestSort('name')}>
                                Agentflow
                            </TableSortLabel>
                        </StyledTableCell>
                        <StyledTableCell>Session</StyledTableCell>
                        <StyledTableCell>
                            <TableSortLabel
                                active={orderBy === 'createdDate'}
                                direction={order}
                                onClick={() => handleRequestSort('createdDate')}
                            >
                                Created
                            </TableSortLabel>
                        </StyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <>
                            {[0, 1].map((i) => (
                                <StyledTableRow key={i}>
                                    <StyledTableCell padding='checkbox'>
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
                            ))}
                        </>
                    ) : (
                        sortedData.map((row, index) => {
                            const isItemSelected = isSelected(row.id)
                            const labelId = `enhanced-table-checkbox-${index}`

                            return (
                                <StyledTableRow
                                    hover
                                    key={index}
                                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <StyledTableCell padding='checkbox'>
                                        <Checkbox
                                            color='primary'
                                            checked={isItemSelected}
                                            onClick={(event) => handleClick(event, row.id)}
                                            inputProps={{ 'aria-labelledby': labelId }}
                                        />
                                    </StyledTableCell>
                                    <StyledTableCell onClick={() => onExecutionRowClick(row)}>
                                        <Box
                                            component={getIconFromStatus(row.state as ExecutionState, theme) as React.ElementType}
                                            className='labelIcon'
                                            color={getIconColor(row.state as ExecutionState)}
                                        />
                                    </StyledTableCell>
                                    <StyledTableCell onClick={() => onExecutionRowClick(row)}>
                                        {moment(row.updatedDate).format('MMM D, YYYY h:mm A')}
                                    </StyledTableCell>
                                    <StyledTableCell onClick={() => onExecutionRowClick(row)}>{row.agentflow?.name}</StyledTableCell>
                                    <StyledTableCell onClick={() => onExecutionRowClick(row)}>{row.sessionId}</StyledTableCell>
                                    <StyledTableCell onClick={() => onExecutionRowClick(row)}>
                                        {moment(row.createdDate).format('MMM D, YYYY h:mm A')}
                                    </StyledTableCell>
                                </StyledTableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

ExecutionsListTable.displayName = 'ExecutionsListTable'
