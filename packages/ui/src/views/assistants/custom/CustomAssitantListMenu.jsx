import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { styled, alpha } from '@mui/material/styles'
import Menu from '@mui/material/Menu'
import { PermissionMenuItem } from '@/ui-component/button/RBACButtons'
import EditIcon from '@mui/icons-material/Edit'
import Divider from '@mui/material/Divider'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import FileDownloadIcon from '@mui/icons-material/Downloading'
import FileDeleteIcon from '@mui/icons-material/Delete'
import Button from '@mui/material/Button'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { IconX } from '@tabler/icons-react'

import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// API
import assistantsApi from '@/api/assistants'

// Dialogs
import AddCustomAssistantDialog from './AddCustomAssistantDialog'

// ====================== Styled Menu ======================
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
        '& .MuiMenu-list': { padding: '4px 0' },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5)
            },
            '&:active': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            }
        }
    }
}))

// ====================== Component ======================
export default function CustomAssitantListMenu({ assistant, setError, updateAssistantsApi }) {
    const { confirm } = useConfirm()
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

    useEffect(() => {
        if (assistant && assistant.details) {
            try {
                const details = JSON.parse(assistant.details)
                setRenameName(details.name || '')
                setRenameTags(details.category || '')
                setRenameDescription(details.description || '')
            } catch (err) {
                console.error('Failed to parse assistant details:', err)
            }
        }
    }, [assistant])

    const handleClick = (event) => setAnchorEl(event.currentTarget)
    const handleClose = () => setAnchorEl(null)

    const handleAssistantRename = () => {
        setAnchorEl(null)
        setAddAssistantDialogProps({
            title: 'Rename Assistant',
            confirmButtonName: 'Rename',
            name: renameName,
            tags: renameTags,
            description: renameDescription,
            onConfirm: async (updatedId) => {
                if (updateAssistantsApi?.request) await updateAssistantsApi.request('CUSTOM')
                setAddAssistantDialogOpen(false)
            }
        })
        setAddAssistantDialogOpen(true)
    }

    const handleDelete = async () => {
        setAnchorEl(null)
        const isConfirmed = await confirm({
            title: `Delete`,
            description: `Delete Assistant ${renameName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })

        if (isConfirmed) {
            try {
                await assistantsApi.deleteAssistant(assistant.id, false)
                await updateAssistantsApi.request('CUSTOM')
            } catch (error) {
                if (setError) setError(error)
                enqueueSnackbar({
                    message: typeof error.response?.data === 'object' ? error.response.data.message : error.response?.data,
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

    const handleDuplicate = () => {
        setAnchorEl(null)
        enqueueSnackbar({
            message: 'Duplicate Assistant - Coming soon!',
            options: { key: new Date().getTime() + Math.random(), variant: 'info' }
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
        } catch (err) {
            enqueueSnackbar({
                message: 'Export failed',
                options: { key: new Date().getTime() + Math.random(), variant: 'error' }
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
                Actions
            </Button>
            <StyledMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <PermissionMenuItem onClick={handleAssistantRename} icon={<EditIcon />}>
                    Rename
                </PermissionMenuItem>
                <Divider />
                <PermissionMenuItem onClick={handleDuplicate} icon={<FileCopyIcon />}>
                    Duplicate
                </PermissionMenuItem>
                <PermissionMenuItem onClick={handleExport} icon={<FileDownloadIcon />}>
                    Export
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
                onConfirm={(updatedId) => {
                    addAssistantDialogProps.onConfirm?.(updatedId)
                    setAddAssistantDialogOpen(false)
                }}
            />
        </>
    )
}

CustomAssitantListMenu.propTypes = {
    assistant: PropTypes.object.isRequired,
    setError: PropTypes.func,
    updateAssistantsApi: PropTypes.object
}
