import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper, Chip, Stack, Typography } from '@mui/material'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

export const TableViewOnly = ({ columns, rows, sx }) => {
    // Helper function to safely render cell content
    const renderCellContent = (key, row) => {
        if (row[key] === null || row[key] === undefined) {
            return ''
        } else if (key === 'enabled') {
            return row[key] ? <Chip label='Enabled' color='primary' /> : <Chip label='Disabled' />
        } else if (key === 'type' && row.schema) {
            // If there's schema information, add a tooltip
            let schemaContent
            if (Array.isArray(row.schema)) {
                // Handle array format: [{ name: "field", type: "string" }, ...]
                schemaContent =
                    '[<br>' +
                    row.schema
                        .map(
                            (item) =>
                                `&nbsp;&nbsp;${JSON.stringify(
                                    {
                                        [item.name]: item.type
                                    },
                                    null,
                                    2
                                )}`
                        )
                        .join(',<br>') +
                    '<br>]'
            } else if (typeof row.schema === 'object' && row.schema !== null) {
                // Handle object format: { "field": "string", "field2": "number", ... }
                schemaContent = JSON.stringify(row.schema, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
            } else {
                schemaContent = 'No schema available'
            }

            return (
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography>{row[key]}</Typography>
                    <TooltipWithParser title={`<div>Schema:<br/>${schemaContent}</div>`} />
                </Stack>
            )
        } else if (typeof row[key] === 'object') {
            // For other objects (that are not handled by special cases above)
            return JSON.stringify(row[key])
        } else {
            return row[key]
        }
    }

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
                                    if (key !== 'id' && key !== 'schema') {
                                        return <TableCell key={index}>{renderCellContent(key, row)}</TableCell>
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
