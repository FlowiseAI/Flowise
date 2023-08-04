import { useState } from 'react'
import { Box, Table, TableBody, Paper, TableCell, TableRow, TableContainer, Button } from '@mui/material'
import { ChainLogsTableHead } from './ChainLogsTableHead'
import { ChainLogsTableToolbar } from './ChainLogsTableToolbar'
import { ChainLogsDetails } from '../ChainLogsDetails'
import { useChainLogs } from './useChainLogs'
import { CustomPagination } from 'ui-component/pagination'
import ChainLogsTableRow from './ChainLogsTableRow'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import useConfirm from 'hooks/useConfirm'
import { batchDeleteChainLogs } from 'api/chainlogs'
import useApi from 'hooks/useApi'
import { useDispatch } from 'react-redux'
import useNotifier from 'utils/useNotifier'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'
import { IconX } from '@tabler/icons'

const PAGE_SIZES = [15, 25, 50]

export default function ChainLogsTable() {
    const { sort, sortBy, page, pageSize, data, meta, handleRequestSort, onChangeTerm, onChangePage, onChangePaeSize, refetch } =
        useChainLogs({
            pageSizes: PAGE_SIZES
        })

    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [selected, setSelected] = useState([])
    const [logDetails, setLogDetails] = useState(null)

    const { request } = useApi(batchDeleteChainLogs)
    const { confirm, onConfirm, onCancel } = useConfirm()

    const handleDelete = async () => {
        const isMultipleSelected = selected.length > 1

        const confirmPayload = {
            title: isMultipleSelected ? 'Delete log records' : 'Delete log record',
            description: `Are you sure you want to delete ${isMultipleSelected ? 'these items' : 'this item'}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }

        try {
            const result = await confirm(confirmPayload)
            const data = { ids: selected }
            if (result) {
                await request({ data })
                enqueueSnackbar({
                    message: isMultipleSelected ? 'Log records deleted' : 'Log record deleted',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                refetch()
                setSelected([])
                onConfirm()
            }
        } catch (error) {
            enqueueSnackbar({
                message: 'Failed to delete log records',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

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
                    <ChainLogsTableToolbar numSelected={selected.length} onChangeTerm={onChangeTerm} handleDelete={handleDelete} />
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
                                    return (
                                        <ChainLogsTableRow
                                            index={index}
                                            key={row.id}
                                            onClickRow={onClickRow}
                                            handleClick={handleClick}
                                            onHanleClickActions={onHanleClickActions}
                                            selected={isItemSelected}
                                            row={row}
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
