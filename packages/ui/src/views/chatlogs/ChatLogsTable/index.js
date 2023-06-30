import * as React from 'react'

import { Chip, Box, Grid, Table, TableBody, Checkbox, Paper, TableCell, TableRow, TableContainer, TablePagination } from '@mui/material'
import { ChatLogsTableHead } from './ChatLogsTableHead'
import { ChatLogsTableToolbar } from './ChatLogsTableToolbar'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import TextsmsIcon from '@mui/icons-material/Textsms'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ForumIcon from '@mui/icons-material/Forum'
import { ChatLogDetails } from '../ChatLogDetails'

function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1
    }
    if (b[orderBy] > a[orderBy]) {
        return 1
    }
    return 0
}

function getComparator(order, orderBy) {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy)
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index])
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0])
        if (order !== 0) {
            return order
        }
        return a[1] - b[1]
    })
    return stabilizedThis.map((el) => el[0])
}

export default function ChatLogsTable() {
    const [order, setOrder] = React.useState('asc')
    const [orderBy, setOrderBy] = React.useState('calories')
    const [selected, setSelected] = React.useState([])
    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(5)
    const [logDetails, setLogDetails] = React.useState(null)

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = rows.map((n) => n.id)
            setSelected(newSelected)
            return
        }
        setSelected([])
    }

    const handleClick = (event, id) => {
        event.stopPropagation()
        const selectedIndex = selected.indexOf(id)
        let newSelected = []

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
    }

    const onClickRow = (event, log) => {
        event.stopPropagation()
        setLogDetails(log)
    }

    const onCloseDetailsWindow = () => setLogDetails(null)

    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const isSelected = (id) => selected.indexOf(id) !== -1

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

    const visibleRows = React.useMemo(
        () => stableSort(rows, getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [order, orderBy, page, rowsPerPage]
    )

    return (
        <>
            <Box sx={{ width: '100%' }}>
                <Paper sx={{ width: '100%', mb: 2 }}>
                    <ChatLogsTableToolbar numSelected={selected.length} />
                    <TableContainer>
                        <Table sx={{ minWidth: 750 }} aria-labelledby='tableTitle' size='medium'>
                            <ChatLogsTableHead
                                numSelected={selected.length}
                                order={order}
                                orderBy={orderBy}
                                onSelectAllClick={handleSelectAllClick}
                                onRequestSort={handleRequestSort}
                                rowCount={rows.length}
                            />
                            <TableBody>
                                {visibleRows.map((row, index) => {
                                    const isItemSelected = isSelected(row.id)
                                    const labelId = `enhanced-table-checkbox-${index}`

                                    return (
                                        <TableRow
                                            hover
                                            onClick={(event) => onClickRow(event, row)}
                                            role='checkbox'
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            key={row.id}
                                            selected={isItemSelected}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell padding='checkbox'>
                                                <Checkbox
                                                    onClick={(event) => handleClick(event, row.id)}
                                                    color='primary'
                                                    checked={isItemSelected}
                                                    inputProps={{
                                                        'aria-labelledby': labelId
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell component='th' id={labelId} scope='row'>
                                                <Grid marginBottom='4px'>
                                                    <Chip label='Q: ' /> {row?.text?.question}
                                                </Grid>
                                                <Grid>
                                                    <Chip label='A: ' /> {row?.text?.answer}
                                                </Grid>
                                            </TableCell>
                                            <TableCell align='center'>
                                                {row?.quality?.thumbsUp && <ThumbUpIcon color='success' />}
                                                {row?.quality?.thumbsDown && <ThumbDownIcon color='error' />}
                                                {!!row?.quality?.text && <TextsmsIcon />}
                                            </TableCell>
                                            <TableCell align='right'>
                                                {row?.visability ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {emptyRows > 0 && (
                                    <TableRow
                                        style={{
                                            height: (dense ? 33 : 53) * emptyRows
                                        }}
                                    >
                                        <TableCell colSpan={6} />
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component='div'
                        count={rows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
            </Box>

            <ChatLogDetails details={logDetails} onClose={onCloseDetailsWindow} />
        </>
    )
}

const rows = [
    {
        id: 1,
        text: {
            question:
                'Sed ultricies nulla eu varius ultricies. Ut vel magna at justo ullamcorper sodales eget et urna. Nulla facilisi. Phasellus sed viverra mi. Fusce vel gravida urna. Pellentesque mauris nibh, consectetur at ex in, pulvinar blandit erat. Suspendisse congue aliquam tellus eget faucibus.',
            answer: 'Ut sit amet turpis ut ipsum luctus ornare vitae pharetra velit. Mauris gravida augue ut metus tincidunt, at commodo dolor fringilla.'
        },
        quality: {
            thumbsUp: true,
            thumbsDown: false,
            text: 'Dolor fringilla'
        },
        inputs: 'Phasellus sed viverra mi',
        context: 'Ut vel at commodo dolor fringilla sodales',
        visability: true
    },
    {
        id: 11,
        text: {
            question: 'Nulla facilisi. Phasellus sed viverra mi. Fusce vel gravida urna. Suspendisse congue aliquam tellus eget faucibus.',
            answer: 'Ut sit amet turpis ut ipsum luctus ornare vitae pharetra velit. Mauris gravida augue ut metus tincidunt, at commodo dolor fringilla.'
        },
        quality: {
            thumbsUp: false,
            thumbsDown: true,
            text: null
        },
        inputs: 'Phasellus sed viverra mi',
        context: 'Ut vel magna at justo ullamcorper sodales',
        visability: true
    },
    {
        id: 13,
        text: {
            question:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed tempor sem ut urna tempor auctor. Sed ultricies nulla eu varius ultricies. Ut vel magna at justo ullamcorper sodales eget et urna. Nulla facilisi. Phasellus sed viverra mi. Fusce vel gravida urna. Pellentesque mauris nibh, consectetur at ex in, pulvinar blandit erat. Suspendisse congue aliquam tellus eget faucibus.',
            answer: 'Mauris gravida augue ut metus tincidunt, at commodo dolor fringilla.'
        },
        quality: {
            thumbsUp: false,
            thumbsDown: false,
            text: 'At commodo dolor fringilla'
        },
        inputs: 'Phasellus sed viverra mi',
        context: 'Ut vel magna at justo ullamcorper sodales',
        visability: false
    }
]
