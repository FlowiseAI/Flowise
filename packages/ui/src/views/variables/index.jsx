import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import moment from 'moment'

// material-ui
import {
    Button,
    Box,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Toolbar,
    TextField,
    InputAdornment,
    ButtonGroup,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

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
import { IconTrash, IconEdit, IconX, IconPlus, IconSearch, IconVariable } from '@tabler/icons'
import VariablesEmptySVG from '@/assets/images/variables_empty.svg'

// const
import AddEditVariableDialog from './AddEditVariableDialog'
import HowToUseVariablesDialog from './HowToUseVariablesDialog'

// ==============================|| Credentials ||============================== //

const Variables = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

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
                const errorData = error.response?.data || `${error.response?.status}: ${error.response?.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete Variable: ${errorData}`,
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
        if (getAllVariables.data) {
            setVariables(getAllVariables.data)
        }
    }, [getAllVariables.data])

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
                            <h1>Variables&nbsp;</h1>
                            <TextField
                                size='small'
                                sx={{ display: { xs: 'none', sm: 'block' }, ml: 3 }}
                                variant='outlined'
                                placeholder='Search variable name'
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
                            <Button variant='outlined' sx={{ mr: 2 }} onClick={() => setShowHowToDialog(true)}>
                                How To Use
                            </Button>
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
                                        id='btn_createVariable'
                                    >
                                        Add Variable
                                    </StyledButton>
                                </ButtonGroup>
                            </ButtonGroup>
                        </Toolbar>
                    </Box>
                </Stack>
                {variables.length === 0 && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                src={VariablesEmptySVG}
                                alt='VariablesEmptySVG'
                            />
                        </Box>
                        <div>No Variables Yet</div>
                    </Stack>
                )}
                {variables.length > 0 && (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Value</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Last Updated</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell> </TableCell>
                                    <TableCell> </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {variables.filter(filterVariables).map((variable, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component='th' scope='row'>
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
                                        </TableCell>
                                        <TableCell>{variable.value}</TableCell>
                                        <TableCell>
                                            <Chip
                                                color={variable.type === 'static' ? 'info' : 'secondary'}
                                                size='small'
                                                label={variable.type}
                                            />
                                        </TableCell>
                                        <TableCell>{moment(variable.updatedDate).format('DD-MMM-YY')}</TableCell>
                                        <TableCell>{moment(variable.createdDate).format('DD-MMM-YY')}</TableCell>
                                        <TableCell>
                                            <IconButton title='Edit' color='primary' onClick={() => edit(variable)}>
                                                <IconEdit />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton title='Delete' color='error' onClick={() => deleteVariable(variable)}>
                                                <IconTrash />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </MainCard>
            <AddEditVariableDialog
                show={showVariableDialog}
                dialogProps={variableDialogProps}
                onCancel={() => setShowVariableDialog(false)}
                onConfirm={onConfirm}
            ></AddEditVariableDialog>
            <HowToUseVariablesDialog show={showHowToDialog} onCancel={() => setShowHowToDialog(false)}></HowToUseVariablesDialog>
            <ConfirmDialog />
        </>
    )
}

export default Variables
