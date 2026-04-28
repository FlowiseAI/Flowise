import { useState } from 'react'
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
import FileCategoryIcon from '@mui/icons-material/Category'
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt'
import ThumbsUpDownOutlinedIcon from '@mui/icons-material/ThumbsUpDownOutlined'
import VpnLockOutlinedIcon from '@mui/icons-material/VpnLockOutlined'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import ExportTemplateOutlinedIcon from '@mui/icons-material/BookmarksOutlined'
import Button from '@mui/material/Button'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { IconX } from '@tabler/icons-react'

import chatflowsApi from '@/api/chatflows'

import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import { uiBaseURL } from '@/store/constant'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

import SaveChatflowDialog from '@/ui-component/dialog/SaveChatflowDialog'
import TagDialog from '@/ui-component/dialog/TagDialog'
import StarterPromptsDialog from '@/ui-component/dialog/StarterPromptsDialog'
import ChatFeedbackDialog from '@/ui-component/dialog/ChatFeedbackDialog'
import AllowedDomainsDialog from '@/ui-component/dialog/AllowedDomainsDialog'
import SpeechToTextDialog from '@/ui-component/dialog/SpeechToTextDialog'
import ExportAsTemplateDialog from '@/ui-component/dialog/ExportAsTemplateDialog'

import { generateExportFlowData } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

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

