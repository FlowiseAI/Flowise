import { useState } from 'react'
import { Box, Table, TableBody, Paper, TableCell, TableRow, TableContainer, LinearProgress } from '@mui/material'
import { ChainLogsTableHead } from './ChainLogsTableHead'
import { ChainLogsTableToolbar } from './ChainLogsTableToolbar'
import { ChainLogsDetails } from '../ChainLogsDetails'
import { useChainLogs } from './useChainLogs'
import { CustomPagination } from 'ui-component/pagination'
import ChainLogsTableRow from './ChainLogsTableRow'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'

const PAGE_SIZES = [15, 25, 50]

export default function ChainLogsTable() {
    const {
        sort,
        sortBy,
        page,
        pageSize,
        data,
        meta,
        handleRequestSort,
        onChangeTerm,
        onChangePage,
        onChangePaeSize,
        refetch,
        handleFilter,
        loading
    } = useChainLogs({
        pageSizes: PAGE_SIZES
    })

    const [logDetails, setLogDetails] = useState(null)
    const [selected, setSelected] = useState([])

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = data.map((n) => n.id)
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

    const isSelected = (id) => selected.indexOf(id) !== -1

    if (!data) return 'Loading...'

    const rowCount = meta.itemsPerPage > meta.totalItems ? meta.totalItems : meta.itemsPerPage

    return (
        <>
            <Box sx={{ width: '100%' }}>
                <Paper sx={{ width: '100%', mb: 2 }}>
                    <ChainLogsTableToolbar
                        numSelected={selected.length}
                        onChangeTerm={onChangeTerm}
                        selected={selected}
                        setSelected={setSelected}
                        refetch={refetch}
                    />
                    <TableContainer>
                        {loading && <LinearProgress />}
                        <Table sx={{ minWidth: 750 }} aria-labelledby='tableTitle' size='medium'>
                            <ChainLogsTableHead
                                numSelected={selected.length}
                                order={sort}
                                orderBy={sortBy}
                                onSelectAllClick={handleSelectAllClick}
                                onRequestSort={handleRequestSort}
                                rowCount={rowCount}
                            />
                            <TableBody>
                                {!data.length && (
                                    <TableRow>
                                        <TableCell align='center' colSpan={7}>
                                            No rows
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.map((row, index) => {
                                    const isSelectedCurrent = isSelected(row.id)
                                    return (
                                        <ChainLogsTableRow
                                            key={row.id}
                                            row={row}
                                            index={index}
                                            onClickRow={onClickRow}
                                            handleClick={handleClick}
                                            isSelected={isSelectedCurrent}
                                            refetch={refetch}
                                            handleFilter={handleFilter}
                                        />
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <br />
                    <CustomPagination
                        perPage={pageSize}
                        count={Math.ceil(meta.totalItems / pageSize)}
                        total={meta.totalItems}
                        page={page}
                        onChange={onChangePage}
                        onChangePerPage={onChangePaeSize}
                        pageSizes={PAGE_SIZES}
                    />
                </Paper>
            </Box>

            <ChainLogsDetails details={logDetails} onClose={onCloseDetailsWindow} />

            <ConfirmDialog />
        </>
    )
}
