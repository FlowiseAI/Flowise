import { useState } from 'react'
import { Box, Table, TableBody, Checkbox, Paper, TableCell, TableRow, TableContainer, IconButton } from '@mui/material'
import { ChainLogsTableHead } from './ChainLogsTableHead'
import { ChainLogsTableToolbar } from './ChainLogsTableToolbar'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { ChainLogsDetails } from '../ChainLogsDetails'
import { useChainLogs } from './useChainLogs'
import moment from 'moment'
import { CustomPagination } from 'ui-component/pagination'

const PAGE_SIZES = [15, 25, 50]

export default function ChainLogsTable() {
    const { sort, sortBy, page, pageSize, data, meta, handleRequestSort, onChangeTerm, onChangePage, onChangePaeSize } = useChainLogs({
        pageSizes: PAGE_SIZES
    })

    const [selected, setSelected] = useState([])

    const [logDetails, setLogDetails] = useState(null)

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

    const onHanleClickActions = (event) => event.stopPropagation()

    const onCloseDetailsWindow = () => setLogDetails(null)

    const isSelected = (id) => selected.indexOf(id) !== -1

    if (!data) return 'Loading...'

    return (
        <>
            <Box sx={{ width: '100%' }}>
                <Paper sx={{ width: '100%', mb: 2 }}>
                    <ChainLogsTableToolbar numSelected={selected.length} onChangeTerm={onChangeTerm} />
                    <TableContainer>
                        <Table sx={{ minWidth: 750 }} aria-labelledby='tableTitle' size='medium'>
                            <ChainLogsTableHead
                                numSelected={selected.length}
                                order={sort}
                                orderBy={sortBy}
                                onSelectAllClick={handleSelectAllClick}
                                onRequestSort={handleRequestSort}
                                rowCount={meta.totalItems}
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
                                                {row?.chatflowName}
                                            </TableCell>
                                            <TableCell>{row?.question}</TableCell>
                                            <TableCell>{row?.text}</TableCell>
                                            <TableCell>{row?.chatId}</TableCell>
                                            <TableCell>{moment(row?.createdDate).format('DD.MM.YYYY HH:MM')}</TableCell>
                                            <TableCell>
                                                <IconButton onClick={onHanleClickActions}>
                                                    <MoreHorizIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
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
        </>
    )
}
