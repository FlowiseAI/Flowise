'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import moment from 'moment'
import { useSearchParams } from 'next/navigation'

// material-ui
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Button,
    Box,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    useTheme,
    Tabs,
    Tab,
    Chip,
    TableSortLabel
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import dynamic from 'next/dynamic'

const CredentialListDialog = dynamic(() => import('./CredentialListDialog'), { ssr: false })
const ConfirmDialog = dynamic(() => import('@/ui-component/dialog/ConfirmDialog'), { ssr: false })
const AddEditCredentialDialog = dynamic(() => import('./AddEditCredentialDialog'), { ssr: false })

// API
import credentialsApi from '@/api/credentials'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconTrash, IconEdit, IconX, IconPlus } from '@tabler/icons-react'
import keySVG from '@/assets/images/key.svg'

// const
import { baseURL } from '@/store/constant'
import { SET_COMPONENT_CREDENTIALS } from '@/store/actions'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { useFlags } from 'flagsmith/react'

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

// ==============================|| Credentials ||============================== //

const Credentials = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const searchParams = useSearchParams()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCredentialListDialog, setShowCredentialListDialog] = useState(false)
    const [credentialListDialogProps, setCredentialListDialogProps] = useState({})
    const [showSpecificCredentialDialog, setShowSpecificCredentialDialog] = useState(false)
    const [specificCredentialDialogProps, setSpecificCredentialDialogProps] = useState({})
    const [credentials, setCredentials] = useState([])
    const [componentsCredentials, setComponentsCredentials] = useState([])
    const [orgCredentialsSettings, setOrgCredentialsSettings] = useState([])
    const [tabValue, setTabValue] = useState(0)
    const flags = useFlags(['org:manage'])
    const [myCredentials, setMyCredentials] = useState([])
    const [organizationCredentials, setOrganizationCredentials] = useState([])

    const { confirm } = useConfirm()

    const getAllCredentialsApi = useApi(credentialsApi.getAllCredentials)
    const getAllComponentsCredentialsApi = useApi(credentialsApi.getAllComponentsCredentials)

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }
    function filterCredentials(data) {
        return data.credentialName.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    // Use organization credentials API
    const getOrgCredentialsApi = useApi(credentialsApi.getOrgCredentials)

    // Filter component credentials based on org settings
    const getFilteredComponentsCredentials = () => {
        const isAdmin = flags['org:manage']?.enabled

        // Admins see all credentials
        if (isAdmin) {
            return componentsCredentials
        }

        // Non-admins only see org-enabled credentials
        if (orgCredentialsSettings.length === 0) {
            // If no org settings exist, show all credentials (fallback behavior)
            return componentsCredentials
        }

        // Filter based on org settings
        const enabledCredentialNames = orgCredentialsSettings.filter((setting) => setting.enabled).map((setting) => setting.name)

        return componentsCredentials.filter((credential) => enabledCredentialNames.includes(credential.name))
    }

    const listCredential = () => {
        const filteredCredentials = getFilteredComponentsCredentials()
        const dialogProp = {
            title: 'Add New Credential',
            componentsCredentials: filteredCredentials
        }
        setCredentialListDialogProps(dialogProp)
        setShowCredentialListDialog(true)
    }

    const addNew = useCallback((credentialComponent) => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            credentialComponent
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }, [])

    const edit = useCallback((credential) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: credential
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }, [])

    const deleteCredential = async (credential) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete credential ${credential.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await credentialsApi.deleteCredential(credential.id)
                enqueueSnackbar({
                    message: 'Credential deleted',
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
            } catch (error) {
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete credential: ${errorData}`,
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
                onConfirm()
            }
        }
    }

    const onCredentialSelected = (credentialComponent) => {
        setShowCredentialListDialog(false)
        addNew(credentialComponent)
    }

    const onConfirm = () => {
        setShowCredentialListDialog(false)
        setShowSpecificCredentialDialog(false)
        getAllCredentialsApi.request()
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    // Add sorting state
    const [order, setOrder] = useState('asc')
    const [orderBy, setOrderBy] = useState('name')

    // Add sorting handler
    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    // Add sorting function
    const sortData = (data) => {
        return data.sort((a, b) => {
            let aValue = a[orderBy === 'name' ? 'name' : orderBy]
            let bValue = b[orderBy === 'name' ? 'name' : orderBy]

            // Convert dates to timestamps for comparison
            if (orderBy === 'updatedDate' || orderBy === 'createdDate') {
                aValue = new Date(aValue).getTime()
                bValue = new Date(bValue).getTime()
            }

            // Case-insensitive comparison for names
            if (orderBy === 'name') {
                aValue = aValue.toLowerCase()
                bValue = bValue.toLowerCase()
            }

            if (order === 'desc') {
                return bValue < aValue ? -1 : bValue > aValue ? 1 : 0
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            }
        })
    }

    useEffect(() => {
        getAllCredentialsApi.request()
        getAllComponentsCredentialsApi.request()
        getOrgCredentialsApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getOrgCredentialsApi.data) {
            // Transform the integrations data to match the expected format
            const orgSettings =
                getOrgCredentialsApi.data.integrations?.map((integration) => ({
                    name: integration.credentialName,
                    enabled: integration.enabled
                })) || []
            setOrgCredentialsSettings(orgSettings)
        }
    }, [getOrgCredentialsApi.data])

    useEffect(() => {
        setLoading(getAllCredentialsApi.loading)
    }, [getAllCredentialsApi.loading])

    useEffect(() => {
        if (getAllCredentialsApi.data) {
            setCredentials(getAllCredentialsApi.data)
            const allCredentials = getAllCredentialsApi.data
            setMyCredentials(allCredentials.filter((cred) => cred.isOwner))
            setOrganizationCredentials(allCredentials.filter((cred) => !cred.isOwner))
        }
    }, [getAllCredentialsApi.data])

    useEffect(() => {
        if (getAllCredentialsApi.error) {
            setError(getAllCredentialsApi.error)
        }
    }, [getAllCredentialsApi.error])

    // Helper function to check if a string is a UUID
    const isUUID = (str) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return uuidRegex.test(str)
    }

    useEffect(() => {
        if (getAllComponentsCredentialsApi.data && getAllCredentialsApi.data) {
            setComponentsCredentials(getAllComponentsCredentialsApi.data)
            dispatch({ type: SET_COMPONENT_CREDENTIALS, componentsCredentials: getAllComponentsCredentialsApi.data })

            // Handle deep linking from URL parameter
            const credParam = searchParams.get('cred')
            if (credParam) {
                // Check if it's a UUID (existing credential)
                if (isUUID(credParam)) {
                    const credential = getAllCredentialsApi.data.find((cred) => cred.id === credParam)
                    if (credential) {
                        edit(credential)
                    }
                } else {
                    // It's a credential name (new credential)
                    const credComponent = getAllComponentsCredentialsApi.data.find(
                        (comp) => comp.name.toLowerCase() === credParam.toLowerCase()
                    )
                    if (credComponent) {
                        addNew(credComponent)
                    }
                }
            }
        }
    }, [getAllComponentsCredentialsApi.data, getAllCredentialsApi.data, addNew, edit, dispatch, searchParams])

    const isAdmin = flags?.['org:manage']?.enabled

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
                            searchPlaceholder='Search Credentials'
                            title='Credentials'
                            description='API keys, tokens, and secrets for 3rd party integrations'
                        >
                            <StyledButton
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={listCredential}
                                startIcon={<IconPlus />}
                            >
                                Add Credential
                            </StyledButton>
                        </ViewHeader>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label='credential tabs'>
                                <Tab label='My Credentials' />
                                <Tab label='Organization Credentials' />
                            </Tabs>
                        </Box>

                        {isLoading ? (
                            <Stack spacing={1}>
                                <Skeleton variant='rounded' height={60} />
                                <Skeleton variant='rounded' height={60} />
                                <Skeleton variant='rounded' height={60} />
                            </Stack>
                        ) : (
                            <Stack spacing={3}>
                                <TableContainer component={Paper} sx={{ border: 1, borderColor: theme.palette.grey[900] + 25 }}>
                                    <Table sx={{ minWidth: 650 }} size='small' aria-label='credentials table'>
                                        <TableHead>
                                            <TableRow>
                                                <StyledTableCell component='th' scope='row'>
                                                    <TableSortLabel
                                                        active={orderBy === 'name'}
                                                        direction={orderBy === 'name' ? order : 'asc'}
                                                        onClick={() => handleRequestSort('name')}
                                                    >
                                                        Name
                                                    </TableSortLabel>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'credentialName'}
                                                        direction={orderBy === 'credentialName' ? order : 'asc'}
                                                        onClick={() => handleRequestSort('credentialName')}
                                                    >
                                                        Credential Type
                                                    </TableSortLabel>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'updatedDate'}
                                                        direction={orderBy === 'updatedDate' ? order : 'asc'}
                                                        onClick={() => handleRequestSort('updatedDate')}
                                                    >
                                                        Last Modified
                                                    </TableSortLabel>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'createdDate'}
                                                        direction={orderBy === 'createdDate' ? order : 'asc'}
                                                        onClick={() => handleRequestSort('createdDate')}
                                                    >
                                                        Created
                                                    </TableSortLabel>
                                                </StyledTableCell>
                                                <StyledTableCell>Actions</StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortData(
                                                (tabValue === 0 ? myCredentials : organizationCredentials).filter(filterCredentials)
                                            ).map((credential, index) => (
                                                <StyledTableRow key={index}>
                                                    <StyledTableCell component='th' scope='row'>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                            <div
                                                                style={{
                                                                    width: 25,
                                                                    height: 25,
                                                                    marginRight: 10,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: 'white'
                                                                }}
                                                            >
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 3,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={credential.credentialName}
                                                                    src={`${baseURL}/api/v1/components-credentials-icon/${credential.credentialName}`}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null
                                                                        e.target.style.padding = '2px'
                                                                        e.target.src = keySVG
                                                                    }}
                                                                />
                                                            </div>
                                                            <Box>
                                                                {credential.name}
                                                                {!credential.isOwner && (
                                                                    <Chip label='Shared' size='small' variant='outlined' sx={{ ml: 1 }} />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </StyledTableCell>
                                                    <StyledTableCell>{credential.credentialName}</StyledTableCell>
                                                    <StyledTableCell>
                                                        {moment(credential.updatedDate).format('MMMM Do, YYYY')}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        {moment(credential.createdDate).format('MMMM Do, YYYY')}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton title='Edit' color='primary' onClick={() => edit(credential)}>
                                                            <IconEdit />
                                                        </IconButton>
                                                        {credential.isOwner && (
                                                            <IconButton
                                                                title='Delete'
                                                                color='error'
                                                                onClick={() => deleteCredential(credential)}
                                                            >
                                                                <IconTrash />
                                                            </IconButton>
                                                        )}
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <CredentialListDialog
                show={showCredentialListDialog}
                dialogProps={credentialListDialogProps}
                onCancel={() => setShowCredentialListDialog(false)}
                onCredentialSelected={onCredentialSelected}
            ></CredentialListDialog>
            <AddEditCredentialDialog
                key={specificCredentialDialogProps.name}
                show={showSpecificCredentialDialog}
                dialogProps={specificCredentialDialogProps}
                onCancel={() => setShowSpecificCredentialDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></AddEditCredentialDialog>
            <ConfirmDialog />
        </>
    )
}

export default Credentials
