import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper, Chip } from '@mui/material'

export const TableViewOnly = ({ columns, rows, sx }) => {
    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650, ...sx }} aria-label='simple table'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index}>{col.charAt(0).toUpperCase() + col.slice(1)}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => {
                                    return (
                                        <TableCell key={index}>
                                            {key === 'enabled' ? (
                                                row[key] ? (
                                                    <Chip label='Enabled' color='primary' />
                                                ) : (
                                                    <Chip label='Disabled' />
                                                )
                                            ) : (
                                                row[key]
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

TableViewOnly.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    sx: PropTypes.object
}
