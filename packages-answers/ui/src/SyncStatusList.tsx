'use client'
import React, { useEffect, useState, useCallback, ChangeEvent, MouseEvent, useRef } from 'react'
import axios from 'axios'

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
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'

import SnackMessage from './SnackMessage'

import { Order } from '@utils/utilities/datatables'

import { AppSettings, Document } from 'types'
import formatLocalTime from '@utils/formatLocalTime'
import Fieldset from './Fieldset'

interface HeadCell {
    disablePadding: boolean
    id: keyof Document
    label: string
    numeric: boolean
    hidden?: boolean
}

interface EnhancedTableProps {
    onRequestSort: (event: MouseEvent<unknown>, property: keyof Document) => void
    order: Order
    orderBy: string
    prefilterSource?: boolean
}

const getHeadCells = (prefilterSource: boolean): HeadCell[] => {
    return [
        {
            id: 'source',
            numeric: false,
            disablePadding: false,
            label: 'Source',
            hidden: prefilterSource
        },
        {
            id: 'title',
            numeric: false,
            disablePadding: false,
            label: 'Title / URL'
        },
        // {
        //   id: 'url',
        //   numeric: false,
        //   disablePadding: false,
        //   label: 'URL'
        // },
        {
            id: 'status',
            numeric: false,
            disablePadding: false,
            label: 'Status'
        },
        {
            id: 'lastSyncedAt',
            numeric: false,
            disablePadding: false,
            label: 'Last Synced'
        },
        {
            id: 'createdAt',
            numeric: false,
            disablePadding: false,
            label: 'Created At'
        },
        {
            id: 'updatedAt',
            numeric: false,
            disablePadding: false,
            label: 'Updated At'
        }
    ]
}

