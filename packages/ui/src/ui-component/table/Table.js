import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper } from '@mui/material'
import { translationObject } from 'translate'
export const TableViewOnly = ({ columns, rows, sx }) => {
    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650, ...sx }} aria-label='simple table'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index}>{translationObject[col] || col.charAt(0).toUpperCase() + col.slice(1)}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => (
                                    <TableCell key={index}>{translationObject[row[key]] || row[key]}</TableCell>
                                ))}
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
