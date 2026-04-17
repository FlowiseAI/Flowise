import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import moment from 'moment/moment'
import * as PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import {
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    Paper,
    Popover,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import { styled, useTheme } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import { Available } from '@/ui-component/rbac/available'
import APIKeyDialog from './APIKeyDialog'

// API
import apiKeyApi from '@/api/apikey'
import { useError } from '@/store/context/ErrorContext'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import APIEmptySVG from '@/assets/images/api_empty.svg'
import { IconChevronsDown, IconChevronsUp, IconCopy, IconEdit, IconEye, IconEyeOff, IconPlus, IconTrash, IconX } from '@tabler/icons-react'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| APIKey ||============================== //

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    padding: '6px 16px',

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

function APIKeyRow(props) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const theme = useTheme()

    const permissions = props.apiKey.permissions || []

    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell scope='row' style={{ width: '15%' }}>
                    {props.apiKey.keyName}
                </StyledTableCell>
                <StyledTableCell style={{ width: '25%' }}>
                    {props.showApiKeys.includes(props.apiKey.apiKey)
                        ? props.apiKey.apiKey
                        : `${props.apiKey.apiKey.substring(0, 2)}${'•'.repeat(18)}${props.apiKey.apiKey.substring(
                              props.apiKey.apiKey.length - 5
                          )}`}
                    <IconButton title={t('common.actions.copy')} color='success' onClick={props.onCopyClick}>
                        <IconCopy />
                    </IconButton>
                    <IconButton title={t('apiKey.actions.show')} color='inherit' onClick={props.onShowAPIClick}>
                        {props.showApiKeys.includes(props.apiKey.apiKey) ? <IconEyeOff /> : <IconEye />}
                    </IconButton>
                    <Popover
                        open={props.open}
                        anchorEl={props.anchorEl}
                        onClose={props.onClose}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right'
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left'
                        }}
                    >
                        <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: props.theme.palette.success.dark }}>
                            {t('common.messages.copied')}
                        </Typography>
                    </Popover>
                </StyledTableCell>
                <StyledTableCell sx={{ width: '25%' }}>
                    <Stack sx={{ flexDirection: 'row' }}>
                        <Typography
                            variant='subtitle2'
                            color='textPrimary'
                            sx={{
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical'
                            }}
                        >
                            {permissions.map((d, key) => (
                                <React.Fragment key={key}>
                                    {d}
                                    {', '}
                                </React.Fragment>
                            ))}
                        </Typography>
                    </Stack>
                </StyledTableCell>
                <StyledTableCell>
                    {props.apiKey.chatFlows.length}{' '}
                    {props.apiKey.chatFlows.length > 0 && (
                        <IconButton aria-label={t('common.actions.expandRow')} size='small' color='inherit' onClick={() => setOpen(!open)}>
                            {props.apiKey.chatFlows.length > 0 && open ? <IconChevronsUp /> : <IconChevronsDown />}
                        </IconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>{moment(props.apiKey.createdAt).format(t('common.formats.dateMonthDayYear'))}</StyledTableCell>
                <Available permission={'apikeys:update,apikeys:create'}>
                    <StyledTableCell>
                        <IconButton title={t('common.actions.edit')} color='primary' onClick={props.onEditClick}>
                            <IconEdit />
                        </IconButton>
                    </StyledTableCell>
                </Available>
                <Available permission={'apikeys:delete'}>
                    <StyledTableCell>
                        <IconButton title={t('common.actions.delete')} color='error' onClick={props.onDeleteClick}>
                            <IconTrash />
                        </IconButton>
                    </StyledTableCell>
                </Available>
            </TableRow>
            {open && (
                <TableRow sx={{ '& td': { border: 0 } }}>
                    <StyledTableCell sx={{ p: 2 }} colSpan={7}>
                        <Collapse in={open} timeout='auto' unmountOnExit>
                            <Box sx={{ borderRadius: 2, border: 1, borderColor: theme.palette.grey[900] + 25, overflow: 'hidden' }}>
                                <Table aria-label={t('apiKey.chatflowTable.title')}>
                                    <TableHead sx={{ height: 48 }}>
                                        <TableRow>
                                            <StyledTableCell sx={{ width: '30%' }}>{t('apiKey.chatflowTable.name')}</StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>{t('apiKey.chatflowTable.modifiedOn')}</StyledTableCell>
                                            <StyledTableCell sx={{ width: '50%' }}>{t('apiKey.chatflowTable.category')}</StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {props.apiKey.chatFlows.map((flow, index) => (
                                            <TableRow key={index}>
                                                <StyledTableCell>{flow.flowName}</StyledTableCell>
                                                <StyledTableCell>
                                                    {moment(flow.updatedDate).format(t('common.formats.dateMonthDayYear'))}
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    &nbsp;
                                                    {flow.category &&
                                                        flow.category
                                                            .split(';')
                                                            .map((tag, index) => (
                                                                <Chip key={index} label={tag} style={{ marginRight: 5, marginBottom: 5 }} />
                                                            ))}
                                                </StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </StyledTableCell>
                </TableRow>
            )}
        </>
    )
}

APIKeyRow.propTypes = {
    apiKey: PropTypes.any,
    showApiKeys: PropTypes.arrayOf(PropTypes.any),
    onCopyClick: PropTypes.func,
    onShowAPIClick: PropTypes.func,
    open: PropTypes.bool,
    anchorEl: PropTypes.any,
    onClose: PropTypes.func,
    theme: PropTypes.any,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func
}
const APIKey = () => {
    const { t } = useTranslation()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [apiKeys, setAPIKeys] = useState([])
    const [anchorEl, setAnchorEl] = useState(null)
    const [showApiKeys, setShowApiKeys] = useState([])
    const openPopOver = Boolean(anchorEl)

    const [search, setSearch] = useState('')

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
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllAPIKeysApi.request(params)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }
    function filterKeys(data) {
        return data.keyName.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const { confirm } = useConfirm()

    const getAllAPIKeysApi = useApi(apiKeyApi.getAllAPIKeys)

    const onShowApiKeyClick = (apikey) => {
        const index = showApiKeys.indexOf(apikey)
        if (index > -1) {
            //showApiKeys.splice(index, 1)
            const newShowApiKeys = showApiKeys.filter(function (item) {
                return item !== apikey
            })
            setShowApiKeys(newShowApiKeys)
        } else {
            setShowApiKeys((prevkeys) => [...prevkeys, apikey])
        }
    }

    const handleClosePopOver = () => {
        setAnchorEl(null)
    }

    const addNew = () => {
        const dialogProp = {
            title: t('apiKey.actions.addKey'),
            type: 'ADD',
            cancelButtonName: t('common.actions.cancel'),
            confirmButtonName: t('common.actions.add'),
            customBtnId: 'btn_confirmAddingApiKey'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (key) => {
        const dialogProp = {
            title: t('apiKey.actions.editKey'),
            type: 'EDIT',
            cancelButtonName: t('common.actions.cancel'),
            confirmButtonName: t('common.actions.save'),
            customBtnId: 'btn_confirmEditingApiKey',
            key
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const deleteKey = async (key) => {
        const confirmPayload = {
            title: t('common.dialogs.delete'),
            description:
                key.chatFlows.length === 0
                    ? t('apiKey.dialogs.delete.description.simple', { name: key.keyName })
                    : t('apiKey.dialogs.delete.description.inUse', { name: key.keyName, count: key.chatFlows.length }),
            confirmButtonName: t('common.actions.delete'),
            cancelButtonName: t('common.actions.cancel'),
            customBtnId: 'btn_initiateDeleteApiKey'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await apiKeyApi.deleteAPI(key.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: t('apiKey.messages.delete.success'),
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
                    message: t('apiKey.messages.delete.error', {
                        msg: typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }),
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
    }

    const onConfirm = () => {
        setShowDialog(false)
        refresh(currentPage, pageLimit)
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllAPIKeysApi.loading)
    }, [getAllAPIKeysApi.loading])

    useEffect(() => {
        if (getAllAPIKeysApi.data) {
            setAPIKeys(getAllAPIKeysApi.data?.data)
            setTotal(getAllAPIKeysApi.data?.total)
        }
    }, [getAllAPIKeysApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder={t('apiKey.searchPlaceholder')}
                            title={t('apiKey.title')}
                            description={t('apiKey.description')}
                        >
                            <StyledPermissionButton
                                permissionId={'apikeys:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                id='btn_createApiKey'
                            >
                                {t('apiKey.actions.createKey')}
                            </StyledPermissionButton>
                        </ViewHeader>
                        {!isLoading && apiKeys?.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={APIEmptySVG}
                                        alt='APIEmptySVG'
                                    />
                                </Box>
                                <div>{t('apiKey.notFound')}</div>
                            </Stack>
                        ) : (
                            <>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }} aria-label={t('common.labels.simpleTable')}>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <StyledTableCell>{t('apiKey.keyTable.keyName')}</StyledTableCell>
                                                <StyledTableCell>{t('apiKey.keyTable.apiKey')}</StyledTableCell>
                                                <StyledTableCell>{t('apiKey.keyTable.permissions')}</StyledTableCell>
                                                <StyledTableCell>{t('apiKey.keyTable.usage')}</StyledTableCell>
                                                <StyledTableCell>{t('apiKey.keyTable.updated')}</StyledTableCell>
                                                <Available permission={'apikeys:update,apikeys:create'}>
                                                    <StyledTableCell> </StyledTableCell>
                                                </Available>
                                                <Available permission={'apikeys:delete'}>
                                                    <StyledTableCell> </StyledTableCell>
                                                </Available>
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
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <Available permission={'apikeys:update,apikeys:create'}>
                                                            <StyledTableCell> </StyledTableCell>
                                                        </Available>
                                                        <Available permission={'apikeys:delete'}>
                                                            <StyledTableCell> </StyledTableCell>
                                                        </Available>
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
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <Available permission={'apikeys:update,apikeys:create'}>
                                                            <StyledTableCell> </StyledTableCell>
                                                        </Available>
                                                        <Available permission={'apikeys:delete'}>
                                                            <StyledTableCell> </StyledTableCell>
                                                        </Available>
                                                    </StyledTableRow>
                                                </>
                                            ) : (
                                                <>
                                                    {apiKeys?.filter(filterKeys).map((key, index) => (
                                                        <APIKeyRow
                                                            key={index}
                                                            apiKey={key}
                                                            showApiKeys={showApiKeys}
                                                            onCopyClick={(event) => {
                                                                navigator.clipboard.writeText(key.apiKey)
                                                                setAnchorEl(event.currentTarget)
                                                                setTimeout(() => {
                                                                    handleClosePopOver()
                                                                }, 1500)
                                                            }}
                                                            onShowAPIClick={() => onShowApiKeyClick(key.apiKey)}
                                                            open={openPopOver}
                                                            anchorEl={anchorEl}
                                                            onClose={handleClosePopOver}
                                                            theme={theme}
                                                            onEditClick={() => edit(key)}
                                                            onDeleteClick={() => deleteKey(key)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {/* Pagination and Page Size Controls */}
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            <APIKeyDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></APIKeyDialog>
            <ConfirmDialog />
        </>
    )
}

export default APIKey
