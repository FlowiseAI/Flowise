import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// material-ui
import {
    Button,
    Box,
    Chip,
    Stack,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Popover,
    Collapse,
    Typography,
    Toolbar,
    TextField,
    InputAdornment,
    ButtonGroup
} from '@mui/material'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import { useTheme, styled } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import APIKeyDialog from './APIKeyDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import apiKeyApi from '@/api/apikey'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import {
    IconTrash,
    IconEdit,
    IconCopy,
    IconChevronsUp,
    IconChevronsDown,
    IconX,
    IconSearch,
    IconPlus,
    IconEye,
    IconEyeOff
} from '@tabler/icons'
import APIEmptySVG from '@/assets/images/api_empty.svg'
import * as PropTypes from 'prop-types'
import moment from 'moment/moment'

// ==============================|| APIKey ||============================== //
const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.action.hover
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

function APIKeyRow(props) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell scope='row'>{props.apiKey.keyName}</TableCell>
                <TableCell>
                    {props.showApiKeys.includes(props.apiKey.apiKey)
                        ? props.apiKey.apiKey
                        : `${props.apiKey.apiKey.substring(0, 2)}${'•'.repeat(18)}${props.apiKey.apiKey.substring(
                              props.apiKey.apiKey.length - 5
                          )}`}
                    <IconButton title='Copy' color='success' onClick={props.onCopyClick}>
                        <IconCopy />
                    </IconButton>
                    <IconButton title='Show' color='inherit' onClick={props.onShowAPIClick}>
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
                            Copied!
                        </Typography>
                    </Popover>
                </TableCell>
                <TableCell>
                    {props.apiKey.chatFlows.length}{' '}
                    {props.apiKey.chatFlows.length > 0 && (
                        <IconButton aria-label='expand row' size='small' color='inherit' onClick={() => setOpen(!open)}>
                            {props.apiKey.chatFlows.length > 0 && open ? <IconChevronsUp /> : <IconChevronsDown />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell>{props.apiKey.createdAt}</TableCell>
                <TableCell>
                    <IconButton title='Edit' color='primary' onClick={props.onEditClick}>
                        <IconEdit />
                    </IconButton>
                </TableCell>
                <TableCell>
                    <IconButton title='Delete' color='error' onClick={props.onDeleteClick}>
                        <IconTrash />
                    </IconButton>
                </TableCell>
            </TableRow>
            {open && (
                <TableRow sx={{ '& td': { border: 0 } }}>
                    <TableCell sx={{ pb: 0, pt: 0 }} colSpan={6}>
                        <Collapse in={open} timeout='auto' unmountOnExit>
                            <Box sx={{ mt: 1, mb: 2, borderRadius: '15px', border: '1px solid' }}>
                                <Table aria-label='chatflow table'>
                                    <TableHead>
                                        <TableRow>
                                            <StyledTableCell sx={{ width: '30%', borderTopLeftRadius: '15px' }}>
                                                Chatflow Name
                                            </StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>Modified On</StyledTableCell>
                                            <StyledTableCell sx={{ width: '50%', borderTopRightRadius: '15px' }}>Category</StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {props.apiKey.chatFlows.map((flow, index) => (
                                            <StyledTableRow key={index}>
                                                <TableCell>{flow.flowName}</TableCell>
                                                <TableCell>{moment(flow.updatedDate).format('DD-MMM-YY')}</TableCell>
                                                <TableCell>
                                                    &nbsp;
                                                    {flow.category &&
                                                        flow.category
                                                            .split(';')
                                                            .map((tag, index) => (
                                                                <Chip key={index} label={tag} style={{ marginRight: 5, marginBottom: 5 }} />
                                                            ))}
                                                </TableCell>
                                            </StyledTableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
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
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [apiKeys, setAPIKeys] = useState([])
    const [anchorEl, setAnchorEl] = useState(null)
    const [showApiKeys, setShowApiKeys] = useState([])
    const openPopOver = Boolean(anchorEl)

    const [search, setSearch] = useState('')
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
            title: 'Add New API Key',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            customBtnId: 'btn_confirmAddingApiKey'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (key) => {
        const dialogProp = {
            title: 'Edit API Key',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            customBtnId: 'btn_confirmEditingApiKey',
            key
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const deleteKey = async (key) => {
        const confirmPayload = {
            title: `Delete`,
            description:
                key.chatFlows.length === 0
                    ? `Delete key [${key.keyName}] ? `
                    : `Delete key [${key.keyName}] ?\n There are ${key.chatFlows.length} chatflows using this key.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel',
            customBtnId: 'btn_initiateDeleteApiKey'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await apiKeyApi.deleteAPI(key.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'API key deleted',
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
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete API key: ${errorData}`,
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
        getAllAPIKeysApi.request()
    }

    useEffect(() => {
        getAllAPIKeysApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAPIKeysApi.data) {
            setAPIKeys(getAllAPIKeysApi.data)
        }
    }, [getAllAPIKeysApi.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Box sx={{ flexGrow: 1 }}>
                        <Toolbar
                            disableGutters={true}
                            style={{
                                margin: 1,
                                padding: 1,
                                paddingBottom: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%'
                            }}
                        >
                            <h1>API Keys&nbsp;</h1>
                            <TextField
                                size='small'
                                sx={{ display: { xs: 'none', sm: 'block' }, ml: 3 }}
                                variant='outlined'
                                placeholder='Search key name'
                                onChange={onSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <IconSearch />
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Box sx={{ flexGrow: 1 }} />
                            <ButtonGroup
                                sx={{ maxHeight: 40 }}
                                disableElevation
                                variant='contained'
                                aria-label='outlined primary button group'
                            >
                                <ButtonGroup disableElevation aria-label='outlined primary button group'>
                                    <StyledButton
                                        variant='contained'
                                        sx={{ color: 'white', mr: 1, height: 37 }}
                                        onClick={addNew}
                                        startIcon={<IconPlus />}
                                        id='btn_createApiKey'
                                    >
                                        Create Key
                                    </StyledButton>
                                </ButtonGroup>
                            </ButtonGroup>
                        </Toolbar>
                    </Box>
                </Stack>
                {apiKeys.length <= 0 && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img style={{ objectFit: 'cover', height: '30vh', width: 'auto' }} src={APIEmptySVG} alt='APIEmptySVG' />
                        </Box>
                        <div>No API Keys Yet</div>
                    </Stack>
                )}
                {apiKeys.length > 0 && (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Key Name</TableCell>
                                    <TableCell>API Key</TableCell>
                                    <TableCell>Usage</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell> </TableCell>
                                    <TableCell> </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {apiKeys.filter(filterKeys).map((key, index) => (
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
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </MainCard>
            <APIKeyDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
            ></APIKeyDialog>
            <ConfirmDialog />
        </>
    )
}

export default APIKey
