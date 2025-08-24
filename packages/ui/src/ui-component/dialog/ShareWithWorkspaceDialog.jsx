import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { cloneDeep } from 'lodash'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Stack, OutlinedInput, Typography } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { Grid } from '@/ui-component/grid/Grid'

// Icons
import { IconX, IconShare } from '@tabler/icons-react'

// API
import workspaceApi from '@/api/workspace'
import userApi from '@/api/user'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

const ShareWithWorkspaceDialog = ({ show, dialogProps, onCancel, setError }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const getSharedWorkspacesForItemApi = useApi(workspaceApi.getSharedWorkspacesForItem)
    const getWorkspacesByOrganizationIdUserIdApi = useApi(userApi.getWorkspacesByOrganizationIdUserId)
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const user = useSelector((state) => state.auth.user)

    const [outputSchema, setOutputSchema] = useState([])

    const [name, setName] = useState('')

    const onRowUpdate = (newRow) => {
        setTimeout(() => {
            setOutputSchema((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                const indexToUpdate = allRows.findIndex((row) => row.id === newRow.id)
                if (indexToUpdate >= 0) {
                    allRows[indexToUpdate] = { ...newRow }
                }
                return allRows
            })
        })
    }

    const columns = useMemo(
        () => [
            { field: 'workspaceName', headerName: 'Workspace', editable: false, flex: 1 },
            { field: 'shared', headerName: 'Share', type: 'boolean', editable: true, width: 180 }
        ],
        []
    )

    useEffect(() => {
        if (getSharedWorkspacesForItemApi.data) {
            const data = getSharedWorkspacesForItemApi.data
            if (data && data.length > 0) {
                outputSchema.map((row) => {
                    data.map((ws) => {
                        if (row.id === ws.workspaceId) {
                            row.shared = true
                        }
                    })
                })
                setOutputSchema([...outputSchema])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSharedWorkspacesForItemApi.data])

    useEffect(() => {
        if (getSharedWorkspacesForItemApi.error && setError) {
            setError(getSharedWorkspacesForItemApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSharedWorkspacesForItemApi.error])

    useEffect(() => {
        if (getWorkspacesByOrganizationIdUserIdApi.data) {
            const workspaces = []
            getWorkspacesByOrganizationIdUserIdApi.data
                .filter((ws) => ws.workspace.id !== user.activeWorkspaceId)
                .map((ws) => {
                    workspaces.push({
                        id: ws.workspace.id,
                        workspaceName: ws.workspace.name,
                        shared: false
                    })
                })
            setOutputSchema([...workspaces])
        }
    }, [getWorkspacesByOrganizationIdUserIdApi.data, user.activeWorkspaceId])

    useEffect(() => {
        if (getWorkspacesByOrganizationIdUserIdApi.error && setError) {
            setError(getWorkspacesByOrganizationIdUserIdApi.error)
        }
    }, [getWorkspacesByOrganizationIdUserIdApi.error, setError])

    useEffect(() => {
        if (user) {
            getWorkspacesByOrganizationIdUserIdApi.request(user.activeOrganizationId, user.id)
        }
        setName(dialogProps.data.name)
        getSharedWorkspacesForItemApi.request(dialogProps.data.id)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps, user])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const shareItemRequest = async () => {
        try {
            const obj = {
                itemType: dialogProps.data.itemType,
                workspaceIds: []
            }
            outputSchema.map((row) => {
                if (row.shared) {
                    obj.workspaceIds.push(row.id)
                }
            })
            const sharedResp = await workspaceApi.setSharedWorkspacesForItem(dialogProps.data.id, obj)
            if (sharedResp.data) {
                enqueueSnackbar({
                    message: 'Items Shared Successfully',
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
                onCancel()
            }
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to share Item: ${
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
            onCancel()
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconShare style={{ marginRight: '10px' }} />
                    {dialogProps.data.title}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Name</Typography>
                    </Stack>
                    <OutlinedInput id='name' type='string' disabled={true} fullWidth placeholder={name} value={name} name='name' />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Grid columns={columns} rows={outputSchema} onRowUpdate={onRowUpdate} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onCancel()}>{dialogProps.cancelButtonName}</Button>
                <StyledButton onClick={shareItemRequest} variant='contained'>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ShareWithWorkspaceDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default ShareWithWorkspaceDialog
