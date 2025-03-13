import { useState } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
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
    useTheme
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconLoader, IconCircleXFilled } from '@tabler/icons-react'

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
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

const getIconFromStatus = (state, theme) => {
    switch (state) {
        case 'FINISHED':
            return CheckCircleIcon
        case 'ERROR':
        case 'TIMEOUT':
            return ErrorIcon
        case 'TERMINATED':
            // eslint-disable-next-line react/display-name
            return (props) => {
                const IconWrapper = (props) => <IconCircleXFilled {...props} color={theme.palette.error.main} />
                IconWrapper.displayName = 'TerminatedIcon'
                return <IconWrapper {...props} />
            }
        case 'STOPPED':
            return StopCircleIcon
        case 'INPROGRESS':
            // eslint-disable-next-line react/display-name
            return (props) => {
                const IconWrapper = (props) => (
                    // eslint-disable-next-line
                    <IconLoader {...props} color={theme.palette.warning.dark} className={`spin-animation ${props.className || ''}`} />
                )
                IconWrapper.displayName = 'InProgressIcon'
                return <IconWrapper {...props} />
            }
    }
}

const getIconColor = (state) => {
    switch (state) {
        case 'FINISHED':
            return 'success.dark'
        case 'ERROR':
        case 'TIMEOUT':
            return 'error.main'
        case 'TERMINATED':
        case 'STOPPED':
            return 'error.main'
        case 'INPROGRESS':
            return 'warning.main'
    }
}

export const ExecutionsListTable = ({ data, isLoading, onExecutionRowClick }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const localStorageKeyOrder = 'executions_order'
    const localStorageKeyOrderBy = 'executions_orderBy'

    const [order, setOrder] = useState(localStorage.getItem(localStorageKeyOrder) || 'desc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem(localStorageKeyOrderBy) || 'updatedDate')

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem(localStorageKeyOrder, newOrder)
        localStorage.setItem(localStorageKeyOrderBy, property)
    }

    const sortedData = data
        ? [...data].sort((a, b) => {
              if (orderBy === 'name') {
                  return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '')
              } else if (orderBy === 'updatedDate') {
                  return order === 'asc'
                      ? new Date(a.updatedDate) - new Date(b.updatedDate)
                      : new Date(b.updatedDate) - new Date(a.updatedDate)
              }
              return 0
          })
        : []

    return (
        <>
            <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead
                        sx={{
                            backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                            height: 56
                        }}
                    >
                        <TableRow>
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
                                </StyledTableRow>
                            </>
                        ) : (
                            <>
                                {sortedData.map((row, index) => (
                                    <StyledTableRow
                                        onClick={() => onExecutionRowClick(row)}
                                        hover
                                        key={index}
                                        sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <StyledTableCell>
                                            <Box
                                                component={getIconFromStatus(row.state, theme)}
                                                className='labelIcon'
                                                color={getIconColor(row.state)}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>{moment(row.updatedDate).format('MMM D, YYYY h:mm A')}</StyledTableCell>
                                        <StyledTableCell>{row.agentflow?.name}</StyledTableCell>
                                        <StyledTableCell>{row.sessionId}</StyledTableCell>
                                        <StyledTableCell>{moment(row.createdDate).format('MMM D, YYYY h:mm A')}</StyledTableCell>
                                    </StyledTableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

ExecutionsListTable.propTypes = {
    data: PropTypes.array,
    isLoading: PropTypes.bool,
    onExecutionRowClick: PropTypes.func,
    className: PropTypes.string
}

ExecutionsListTable.displayName = 'ExecutionsListTable'