const EnhancedTableHead = (props: EnhancedTableProps) => {
    const { order, orderBy, onRequestSort, prefilterSource } = props
    const createSortHandler = (property: keyof Document) => (event: MouseEvent<unknown>) => {
        onRequestSort(event, property)
    }

    return (
        <TableHead>
            <TableRow>
                {getHeadCells(!!prefilterSource)
                    .filter((c) => !c.hidden)
                    .map((headCell) => (
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

const SyncStatusList = ({
    endpoint,
    appSettings,
    documents,
    prefilterSource
}: {
    endpoint: string
    appSettings: AppSettings
    documents?: Document[]
    prefilterSource?: string
}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [filterString, setFilterString] = useState<string>('')
    const [theMessage, setTheMessage] = useState('')
    const [docType, setDocType] = React.useState<string>(prefilterSource || '')
    const [statusType, setStatusType] = React.useState<string>('')
    const [order, setOrder] = React.useState<Order>('desc')
    const [orderBy, setOrderBy] = React.useState<keyof Document>('updatedAt')
    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(50)
    const [totalCount, setTotalCount] = React.useState(50)
    const [updatedDocuments, setUpdatedDocuments] = useState<Document[]>([])

    const Pagination = () => (
        <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component='div'
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
        />
    )

    const fetchData = useCallback(async () => {
        try {
            setTheMessage('Fetching data')
            const response = await axios.get(
                `${endpoint}?keyword=${encodeURIComponent(
                    filterString
                )}&pageNum=${page}&perPage=${rowsPerPage}&order=${order}&orderBy=${orderBy}&docType=${docType}&statusType=${statusType}`
            )
            const docData = response.data

            setTotalCount(docData.total)
            setUpdatedDocuments(docData.documents)
            setTheMessage('Data updated successfully')
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' })
            }
        } catch (err) {
            setTheMessage('Error fetching data')
        }
    }, [endpoint, filterString, page, rowsPerPage, orderBy, order, docType, statusType])

    useEffect(() => {
        fetchData()
    }, [fetchData, page, rowsPerPage, filterString, orderBy, order, docType, statusType])

    const handleRequestSort = (event: MouseEvent<unknown>, property: keyof Document) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const handleDocTypeChange = (event: SelectChangeEvent<string>) => {
        setDocType(event.target.value)
    }

    const handleStatusTypeChange = (event: SelectChangeEvent<string>) => {
        setStatusType(event.target.value)
    }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
        const keyword = event.target.value
        setPage(0)
        setFilterString(keyword)
    }

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    return (
        <Box>
            <SnackMessage message={theMessage} />

            <Grid container sx={{ mb: 2 }} rowSpacing={4} columnSpacing={4} ref={scrollRef}>
                <Grid item xs={12} sm={4}>
                    <Fieldset legend='Filter by keyword'>
                        <TextField
                            placeholder='Enter keyword here'
                            size='small'
                            sx={{ boxShadow: 'none', '.MuiOutlinedInput-notchedOutline': { border: 0 } }}
                            value={filterString}
                            onChange={handleKeywordChange}
                            variant='outlined'
                            fullWidth
                        />
                    </Fieldset>
                </Grid>

                {!prefilterSource ? (
                    <Grid item xs={12} sm={4}>
                        <Fieldset legend='Document Type'>
                            <Select
                                labelId='doc-type-select-label'
                                id='doc-type-select'
                                value={docType}
                                size='small'
                                sx={{ boxShadow: 'none', '.MuiOutlinedInput-notchedOutline': { border: 0 } }}
                                fullWidth
                                onChange={handleDocTypeChange}
                            >
                                <MenuItem key='doc-type-all' value=''>
                                    All Types
                                </MenuItem>

                                <MenuItem key='doc-type-file' value='file'>
                                    File
                                </MenuItem>

                                <MenuItem key='doc-type-codebase' value='codebase'>
                                    Codebase
                                </MenuItem>

                                <MenuItem key='doc-type-zoom' value='zoom'>
                                    Zoom
                                </MenuItem>

                                <MenuItem key='doc-type-document' value='document'>
                                    Document
                                </MenuItem>

                                <MenuItem key='doc-type-youtube' value='youtube'>
                                    Youtube
                                </MenuItem>
                            </Select>
                        </Fieldset>
                    </Grid>
                ) : null}

                <Grid item xs={12} sm={4}>
                    <Fieldset legend='Status'>
                        <Select
                            labelId='status-type-select-label'
                            id='status-type-select'
                            value={statusType}
                            size='small'
                            sx={{ boxShadow: 'none', '.MuiOutlinedInput-notchedOutline': { border: 0 } }}
                            fullWidth
                            onChange={handleStatusTypeChange}
                        >
                            <MenuItem key='status-type-all' value=''>
                                All Statuses
                            </MenuItem>

                            <MenuItem key='status-type-file' value='pending'>
                                Pending
                            </MenuItem>

                            <MenuItem key='status-type-codebase' value='syncing'>
                                Syncing
                            </MenuItem>

                            <MenuItem key='status-type-zoom' value='synced'>
                                Synced
                            </MenuItem>

                            <MenuItem key='status-type-document' value='error'>
                                Error
                            </MenuItem>
                        </Select>
                    </Fieldset>
                </Grid>
            </Grid>

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Pagination />
                <TableContainer>
                    <Table sx={{ minWidth: '100%' }} aria-labelledby='tableDocumentSync' size='small'>
                        <EnhancedTableHead
                            prefilterSource={!!prefilterSource}
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                        />
                        <TableBody>
                            {updatedDocuments.map((row: any) => {
                                return (
                                    <TableRow key={row.url}>
                                        {!prefilterSource ? <TableCell sx={{ textTransform: 'capitalize' }}>{row.source}</TableCell> : null}
                                        <TableCell>{row.title ?? row.url}</TableCell>
                                        {/* <TableCell>{row.url}</TableCell> */}
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{row.status}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatLocalTime(row.lastSyncedAt)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatLocalTime(row.createdAt)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatLocalTime(row.updatedAt)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Pagination />
            </Paper>
        </Box>
    )
}

export default SyncStatusList
