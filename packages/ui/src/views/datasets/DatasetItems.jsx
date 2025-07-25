import { useEffect, useRef, useState } from 'react'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import {
    Checkbox,
    Skeleton,
    Box,
    TableRow,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableBody,
    Button,
    Stack,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import AddEditDatasetRowDialog from './AddEditDatasetRowDialog'
import UploadCSVFileDialog from '@/views/datasets/UploadCSVFileDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { useError } from '@/store/context/ErrorContext'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import AddEditDatasetDialog from '@/views/datasets/AddEditDatasetDialog'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import datasetsApi from '@/api/dataset'

// Hooks
import useApi from '@/hooks/useApi'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'
import useConfirm from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'

// icons
import empty_datasetSVG from '@/assets/images/empty_datasets.svg'
import { IconTrash, IconPlus, IconX, IconUpload, IconArrowsDownUp } from '@tabler/icons-react'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

// ==============================|| Dataset Items ||============================== //

const EvalDatasetRows = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error } = useError()

    const [showRowDialog, setShowRowDialog] = useState(false)
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [rowDialogProps, setRowDialogProps] = useState({})
    const [showDatasetDialog, setShowDatasetDialog] = useState(false)
    const [datasetDialogProps, setDatasetDialogProps] = useState({})

    const [dataset, setDataset] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [selected, setSelected] = useState([])

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const { confirm } = useConfirm()

    const getDatasetRows = useApi(datasetsApi.getDataset)
    const reorderDatasetRowApi = useApi(datasetsApi.reorderDatasetRow)

    const URLpath = document.location.pathname.toString().split('/')
    const datasetId = URLpath[URLpath.length - 1] === 'dataset_rows' ? '' : URLpath[URLpath.length - 1]

    const { hasPermission } = useAuth()

    const draggingItem = useRef()
    const dragOverItem = useRef()
    const [Draggable, setDraggable] = useState(false)
    const [startDragPos, setStartDragPos] = useState(-1)
    const [endDragPos, setEndDragPos] = useState(-1)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)
    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        setLoading(true)
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getDatasetRows.request(datasetId, params)
    }

    const handleDragStart = (e, position) => {
        draggingItem.current = position
        setStartDragPos(position)
        setEndDragPos(-1)
    }
    const handleDragEnter = (e, position) => {
        setEndDragPos(position)
        dragOverItem.current = position
    }

    const handleDragEnd = (e, position) => {
        dragOverItem.current = position
        const updatedDataset = { ...dataset }
        updatedDataset.rows.splice(endDragPos, 0, dataset.rows.splice(startDragPos, 1)[0])
        setDataset({ ...updatedDataset })
        e.preventDefault()
        const updatedRows = []

        dataset.rows.map((item, index) => {
            updatedRows.push({
                id: item.id,
                sequenceNo: index
            })
        })
        reorderDatasetRowApi.request({ datasetId: datasetId, rows: updatedRows })
    }

    const onSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = (dataset?.rows || []).map((n) => n.id)
            setSelected(newSelected)
            return
        }
        setSelected([])
    }

    const handleSelect = (event, id) => {
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

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: {
                datasetId: datasetId,
                datasetName: dataset.name
            }
        }
        setRowDialogProps(dialogProp)
        setShowRowDialog(true)
    }

    const uploadCSV = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Upload',
            data: {
                datasetId: datasetId,
                datasetName: dataset.name
            }
        }
        setRowDialogProps(dialogProp)
        setShowUploadDialog(true)
    }

    const editDs = () => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: dataset
        }
        setDatasetDialogProps(dialogProp)
        setShowDatasetDialog(true)
    }

    const edit = (item) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: {
                datasetName: dataset.name,
                ...item
            }
        }
        setRowDialogProps(dialogProp)
        setShowRowDialog(true)
    }

    const deleteDatasetItems = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${selected.length} dataset items?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await datasetsApi.deleteDatasetItems(selected)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Dataset Items deleted',
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
                    onConfirm()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete dataset items: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
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
            }
            setSelected([])
        }
    }

    const onConfirm = () => {
        setShowRowDialog(false)
        setShowUploadDialog(false)
        setShowDatasetDialog(false)
        refresh(currentPage, pageLimit)
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getDatasetRows.data) {
            const dataset = getDatasetRows.data
            setDataset(dataset)
            setTotal(dataset.total)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDatasetRows.data])

    useEffect(() => {
        setLoading(getDatasetRows.loading)
    }, [getDatasetRows.loading])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            isEditButton={hasPermission('datasets:create,datasets:update')}
                            onEdit={editDs}
                            onBack={() => window.history.back()}
                            search={false}
                            title={`Dataset : ${dataset?.name || ''}`}
                            description={dataset?.description}
                        >
                            <StyledPermissionButton
                                permissionId={'datasets:create,datasets:update'}
                                variant='outlined'
                                color='secondary'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={uploadCSV}
                                startIcon={<IconUpload />}
                            >
                                Upload CSV
                            </StyledPermissionButton>
                            <StyledPermissionButton
                                permissionId={'datasets:create,datasets:update'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                            >
                                New Item
                            </StyledPermissionButton>
                        </ViewHeader>
                        {selected.length > 0 && (
                            <PermissionButton
                                permissionId={'datasets:delete'}
                                sx={{ mt: 1, mb: 2, width: 'max-content' }}
                                variant='outlined'
                                onClick={deleteDatasetItems}
                                color='error'
                                startIcon={<IconTrash />}
                            >
                                Delete {selected.length} {selected.length === 1 ? 'item' : 'items'}
                            </PermissionButton>
                        )}
                        {!isLoading && dataset?.rows?.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={empty_datasetSVG}
                                        alt='empty_datasetSVG'
                                    />
                                </Box>
                                <div>No Dataset Items Yet</div>
                                <StyledPermissionButton
                                    permissionId={'datasets:create,datasets:update'}
                                    variant='contained'
                                    sx={{ borderRadius: 2, height: '100%', mt: 2, color: 'white' }}
                                    startIcon={<IconPlus />}
                                    onClick={addNew}
                                >
                                    New Item
                                </StyledPermissionButton>
                            </Stack>
                        ) : (
                            <React.Fragment>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <StyledTableCell padding='checkbox'>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={selected.length === (dataset?.rows || []).length}
                                                        onChange={onSelectAllClick}
                                                        inputProps={{
                                                            'aria-label': 'select all'
                                                        }}
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell>Input</StyledTableCell>
                                                <StyledTableCell>Expected Output</StyledTableCell>
                                                <StyledTableCell style={{ width: '1%' }}>
                                                    <IconArrowsDownUp />
                                                </StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isLoading ? (
                                                <>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                </>
                                            ) : (
                                                <>
                                                    {(dataset?.rows || []).map((item, index) => (
                                                        <StyledTableRow
                                                            draggable={Draggable}
                                                            onDragStart={(e) => handleDragStart(e, index)}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDragEnter={(e) => handleDragEnter(e, index)}
                                                            onDragEnd={(e) => handleDragEnd(e, index)}
                                                            hover
                                                            key={index}
                                                            sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                                        >
                                                            <StyledTableCell
                                                                padding='checkbox'
                                                                onMouseDown={() => setDraggable(false)}
                                                                onMouseUp={() => setDraggable(true)}
                                                            >
                                                                <Checkbox
                                                                    color='primary'
                                                                    checked={selected.indexOf(item.id) !== -1}
                                                                    onChange={(event) => handleSelect(event, item.id)}
                                                                    inputProps={{
                                                                        'aria-labelledby': item.id
                                                                    }}
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell
                                                                onClick={() => edit(item)}
                                                                onMouseDown={() => setDraggable(false)}
                                                                onMouseUp={() => setDraggable(true)}
                                                            >
                                                                {item.input}
                                                            </StyledTableCell>
                                                            <StyledTableCell
                                                                onClick={() => edit(item)}
                                                                onMouseDown={() => setDraggable(false)}
                                                                onMouseUp={() => setDraggable(true)}
                                                            >
                                                                {item.output}
                                                            </StyledTableCell>
                                                            <StyledTableCell style={{ width: '1%' }}>
                                                                <DragIndicatorIcon
                                                                    onMouseDown={() => setDraggable(true)}
                                                                    onMouseUp={() => setDraggable(false)}
                                                                />
                                                            </StyledTableCell>
                                                        </StyledTableRow>
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Typography sx={{ color: theme.palette.grey[600], marginTop: -2 }} variant='subtitle2'>
                                    <i>Use the drag icon at (extreme right) to reorder the dataset items</i>
                                </Typography>
                                {/* Pagination and Page Size Controls */}
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            </React.Fragment>
                        )}
                    </Stack>
                )}
            </MainCard>
            <AddEditDatasetRowDialog
                show={showRowDialog}
                dialogProps={rowDialogProps}
                onCancel={() => setShowRowDialog(false)}
                onConfirm={onConfirm}
            ></AddEditDatasetRowDialog>
            {showUploadDialog && (
                <UploadCSVFileDialog
                    show={showUploadDialog}
                    dialogProps={rowDialogProps}
                    onCancel={() => setShowUploadDialog(false)}
                    onConfirm={onConfirm}
                ></UploadCSVFileDialog>
            )}
            {showDatasetDialog && (
                <AddEditDatasetDialog
                    show={showDatasetDialog}
                    dialogProps={datasetDialogProps}
                    onCancel={() => setShowDatasetDialog(false)}
                    onConfirm={onConfirm}
                ></AddEditDatasetDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default EvalDatasetRows