export default function AgentListMenu({ agent, setError, onRefresh }) {
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)
    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
    const [exportTemplateDialogOpen, setExportTemplateDialogOpen] = useState(false)
    const [exportTemplateDialogProps, setExportTemplateDialogProps] = useState({})
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
    const [categoryDialogProps, setCategoryDialogProps] = useState({})
    const [conversationStartersDialogOpen, setConversationStartersDialogOpen] = useState(false)
    const [conversationStartersDialogProps, setConversationStartersDialogProps] = useState({})
    const [chatFeedbackDialogOpen, setChatFeedbackDialogOpen] = useState(false)
    const [chatFeedbackDialogProps, setChatFeedbackDialogProps] = useState({})
    const [allowedDomainsDialogOpen, setAllowedDomainsDialogOpen] = useState(false)
    const [allowedDomainsDialogProps, setAllowedDomainsDialogProps] = useState({})
    const [speechToTextDialogOpen, setSpeechToTextDialogOpen] = useState(false)
    const [speechToTextDialogProps, setSpeechToTextDialogProps] = useState({})

    const handleClick = (event) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const refreshAgents = () => {
        if (onRefresh) onRefresh()
    }

    const handleRename = () => {
        setAnchorEl(null)
        setFlowDialogOpen(true)
    }

    const saveRename = async (newName) => {
        try {
            await updateChatflowApi.request(agent.id, { name: newName })
            refreshAgents()
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

    const getFlowData = () => {
        return agent.flowData || null
    }

    const handleDuplicate = async () => {
        setAnchorEl(null)
        try {
            const flowData = getFlowData()
            if (!flowData) return
            const saveObj = {
                name: `${agent.name} (Copy)`,
                flowData: flowData,
                type: 'AGENT'
            }
            const createResp = await chatflowsApi.createNewChatflow(saveObj)
            if (createResp.data) {
                window.open(`${uiBaseURL}/agents/${createResp.data.id}`, '_blank')
            }
        } catch (e) {
            console.error(e)
            enqueueSnackbar({
                message: `Failed to duplicate agent: ${e.message || 'Unknown error'}`,
                options: { key: new Date().getTime() + Math.random(), variant: 'error' }
            })
        }
    }

    const handleExport = () => {
        setAnchorEl(null)
        try {
            const flowDataStr = getFlowData()
            if (!flowDataStr) return
            const flowData = JSON.parse(flowDataStr)
            const dataStr = JSON.stringify(generateExportFlowData(flowData, 'AGENT'), null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const dataUri = URL.createObjectURL(blob)
            const exportFileDefaultName = `${agent.name || 'Agent'} Agent.json`
            const linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
        } catch (e) {
            console.error(e)
        }
    }

    const handleExportTemplate = () => {
        setAnchorEl(null)
        setExportTemplateDialogProps({ chatflow: agent })
        setExportTemplateDialogOpen(true)
    }

    const handleStarterPrompts = () => {
        setAnchorEl(null)
        setConversationStartersDialogProps({
            title: 'Starter Prompts - ' + agent.name,
            chatflow: agent
        })
        setConversationStartersDialogOpen(true)
    }

    const handleChatFeedback = () => {
        setAnchorEl(null)
        setChatFeedbackDialogProps({
            title: 'Chat Feedback - ' + agent.name,
            chatflow: agent
        })
        setChatFeedbackDialogOpen(true)
    }

    const handleAllowedDomains = () => {
        setAnchorEl(null)
        setAllowedDomainsDialogProps({
            title: 'Allowed Domains - ' + agent.name,
            chatflow: agent
        })
        setAllowedDomainsDialogOpen(true)
    }

    const handleSpeechToText = () => {
        setAnchorEl(null)
        setSpeechToTextDialogProps({
            title: 'Speech To Text - ' + agent.name,
            chatflow: agent
        })
        setSpeechToTextDialogOpen(true)
    }

    const handleCategory = () => {
        setAnchorEl(null)
        if (agent.category) {
            setCategoryDialogProps({
                category: agent.category.split(';')
            })
        }
        setCategoryDialogOpen(true)
    }

    const saveCategory = async (categories) => {
        setCategoryDialogOpen(false)
        const categoryTags = categories.join(';')
        try {
            await updateChatflowApi.request(agent.id, { category: categoryTags })
            await refreshAgents()
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

    const handleDelete = async () => {
        setAnchorEl(null)
        const confirmPayload = {
            title: `Delete`,
            description: `Delete Agent ${agent.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(agent.id)
                refreshAgents()
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

    return (
        <div>
            <Button
                aria-controls={open ? 'agent-list-menu' : undefined}
                aria-haspopup='true'
                aria-expanded={open ? 'true' : undefined}
                disableElevation
                onClick={handleClick}
                endIcon={<KeyboardArrowDownIcon />}
            >
                Options
            </Button>
            <StyledMenu
                id='agent-list-menu'
                MenuListProps={{
                    'aria-labelledby': 'agent-list-menu-button'
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleRename} disableRipple>
                    <EditIcon />
                    Rename
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:create'} onClick={handleDuplicate} disableRipple>
                    <FileCopyIcon />
                    Duplicate
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleExport} disableRipple>
                    <FileDownloadIcon />
                    Export
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'templates:flowexport'} onClick={handleExportTemplate} disableRipple>
                    <ExportTemplateOutlinedIcon />
                    Save As Template
                </PermissionMenuItem>
                <Divider sx={{ my: 0.5 }} />
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleStarterPrompts} disableRipple>
                    <PictureInPictureAltIcon />
                    Starter Prompts
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleChatFeedback} disableRipple>
                    <ThumbsUpDownOutlinedIcon />
                    Chat Feedback
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleAllowedDomains} disableRipple>
                    <VpnLockOutlinedIcon />
                    Allowed Domains
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleSpeechToText} disableRipple>
                    <MicNoneOutlinedIcon />
                    Speech To Text
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'agents:update'} onClick={handleCategory} disableRipple>
                    <FileCategoryIcon />
                    Update Category
                </PermissionMenuItem>
                <Divider sx={{ my: 0.5 }} />
                <PermissionMenuItem permissionId={'agents:delete'} onClick={handleDelete} disableRipple>
                    <FileDeleteIcon />
                    Delete
                </PermissionMenuItem>
            </StyledMenu>
            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: 'Rename Agent',
                    confirmButtonName: 'Rename',
                    cancelButtonName: 'Cancel'
                }}
                onCancel={() => setFlowDialogOpen(false)}
                onConfirm={saveRename}
            />
            <TagDialog
                isOpen={categoryDialogOpen}
                dialogProps={categoryDialogProps}
                onClose={() => setCategoryDialogOpen(false)}
                onSubmit={saveCategory}
            />
            <StarterPromptsDialog
                show={conversationStartersDialogOpen}
                dialogProps={conversationStartersDialogProps}
                onCancel={() => setConversationStartersDialogOpen(false)}
                onConfirm={refreshAgents}
            />
            <ChatFeedbackDialog
                show={chatFeedbackDialogOpen}
                dialogProps={chatFeedbackDialogProps}
                onCancel={() => setChatFeedbackDialogOpen(false)}
                onConfirm={refreshAgents}
            />
            <AllowedDomainsDialog
                show={allowedDomainsDialogOpen}
                dialogProps={allowedDomainsDialogProps}
                onCancel={() => setAllowedDomainsDialogOpen(false)}
                onConfirm={refreshAgents}
            />
            <SpeechToTextDialog
                show={speechToTextDialogOpen}
                dialogProps={speechToTextDialogProps}
                onCancel={() => setSpeechToTextDialogOpen(false)}
                onConfirm={refreshAgents}
            />
            {exportTemplateDialogOpen && (
                <ExportAsTemplateDialog
                    show={exportTemplateDialogOpen}
                    dialogProps={exportTemplateDialogProps}
                    onCancel={() => setExportTemplateDialogOpen(false)}
                />
            )}
        </div>
    )
}

AgentListMenu.propTypes = {
    agent: PropTypes.object,
    setError: PropTypes.func,
    onRefresh: PropTypes.func
}
