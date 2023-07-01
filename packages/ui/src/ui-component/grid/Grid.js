import PropTypes from 'prop-types'
import { DataGrid } from '@mui/x-data-grid'
import { IconPlus } from '@tabler/icons'
import { Button } from '@mui/material'

export const Grid = ({ columns, rows, style, disabled = false, onRowUpdate, addNewRow }) => {
    const handleProcessRowUpdate = (newRow) => {
        onRowUpdate(newRow)
        return newRow
    }

    return (
        <>
            {!disabled && (
                <Button variant='outlined' onClick={addNewRow} startIcon={<IconPlus />}>
                    Add Item
                </Button>
            )}
            {rows && columns && (
                <div style={{ marginTop: 10, height: 300, width: '100%', ...style }}>
                    <DataGrid
                        processRowUpdate={handleProcessRowUpdate}
                        isCellEditable={() => {
                            return !disabled
                        }}
                        onProcessRowUpdateError={(error) => console.error(error)}
                        rows={rows}
                        columns={columns}
                    />
                </div>
            )}
        </>
    )
}

Grid.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    style: PropTypes.any,
    disabled: PropTypes.bool,
    addNewRow: PropTypes.func,
    onRowUpdate: PropTypes.func
}
