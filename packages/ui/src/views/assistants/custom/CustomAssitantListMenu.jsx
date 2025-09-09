import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import FileDownloadIcon from '@mui/icons-material/Downloading'
import FileDeleteIcon from '@mui/icons-material/Delete'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { IconX } from '@tabler/icons-react'
import { styled } from '@mui/material/styles'
import Menu from '@mui/material/Menu'
import { PermissionMenuItem } from '@/ui-component/button/RBACButtons'
import AddCustomAssistantDialog from './AddCustomAssistantDialog'
import useNotifier from '@/utils/useNotifier'
import assistantsApi from '@/api/assistants'

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 180,
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': { padding: '4px 0' }
    }
}))

export default function CustomAssitantListMenu({ assistant, setError, updateAssistantsApi }) {
    const dispatch = useDispatch()
    useNotifier()
    const enqueueSnackbar = (...args) => dispatch({ type: 'ENQUEUE_SNACKBAR', ...args })
    const closeSnackbar = (...args) => dispatch({ type: 'CLOSE_SNACKBAR', ...args })

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)

    const [addAssistantDialogOpen, setAddAssistantDialogOpen] = useState(false)
    const [addAssistantDialogProps, setAddAssistantDialogProps] = useState({})

    const [renameName, setRenameName] = useState('')
    const [renameTags, setRenameTags] = useState('')
    const [renameDescription, setRenameDescription] = useState('')

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false) // NEW: delete confirmation

    useEffect(() => {
        if (assistant?.details) {
            try {
                const details = JSON.parse(assistant.details)
                setRenameName(details.name || '')
                setRenameTags(details.category || '')
                setRenameDescription(details.description || '')
            } catch {}
        }
    }, [assistant])

    const handleClick = (event) => setAnchorEl(event.currentTarget)
    const handleClose = () => setAnchorEl(null)

    const handleAssistantRename = () => {
        setAnchorEl(null)
        setAddAssistantDialogProps({
            title: 'Rename Assistant',
            confirmButtonName: 'Rename',
            id: assistant.id,
            name: renameName,
            tags: renameTags,
            description: renameDescription,
            credential: assistant.credential
        })
        setAddAssistantDialogOpen(true)
    }

    const handleDelete = () => {
        setAnchorEl(null)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        setDeleteDialogOpen(false)
        try {
            await assistantsApi.deleteAssistant(assistant.id, false)
            if (updateAssistantsApi && typeof updateAssistantsApi.request === 'function') {
                await updateAssistantsApi.request('CUSTOM')
            }
            enqueueSnackbar({
                message: 'Assistant deleted successfully.',
                options: { key: new Date().getTime(), variant: 'success' }
            })
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message:
                    typeof error.response?.data === 'object'
                        ? error.response.data.message
                        : error.response?.data || 'Delete failed',
                options: {
                    key: new Date().getTime(),
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

    const handleDuplicate = () => {
        setAnchorEl(null)
        enqueueSnackbar({
            message: 'Duplicate Assistant - Coming soon!',
            options: { key: new Date().getTime(), variant: 'info' }
        })
    }

    const handleExport = () => {
        setAnchorEl(null)
        try {
            const details = JSON.parse(assistant.details)
            const dataStr = JSON.stringify(details, null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `${details.name || 'assistant'}.json`
            link.click()
        } catch {
            enqueueSnackbar({
                message: 'Export failed',
                options: { key: new Date().getTime(), variant: 'error' }
            })
        }
    }

    return (
        <>
            <Button
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleClick}
                variant='outlined'
                size='small'
            >
                Options
            </Button>

            <StyledMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <PermissionMenuItem onClick={handleAssistantRename} icon={<EditIcon />}>
                    Rename
                </PermissionMenuItem>
                <Divider />
                <PermissionMenuItem onClick={handleDelete} icon={<FileDeleteIcon />}>
                    Delete
                </PermissionMenuItem>
            </StyledMenu>

            <AddCustomAssistantDialog
                show={addAssistantDialogOpen}
                dialogProps={addAssistantDialogProps}
                onCancel={() => setAddAssistantDialogOpen(false)}
                onConfirm={async () => {
                    setAddAssistantDialogOpen(false)
                    if (updateAssistantsApi && typeof updateAssistantsApi.request === 'function') {
                        await updateAssistantsApi.request('CUSTOM')
                    }
                    enqueueSnackbar({
                        message: 'Assistant renamed successfully.',
                        options: { key: new Date().getTime(), variant: 'success' }
                    })
                }}
                updateAssistantsApi={updateAssistantsApi}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Assistant</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete "{renameName}"?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

CustomAssitantListMenu.propTypes = {
    assistant: PropTypes.object.isRequired,
    setError: PropTypes.func,
    updateAssistantsApi: PropTypes.object
}
