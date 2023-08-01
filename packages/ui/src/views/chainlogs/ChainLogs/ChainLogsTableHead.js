import PropTypes from 'prop-types'
import { TableCell, TableRow, Checkbox, TableHead, TableSortLabel } from '@mui/material'

const headCells = [
    {
        id: 'chatflowName',
        label: 'Chatflow',
        sortable: true
    },
    {
        id: 'Input',
        label: 'Input'
    },
    {
        id: 'Output',
        label: 'Output'
    },
    {
        id: 'chatId',
        label: 'Chat ID',
        sortable: true
    },
    {
        id: 'createdDate',
        label: 'Timestamp',
        sortable: true
    },
    {
        id: 'Actions',
        label: 'Actions'
    }
]

export function ChainLogsTableHead(props) {
    const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props

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
                {headCells.map((headCell) => {
                    const isSorting = headCell?.sortable
                    const isCurrent = orderBy === headCell.id
                    const isActive = Boolean(isCurrent && order)
                    return (
                        <TableCell key={headCell.id}>
                            {isSorting ? (
                                <TableSortLabel
                                    active={isActive}
                                    direction={isCurrent ? order.toLowerCase() : 'ASC'}
                                    onClick={() => onRequestSort(headCell.id)}
                                >
                                    {headCell?.label}
                                </TableSortLabel>
                            ) : (
                                headCell?.label
                            )}
                        </TableCell>
                    )
                })}
            </TableRow>
        </TableHead>
    )
}

ChainLogsTableHead.propTypes = {
    numSelected: PropTypes.number.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onSelectAllClick: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['ASC', 'DESC', '']).isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired
}
