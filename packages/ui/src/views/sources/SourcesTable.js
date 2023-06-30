import React from 'react'
import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper, TablePagination } from '@mui/material'

export const SourcesTable = ({ columns = [], rows, onRefresh, onClose, onClickRow }) => {
    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(5)

    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value)
        setPage(0)
    }

    const handleClickRow = (event, id) => {
        event.stopPropagation()
        onClickRow(id)
    }

    const handleClose = (event, id) => {
        event.stopPropagation()
        onClose(id)
    }

    const handleRefresh = (event, id) => {
        event.stopPropagation()
        onRefresh(id)
    }

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

    const visibleRows = React.useMemo(() => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [page, rowsPerPage])

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index} {...col.props}>
                                    {col.title.charAt(0).toUpperCase() + col.title.slice(1)}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRows.map((row) => (
                            <TableRow
                                key={row.id}
                                hover
                                style={{ cursor: 'pointer' }}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                onClick={(event) => handleClickRow(event, row.id)}
                            >
                                {Object.entries(row).map(([key, value]) => {
                                    if (key === 'id') return null
                                    return <TableCell key={key}>{value}</TableCell>
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 15, 25]}
                component='div'
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    )
}

SourcesTable.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    onRefresh: (id) => {},
    onClose: (id) => {},
    onClickRow: (id) => {}
}
