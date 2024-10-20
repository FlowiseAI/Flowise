import PropTypes from 'prop-types'
import { useState, useCallback } from 'react'
import { DataGrid as MUIDataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { cloneDeep } from 'lodash'
import { formatDataGridRows } from '@/utils/genericHelper'
import { styled } from '@mui/material/styles'

const StyledDataGrid = styled(MUIDataGrid)(({ theme }) => ({
    border: `1px solid ${theme.palette.mode === 'light' ? '#b4b4b4' : '#303030'}`,

    letterSpacing: 'normal',
    '& .MuiDataGrid-columnsContainer': {
        backgroundColor: theme.palette.mode === 'light' ? '#fafafa' : '#1d1d1d'
    },
    '& .MuiDataGrid-iconSeparator': {
        display: 'none'
    },
    '& .MuiDataGrid-columnHeader, .MuiDataGrid-cell': {
        borderRight: `1px solid ${theme.palette.mode === 'light' ? '#f0f0f0' : '#303030'}`
    },
    '& .MuiDataGrid-columnsContainer, .MuiDataGrid-cell': {
        borderBottom: `1px solid ${theme.palette.mode === 'light' ? '#f0f0f0' : '#303030'}`
    },

    '& .MuiPaginationItem-root': {
        borderRadius: 0
    },
    '& .MuiDataGrid-columnHeader:last-child, .MuiDataGrid-cell:last-child': {
        borderRight: 'none'
    }
}))

export const DataGrid = ({ columns, rows, style, disabled = false, hideFooter = false, onChange }) => {
    const [rowValues, setRowValues] = useState(formatDataGridRows(rows) ?? [])

    const deleteItem = useCallback(
        (id) => () => {
            let updatedRows = []
            setRowValues((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                allRows = allRows.filter((row) => row.id !== id)
                updatedRows = allRows
                return allRows
            })
            onChange(JSON.stringify(updatedRows))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const addCols = (columns) => {
        return [
            ...columns,
            {
                field: 'actions',
                type: 'actions',
                width: 80,
                getActions: (params) => [
                    <GridActionsCellItem key={'Delete'} icon={<DeleteIcon />} label='Delete' onClick={deleteItem(params.id)} />
                ]
            }
        ]
    }

    const colValues = addCols(columns)

    const handleProcessRowUpdate = (newRow) => {
        let updatedRows = []
        setRowValues((prevRows) => {
            let allRows = [...cloneDeep(prevRows)]
            const indexToUpdate = allRows.findIndex((row) => row.id === newRow.id)
            if (indexToUpdate >= 0) {
                allRows[indexToUpdate] = { ...newRow }
            }
            updatedRows = allRows
            return allRows
        })
        onChange(JSON.stringify(updatedRows))
        return newRow
    }

    const getEmptyJsonObj = () => {
        const obj = {}
        for (let i = 0; i < colValues.length; i += 1) {
            obj[colValues[i]?.field] = ''
        }
        return obj
    }

    const addNewRow = () => {
        setRowValues((prevRows) => {
            let allRows = [...cloneDeep(prevRows)]
            const lastRowId = allRows.length ? allRows[allRows.length - 1].id + 1 : 1
            allRows.push({
                ...getEmptyJsonObj(),
                id: lastRowId
            })
            return allRows
        })
    }

    return (
        <>
            {rowValues && colValues && (
                <div style={{ marginTop: 10, height: 210, width: '100%', ...style }}>
                    <StyledDataGrid
                        processRowUpdate={handleProcessRowUpdate}
                        isCellEditable={() => {
                            return !disabled
                        }}
                        hideFooter={hideFooter}
                        onProcessRowUpdateError={(error) => console.error(error)}
                        rows={rowValues}
                        columns={colValues}
                    />
                </div>
            )}
            {!disabled && (
                <Button sx={{ mt: 1 }} variant='outlined' onClick={addNewRow} startIcon={<IconPlus />}>
                    Add Item
                </Button>
            )}
        </>
    )
}

DataGrid.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    style: PropTypes.any,
    disabled: PropTypes.bool,
    hideFooter: PropTypes.bool,
    onChange: PropTypes.func
}
