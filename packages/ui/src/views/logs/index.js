// import { useEffect, useState } from 'react'
// import { useDispatch, useSelector } from 'react-redux'
import { useSelector } from 'react-redux'
// import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

// utils
import useNotifier from 'utils/useNotifier'

// material-ui
import {
    // Button,
    Stack
    // Table,
    // TableBody,
    // TableCell,
    // TableContainer,
    // TableHead,
    // TableRow,
    // Paper,
    // IconButton,
    // Popover,
    // Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from 'ui-component/cards/MainCard'
// import { StyledButton } from 'ui-component/button/StyledButton'
// import LogsDialog from './LogsDialog'
// import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'

// Icons
// import { IconPlus } from '@tabler/icons'
// import APIEmptySVG from 'assets/images/api_empty.svg'

const Logs = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    // const dispatch = useDispatch()
    useNotifier()

    // const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    // const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Logs</h1>
                </Stack>
            </MainCard>
        </>
    )
}

export default Logs
