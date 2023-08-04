import PropTypes from 'prop-types'
import { Checkbox, IconButton, TableCell, TableRow } from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import moment from 'moment'

const ChainLogsTableRow = ({ row, index, onClickRow, handleClick, selected, onHanleClickActions }) => {
    const labelId = `enhanced-table-checkbox-${index}`
    return (
        <TableRow
            hover
            onClick={(event) => onClickRow(event, row)}
            role='checkbox'
            aria-checked={selected}
            tabIndex={-1}
            key={row.id}
            selected={selected}
            sx={{ cursor: 'pointer' }}
        >
            <TableCell padding='checkbox'>
                <Checkbox
                    onClick={(event) => handleClick(event, row.id)}
                    color='primary'
                    checked={selected}
                    inputProps={{
                        'aria-labelledby': labelId
                    }}
                />
            </TableCell>
            <TableCell component='th' id={labelId} scope='row'>
                {row?.chatflowName}
            </TableCell>
            <TableCell>{row?.question}</TableCell>
            <TableCell>{row?.text}</TableCell>
            <TableCell>{row?.chatId}</TableCell>
            <TableCell>{moment(row?.createdDate).format('DD.MM.YYYY HH:MM')}</TableCell>
            <TableCell>
                <IconButton onClick={onHanleClickActions}>
                    <MoreHorizIcon />
                </IconButton>
            </TableCell>
        </TableRow>
    )
}

ChainLogsTableRow.propTypes = {
    index: PropTypes.number.isRequired,
    onClickRow: PropTypes.func,
    onHanleClickActions: PropTypes.func,
    handleClick: PropTypes.func,
    row: PropTypes.object,
    selected: PropTypes.bool.isRequired
}

export default ChainLogsTableRow
