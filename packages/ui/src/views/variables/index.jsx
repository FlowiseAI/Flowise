'use client'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import moment from 'moment'

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
    Chip,
    useTheme,
    Tabs,
    Tab
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { refreshVariablesCache } from '@/ui-component/input/suggestionOption'
import AddEditVariableDialog from './AddEditVariableDialog'
import HowToUseVariablesDialog from './HowToUseVariablesDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// API
import variablesApi from '@/api/variables'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconTrash, IconEdit, IconX, IconPlus, IconVariable } from '@tabler/icons-react'
import VariablesEmptySVG from '@/assets/images/variables_empty.svg'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,

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

// ==============================|| Variables ||============================== //

const Variables = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showVariableDialog, setShowVariableDialog] = useState(false)
    const [variableDialogProps, setVariableDialogProps] = useState({})
    const [variables, setVariables] = useState([])
    const [showHowToDialog, setShowHowToDialog] = useState(false)
    const [tabValue, setTabValue] = useState(0)
    const flags = useFlags(['org:manage'])
    const [myVariables, setMyVariables] = useState([])
    const [organizationVariables, setOrganizationVariables] = useState([])

    const { confirm } = useConfirm()

    const getAllVariables = useApi(variablesApi.getAllVariables)

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }
    function filterVariables(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            customBtnId: 'btn_confirmAddingVariable',
            data: {}
        }
        setVariableDialogProps(dialogProp)
        setShowVariableDialog(true)
    }

    const edit = (variable) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: variable
        }
        setVariableDialogProps(dialogProp)
        setShowVariableDialog(true)
    }

    const deleteVariable = async (variable) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete variable ${variable.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await variablesApi.deleteVariable(variable.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Variable deleted',
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
                    message: `Failed to delete Variable: ${
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
        }
    }

    const onConfirm = () => {
        setShowVariableDialog(false)
        getAllVariables.request()
        refreshVariablesCache()
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    useEffect(() => {
        getAllVariables.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllVariables.loading)
    }, [getAllVariables.loading])

    useEffect(() => {
        if (getAllVariables.error) {
            setError(getAllVariables.error)
        }
    }, [getAllVariables.error])

    useEffect(() => {
        if (getAllVariables.data) {
            setVariables(getAllVariables.data)
            const allVariables = getAllVariables.data
            setMyVariables(allVariables.filter((variable) => variable.isOwner))
            setOrganizationVariables(allVariables.filter((variable) => !variable.isOwner))
        }
    }, [getAllVariables.data])

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
                            searchPlaceholder='Search Variables'
                            title='Variables'
                            description='Create and manage global variables'
                        >
                            <Button variant='outlined' sx={{ borderRadius: 2, height: '100%' }} onClick={() => setShowHowToDialog(true)}>
                                How To Use
                            </Button>
                            <StyledButton
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                id='btn_createVariable'
                            >
                                Add Variable
                            </StyledButton>
                        </ViewHeader>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label='variable tabs'>
                                <Tab label='My Variables' />
                                <Tab label='Organization Variables' />
                            </Tabs>
                        </Box>
                        {!isLoading && variables.length === 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={VariablesEmptySVG}
                                        alt='VariablesEmptySVG'
                                    />
                                </Box>
                                <div>No Variables Yet</div>
                            </Stack>
                        ) : (
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
                                            <StyledTableCell>Name</StyledTableCell>
                                            <StyledTableCell>Value</StyledTableCell>
                                            <StyledTableCell>Type</StyledTableCell>
                                            <StyledTableCell>Visibility</StyledTableCell>
                                            <StyledTableCell>Last Updated</StyledTableCell>
                                            <StyledTableCell>Created</StyledTableCell>
                                            <StyledTableCell> </StyledTableCell>
                                            <StyledTableCell> </StyledTableCell>
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
                                                {(tabValue === 0 ? myVariables : organizationVariables)
                                                    .filter(filterVariables)
                                                    .map((variable, index) => (
                                                        <StyledTableRow
                                                            key={index}
                                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                        >
                                                            <StyledTableCell component='th' scope='row'>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'row',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            width: 25,
                                                                            height: 25,
                                                                            marginRight: 10,
                                                                            borderRadius: '50%'
                                                                        }}
                                                                    >
                                                                        <IconVariable
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                borderRadius: '50%',
                                                                                objectFit: 'contain'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    {variable.name}
                                                                </div>
                                                            </StyledTableCell>
                                                            <StyledTableCell>{variable.value}</StyledTableCell>
                                                            <StyledTableCell>
                                                                <Chip
                                                                    color={variable.type === 'static' ? 'info' : 'secondary'}
                                                                    size='small'
                                                                    label={variable.type}
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {variable.visibility.map((visibility, index) => (
                                                                    <Chip
                                                                        key={index}
                                                                        label={
                                                                            visibility.toLowerCase() === 'private'
                                                                                ? 'Private'
                                                                                : visibility.toLowerCase() === 'organization'
                                                                                ? 'Organization'
                                                                                : visibility.charAt(0).toUpperCase() + visibility.slice(1)
                                                                        }
                                                                        color={'primary'}
                                                                        size='small'
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                    />
                                                                ))}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {moment(variable.updatedDate).format('MMMM Do, YYYY HH:mm:ss')}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {moment(variable.createdDate).format('MMMM Do, YYYY HH:mm:ss')}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {(variable.isOwner || (isAdmin && tabValue === 1)) && (
                                                                    <IconButton title='Edit' color='primary' onClick={() => edit(variable)}>
                                                                        <IconEdit />
                                                                    </IconButton>
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {(variable.isOwner || (isAdmin && tabValue === 1)) && (
                                                                    <IconButton
                                                                        title='Delete'
                                                                        color='error'
                                                                        onClick={() => deleteVariable(variable)}
                                                                    >
                                                                        <IconTrash />
                                                                    </IconButton>
                                                                )}
                                                            </StyledTableCell>
                                                        </StyledTableRow>
                                                    ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                )}
            </MainCard>
            <AddEditVariableDialog
                show={showVariableDialog}
                dialogProps={variableDialogProps}
                onCancel={() => setShowVariableDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            ></AddEditVariableDialog>
            <HowToUseVariablesDialog show={showHowToDialog} onCancel={() => setShowHowToDialog(false)}></HowToUseVariablesDialog>
            <ConfirmDialog />
        </>
    )
}

export default Variables
