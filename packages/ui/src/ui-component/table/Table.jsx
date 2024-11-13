import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper, Chip } from '@mui/material'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

export const TableViewOnly = ({ columns, rows, sx }) => {
    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650, ...sx }} aria-label='simple table'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index}>
                                    {col === 'enabled' ? (
                                        <>
                                            Override
                                            <TooltipWithParser
                                                style={{ mb: 1, mt: 2, marginLeft: 10 }}
                                                title={
                                                    'If enabled, this variable can be overridden in API calls and embeds. If disabled, any overrides will be ignored. To change this, go to Security settings in Chatflow Configuration.'
                                                }
                                            />
                                        </>
                                    ) : (
                                        col.charAt(0).toUpperCase() + col.slice(1)
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => {
                                    if (key !== 'id') {
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
                                    }
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
