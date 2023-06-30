import * as React from 'react'
import PropTypes from 'prop-types'
import { visuallyHidden } from '@mui/utils'
import { IconButton, TableCell, TableRow, Box, Checkbox, TableHead, TableSortLabel } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'

const headCells = [
    {
        id: 'text',
        label: 'test'
    },
    {
        id: 'quality',
        sortable: true
    },
    {
        id: 'visability'
    }
]

export function ChatLogsTableHead(props) {
    const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props

    const onSort = () => {}

    return (
        <TableHead>
            <TableRow>
                <TableCell padding='checkbox'>
                    <Checkbox
                        color='primary'
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                        inputProps={{
                            'aria-label': 'select all desserts'
                        }}
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell key={headCell.id} align='center' padding='none' sortDirection={orderBy === headCell.id ? order : false}>
                        {/* <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component='span' sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null} */}
                        {/* </TableSortLabel> */}
                        {headCell?.sortable && (
                            <IconButton onClick={onSort}>
                                <FilterListIcon />
                            </IconButton>
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    )
}

ChatLogsTableHead.propTypes = {
    numSelected: PropTypes.number.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onSelectAllClick: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['asc', 'desc']).isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired
}
