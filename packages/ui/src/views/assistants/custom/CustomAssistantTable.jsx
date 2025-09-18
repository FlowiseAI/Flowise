import { useState } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import {
    Box,
    Chip,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import CustomAssitantListMenu from './CustomAssitantListMenu'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import MoreItemsTooltip from './MoreItemsTooltip'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    [`&.${tableCellClasses.head}`]: { color: theme.palette.grey[900] },
    [`&.${tableCellClasses.body}`]: { fontSize: 14, height: 64 }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': { border: 0 }
}))

const getLocalStorageKeyName = (name) => 'assistant_' + name

function CustomAssistantTable({
    data,
    images = {},
    icons = {},
    isLoading,
    filterFunction = (row) => true,
    updateAssistantsApi,
    setError
}) {
    const { hasPermission } = useAuth()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const isActionsAvailable = hasPermission('assistants:update,assistants:delete,assistants:export')

    const localStorageKeyOrder = getLocalStorageKeyName('order')
    const localStorageKeyOrderBy = getLocalStorageKeyName('orderBy')

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

    const onRowClick = (row) => `/assistants/custom/${row.id}`

    const sortedData = data
        ? [...data].sort((a, b) => {
              if (orderBy === 'name') {
                  const aName = JSON.parse(a.details)?.name || 'Unnamed'
                  const bName = JSON.parse(b.details)?.name || 'Unnamed'
                  return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
              } else if (orderBy === 'updatedDate') {
                  return order === 'asc'
                      ? new Date(a.updatedDate) - new Date(b.updatedDate)
                      : new Date(b.updatedDate) - new Date(a.updatedDate)
              }
              return 0
          })
        : []

    const getRowName = (row) => JSON.parse(row.details)?.name || 'Unnamed'
    const getRowCategory = (row) => JSON.parse(row.details)?.category || '-'
    const getRowTags = (row) => {
        const tags = JSON.parse(row.details)?.tags
        return tags ? tags.split(';') : []
    }
    const getRowDescription = (row) => JSON.parse(row.details)?.description || '-'
    const getRowImages = (row) => (row.iconSrc ? [{ imageSrc: row.iconSrc }] : [])

    return (
        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
            <Table sx={{ minWidth: 650 }} size='small' aria-label='custom assistant table'>
                <TableHead
                    sx={{
                        backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                        height: 56
                    }}
                >
                    <TableRow>
                        <StyledTableCell>
                            <TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleRequestSort('name')}>
                                Name
                            </TableSortLabel>
                        </StyledTableCell>
                        <StyledTableCell>Tags</StyledTableCell>
                        <StyledTableCell>Description</StyledTableCell>
                        <StyledTableCell>
                            <TableSortLabel
                                active={orderBy === 'updatedDate'}
                                direction={order}
                                onClick={() => handleRequestSort('updatedDate')}
                            >
                                Last Modified
                            </TableSortLabel>
                        </StyledTableCell>
                        {isActionsAvailable && <StyledTableCell>Actions</StyledTableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, idx) => (
                            <StyledTableRow key={idx}>
                                <StyledTableCell><Skeleton variant='text' /></StyledTableCell>
                                <StyledTableCell><Skeleton variant='text' /></StyledTableCell>
                                <StyledTableCell><Skeleton variant='text' /></StyledTableCell>
                                <StyledTableCell><Skeleton variant='text' /></StyledTableCell>
                                <StyledTableCell><Skeleton variant='text' /></StyledTableCell>
                                {isActionsAvailable && <StyledTableCell><Skeleton variant='text' /></StyledTableCell>}
                            </StyledTableRow>
                        ))
                    ) : (
                        sortedData.filter(filterFunction).map((row, index) => (
                            <StyledTableRow key={index}>
                                <StyledTableCell>
                                    <Tooltip title={getRowName(row)}>
                                        <Typography
                                            sx={{
                                                display: '-webkit-box',
                                                fontSize: 14,
                                                fontWeight: 500,
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <Link to={onRowClick(row)} style={{ color: '#2196f3', textDecoration: 'none' }}>
                                                {getRowName(row)}
                                            </Link>
                                        </Typography>
                                    </Tooltip>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <Stack direction='row' flexWrap='wrap' spacing={0.5} mt={0.5}>
                                        {getRowTags(row).map((tag, idx) => (
                                            <Chip key={idx} label={tag} />
                                        ))}
                                    </Stack>
                                </StyledTableCell>

                                <StyledTableCell>{getRowDescription(row)}</StyledTableCell>

                                <StyledTableCell>{moment(row.updatedDate).format('MMMM Do, YYYY HH:mm:ss')}</StyledTableCell>

                                {isActionsAvailable && (
                                    <StyledTableCell>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                            <CustomAssitantListMenu
                                                assistant={row}
                                                setError={setError}
                                                updateAssistantsApi={updateAssistantsApi}
                                            />
                                        </Stack>
                                    </StyledTableCell>
                                )}
                            </StyledTableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

CustomAssistantTable.propTypes = {
    data: PropTypes.array,
    images: PropTypes.object,
    icons: PropTypes.object,
    isLoading: PropTypes.bool,
    filterFunction: PropTypes.func,
    updateAssistantsApi: PropTypes.object,
    setError: PropTypes.func
}

export default CustomAssistantTable
