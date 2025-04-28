'use client'
import React, { useState } from 'react'
import axios from 'axios'
import NextLink from 'next/link'
import useSWR from 'swr'

import { visuallyHidden } from '@mui/utils'

import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'

import StarIcon from '@mui/icons-material/Star'
import StarOutlineIcon from '@mui/icons-material/StarOutline'

import SnackMessage from './SnackMessage'

import { Order, getComparator, stableSort } from '@utils/utilities/datatables'

import { AppSettings, SidekickListItem } from 'types'

interface HeadCell {
    disablePadding: boolean
    id: keyof SidekickListItem
    label: string
    numeric: boolean
}

const headCells: readonly HeadCell[] = [
    {
        id: 'label',
        numeric: false,
        disablePadding: true,
        label: 'Label'
    },
    {
        id: 'placeholder',
        numeric: false,
        disablePadding: false,
        label: 'Help Text'
    },
    {
        id: 'tagString',
        numeric: false,
        disablePadding: false,
        label: 'Tags'
    },
    {
        id: 'sharedWith',
        numeric: false,
        disablePadding: false,
        label: 'Shared With'
    }
]

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof SidekickListItem) => void
    order: Order
    orderBy: string
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const { order, orderBy, onRequestSort } = props
    const createSortHandler = (property: keyof SidekickListItem) => (event: React.MouseEvent<unknown>) => {
        onRequestSort(event, property)
    }

    return (
        <TableHead>
            <TableRow>
                <TableCell padding='checkbox'></TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component='span' sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    )
}

const SidekickList = ({
    endpoint,
    appSettings,
    sidekicks,
    isFavoritable = true
}: {
    endpoint: string
    appSettings: AppSettings
    sidekicks?: SidekickListItem[]
    isFavoritable?: boolean
}) => {
    const { data: currentSidekicks = [], isLoading } = useSWR(
        endpoint ? endpoint : null,
        (endpoint) => axios.get(endpoint).then((res) => res.data),
        {
            fallbackData: sidekicks
        }
    )
    const [theMessage, setTheMessage] = useState('')
    const [order, setOrder] = React.useState<Order>('asc')
    const [orderBy, setOrderBy] = React.useState<keyof SidekickListItem>('label')
    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(25)
    const [updatedSidekicks, setUpdatedSidekicks] = useState<SidekickListItem[]>([])

    const handleUpdateFavorite = async (id: string) => {
        try {
            setTheMessage('... Updating')
            const { data: sidekick } = await axios.patch(`/api/sidekicks/${id}/edit/favorite`)
            setTheMessage('... Updated Successfully')

            if (sidekicks?.length) {
                // Update the specific row in the sidekicks state
                const updatedSidekicks = currentSidekicks.map((sidekick: SidekickListItem) => {
                    if (sidekick.id === id) {
                        return { ...sidekick, isFavorite: !sidekick.isFavorite }
                    }
                    return sidekick
                })
                setUpdatedSidekicks(updatedSidekicks)
            }
        } catch (err: any) {
            if (err.response) {
                setTheMessage(`Error: ${err.response.data}`)
            } else if (err.request) {
                setTheMessage(`Error: No response received from the server`)
            } else {
                setTheMessage(`Error: ${err.message}`)
            }
        }
    }

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof SidekickListItem) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows = page > 0 && !!sidekicks?.length ? Math.max(0, (1 + page) * rowsPerPage - sidekicks?.length) : 0

    const visibleRows = React.useMemo(() => {
        const sidekickArray = updatedSidekicks.length > 0 ? updatedSidekicks : currentSidekicks
        return stableSort(sidekickArray as any[], getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    }, [currentSidekicks, order, orderBy, page, rowsPerPage, updatedSidekicks])

    return (
        <Box>
            <SnackMessage message={theMessage} />

            <Paper sx={{ width: '100%', mb: 2 }}>
                <TableContainer>
                    <Table sx={{ minWidth: 750 }} aria-labelledby='tableTitle' size='small'>
                        <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                        <TableBody>
                            {visibleRows.map((row, index) => {
                                const labelId = `enhanced-table-checkbox-${index}`

                                return (
                                    <TableRow hover tabIndex={-1} key={row.label} sx={{ cursor: 'pointer' }}>
                                        <TableCell padding='checkbox'>
                                            {isFavoritable && (
                                                <IconButton onClick={() => handleUpdateFavorite(row.id as string)}>
                                                    {row.isFavorite ? <StarIcon /> : <StarOutlineIcon />}
                                                </IconButton>
                                            )}
                                        </TableCell>

                                        <TableCell component='th' id={labelId} scope='row' padding='none'>
                                            <NextLink href={`/sidekick-studio/${row.id}/edit`}>
                                                <Box sx={{ whiteSpace: 'nowrap' }}>{row.label}</Box>
                                            </NextLink>
                                        </TableCell>
                                        <TableCell>{row.placeholder}</TableCell>
                                        <TableCell>{row.tagString}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{row.sharedWith}</TableCell>
                                    </TableRow>
                                )
                            })}
                            {emptyRows > 0 && (
                                <TableRow
                                    style={{
                                        height: 33 * emptyRows
                                    }}
                                >
                                    <TableCell colSpan={6} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[1, 25, 50, 100]}
                    component='div'
                    count={currentSidekicks?.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    )
}

export default SidekickList
