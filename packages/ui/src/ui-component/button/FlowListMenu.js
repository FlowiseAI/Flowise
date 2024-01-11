import { useState } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

import { styled, alpha } from '@mui/material/styles'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import EditIcon from '@mui/icons-material/Edit'
import Divider from '@mui/material/Divider'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import FileDownloadIcon from '@mui/icons-material/Downloading'
import FileDeleteIcon from '@mui/icons-material/Delete'
import FileCategoryIcon from '@mui/icons-material/Category'
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt'
import Button from '@mui/material/Button'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { IconX } from '@tabler/icons'

import chatflowsApi from 'api/chatflows'

import useApi from '../../hooks/useApi'
import useConfirm from 'hooks/useConfirm'
import { uiBaseURL } from '../../store/constant'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '../../store/actions'

import SaveChatflowDialog from '../dialog/SaveChatflowDialog'
import TagDialog from '../dialog/TagDialog'

import { generateExportFlowData } from '../../utils/genericHelper'
import useNotifier from '../../utils/useNotifier'
import StarterPromptsDialog from '../dialog/StarterPromptsDialog'

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 180,
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0'
        },
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

export default function FlowListMenu({ chatflow, updateFlowsApi }) {
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
    const [categoryDialogProps, setCategoryDialogProps] = useState({})
    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)
    const [conversationStartersDialogOpen, setConversationStartersDialogOpen] = useState(false)
    const [conversationStartersDialogProps, setConversationStartersDialogProps] = useState({})

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleFlowRename = () => {
        setAnchorEl(null)
        setFlowDialogOpen(true)
    }

    const handleFlowStarterPrompts = () => {
        setAnchorEl(null)
        setConversationStartersDialogProps({
            title: 'Starter Prompts - ' + chatflow.name,
            chatflow: chatflow
        })
        setConversationStartersDialogOpen(true)
    }

    const saveFlowStarterPrompts = async () => {
        setConversationStartersDialogOpen(false)
        await updateFlowsApi.request()
    }

    const saveFlowRename = async (chatflowName) => {
        const updateBody = {
            name: chatflowName,
            chatflow
        }
        try {
            await updateChatflowApi.request(chatflow.id, updateBody)
            await updateFlowsApi.request()
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: errorData,
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

    const handleFlowCategory = () => {
        setAnchorEl(null)
        if (chatflow.category) {
            setCategoryDialogProps({
                category: chatflow.category.split(';')
            })
        }
        setCategoryDialogOpen(true)
    }

    const saveFlowCategory = async (categories) => {
        setCategoryDialogOpen(false)
        // save categories as string
        const categoryTags = categories.join(';')
        const updateBody = {
            category: categoryTags,
            chatflow
        }
        try {
            await updateChatflowApi.request(chatflow.id, updateBody)
            await updateFlowsApi.request()
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: errorData,
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

    const handleDelete = async () => {
        setAnchorEl(null)
        const confirmPayload = {
            title: `Delete`,
            description: `Delete chatflow ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
                await updateFlowsApi.request()
            } catch (error) {
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: errorData,
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
        try {
            localStorage.setItem('duplicatedFlowData', chatflow.flowData)
            window.open(`${uiBaseURL}/canvas`, '_blank')
        } catch (e) {
            console.error(e)
        }
    }

    const handleExport = () => {
        setAnchorEl(null)
        try {
            const flowData = JSON.parse(chatflow.flowData)
            let dataStr = JSON.stringify(generateExportFlowData(flowData), null, 2)
            let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

            let exportFileDefaultName = `${chatflow.name} Chatflow.json`

            let linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div>
            <Button
                id='demo-customized-button'
                aria-controls={open ? 'demo-customized-menu' : undefined}
                aria-haspopup='true'
                aria-expanded={open ? 'true' : undefined}
                disableElevation
                onClick={handleClick}
                endIcon={<KeyboardArrowDownIcon />}
            >
                Options
            </Button>
            <StyledMenu
                id='demo-customized-menu'
                MenuListProps={{
                    'aria-labelledby': 'demo-customized-button'
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                <MenuItem onClick={handleFlowRename} disableRipple>
                    <EditIcon />
                    Rename
                </MenuItem>
                <MenuItem onClick={handleDuplicate} disableRipple>
                    <FileCopyIcon />
                    Duplicate
                </MenuItem>
                <MenuItem onClick={handleExport} disableRipple>
                    <FileDownloadIcon />
                    Export
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleFlowStarterPrompts} disableRipple>
                    <PictureInPictureAltIcon />
                    Starter Prompts
                </MenuItem>
                <MenuItem onClick={handleFlowCategory} disableRipple>
                    <FileCategoryIcon />
                    Update Category
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleDelete} disableRipple>
                    <FileDeleteIcon />
                    Delete
                </MenuItem>
            </StyledMenu>
            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: `Rename Chatflow`,
                    confirmButtonName: 'Rename',
                    cancelButtonName: 'Cancel'
                }}
                onCancel={() => setFlowDialogOpen(false)}
                onConfirm={saveFlowRename}
            />
            <TagDialog
                isOpen={categoryDialogOpen}
                dialogProps={categoryDialogProps}
                onClose={() => setCategoryDialogOpen(false)}
                onSubmit={saveFlowCategory}
            />
            <StarterPromptsDialog
                show={conversationStartersDialogOpen}
                dialogProps={conversationStartersDialogProps}
                onConfirm={saveFlowStarterPrompts}
                onCancel={() => setConversationStartersDialogOpen(false)}
            />
        </div>
    )
}

FlowListMenu.propTypes = {
    chatflow: PropTypes.object,
    updateFlowsApi: PropTypes.object
}
