import PropTypes from 'prop-types'
import { DataGrid } from '@mui/x-data-grid'
import { IconPlus } from '@tabler/icons'
import { Button } from '@mui/material'

const localizedTextsMap = {
    footerRowSelected: (count) => (count !== 1 ? `${count.toLocaleString()} строк выбрано` : `${count.toLocaleString()} строка выбрана`)
}

export const Grid = ({ columns, rows, style, disabled = false, onRowUpdate, addNewRow }) => {
    const handleProcessRowUpdate = (newRow) => {
        onRowUpdate(newRow)
        return newRow
    }

    return (
        <>
            {!disabled && (
                <Button variant='outlined' onClick={addNewRow} startIcon={<IconPlus />}>
                    Добавить параметр
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
                        localeText={localizedTextsMap}
                        componentsProps={{
                            pagination: {
                                labelRowsPerPage: 'Строк на странице'
                            }
                        }}
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
