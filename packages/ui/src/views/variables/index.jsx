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
    useTheme
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

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

// const
import AddEditVariableDialog from './AddEditVariableDialog'
import HowToUseVariablesDialog from './HowToUseVariablesDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

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

// ==============================|| Credentials ||============================== //

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
        }
    }, [getAllVariables.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Variables' title='Variables'>
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
                                                {variables.filter(filterVariables).map((variable, index) => (
                                                    <StyledTableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                                                            {moment(variable.updatedDate).format('MMMM Do, YYYY HH:mm:ss')}
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            {moment(variable.createdDate).format('MMMM Do, YYYY HH:mm:ss')}
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <IconButton title='Edit' color='primary' onClick={() => edit(variable)}>
                                                                <IconEdit />
                                                            </IconButton>
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <IconButton
                                                                title='Delete'
                                                                color='error'
                                                                onClick={() => deleteVariable(variable)}
                                                            >
                                                                <IconTrash />
                                                            </IconButton>
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
