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

import { generateExportFlowData } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import ChatFeedbackDialog from '../dialog/ChatFeedbackDialog'
import AllowedDomainsDialog from '../dialog/AllowedDomainsDialog'
import SpeechToTextDialog from '../dialog/SpeechToTextDialog'
import ExportAsTemplateDialog from '@/ui-component/dialog/ExportAsTemplateDialog'

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

export default function FlowListMenu({ chatflow, isAgentCanvas, isAgentflowV2, setError, updateFlowsApi, currentPage, pageLimit }) {
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
    const [chatFeedbackDialogOpen, setChatFeedbackDialogOpen] = useState(false)
    const [chatFeedbackDialogProps, setChatFeedbackDialogProps] = useState({})
    const [allowedDomainsDialogOpen, setAllowedDomainsDialogOpen] = useState(false)
    const [allowedDomainsDialogProps, setAllowedDomainsDialogProps] = useState({})
    const [speechToTextDialogOpen, setSpeechToTextDialogOpen] = useState(false)
    const [speechToTextDialogProps, setSpeechToTextDialogProps] = useState({})

    const [exportTemplateDialogOpen, setExportTemplateDialogOpen] = useState(false)
    const [exportTemplateDialogProps, setExportTemplateDialogProps] = useState({})

    const title = isAgentCanvas ? 'Agents' : 'Chatflow'

    const refreshFlows = async () => {
        try {
            const params = {
                page: currentPage,
                limit: pageLimit
            }
            if (isAgentCanvas && isAgentflowV2) {
                await updateFlowsApi.request('AGENTFLOW', params)
            } else if (isAgentCanvas) {
                await updateFlowsApi.request('MULTIAGENT', params)
            } else {
                await updateFlowsApi.request(params)
            }
        } catch (error) {
            if (setError) setError(error)
        }
    }

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

    const handleExportTemplate = () => {
        setAnchorEl(null)
        setExportTemplateDialogProps({
            chatflow: chatflow
        })
        setExportTemplateDialogOpen(true)
    }

    const handleFlowChatFeedback = () => {
        setAnchorEl(null)
        setChatFeedbackDialogProps({
            title: 'Chat Feedback - ' + chatflow.name,
            chatflow: chatflow
        })
        setChatFeedbackDialogOpen(true)
    }

    const handleAllowedDomains = () => {
        setAnchorEl(null)
        setAllowedDomainsDialogProps({
            title: 'Allowed Domains - ' + chatflow.name,
            chatflow: chatflow
        })
        setAllowedDomainsDialogOpen(true)
    }

    const handleSpeechToText = () => {
        setAnchorEl(null)
        setSpeechToTextDialogProps({
            title: 'Speech To Text - ' + chatflow.name,
            chatflow: chatflow
        })
        setSpeechToTextDialogOpen(true)
    }

    const saveFlowRename = async (chatflowName) => {
        const updateBody = {
            name: chatflowName,
            chatflow
        }
        try {
            await updateChatflowApi.request(chatflow.id, updateBody)
            const params = {
                page: currentPage,
                limit: pageLimit
            }
            if (isAgentCanvas && isAgentflowV2) {
                await updateFlowsApi.request('AGENTFLOW', params)
            } else if (isAgentCanvas) {
                await updateFlowsApi.request('MULTIAGENT', params)
            } else {
                await updateFlowsApi.request(params)
            }
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
            const params = {
                page: currentPage,
                limit: pageLimit
            }
            if (isAgentCanvas) {
                await updateFlowsApi.request('AGENTFLOW', params)
            } else {
                await updateFlowsApi.request(params)
            }
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
            description: `Delete ${title} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
                const params = {
                    page: currentPage,
                    limit: pageLimit
                }
                if (isAgentCanvas && isAgentflowV2) {
                    await updateFlowsApi.request('AGENTFLOW', params)
                } else if (isAgentCanvas) {
                    await updateFlowsApi.request('MULTIAGENT', params)
                } else {
                    await updateFlowsApi.request(params)
                }
            } catch (error) {
                if (setError) setError(error)
                enqueueSnackbar({
                    message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
            if (isAgentflowV2) {
                window.open(`${uiBaseURL}/v2/agentcanvas`, '_blank')
            } else if (isAgentCanvas) {
                window.open(`${uiBaseURL}/agentcanvas`, '_blank')
            } else {
                window.open(`${uiBaseURL}/canvas`, '_blank')
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleExport = () => {
        setAnchorEl(null)
        try {
            const flowData = JSON.parse(chatflow.flowData)
            let dataStr = JSON.stringify(generateExportFlowData(flowData), null, 2)
            //let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const dataUri = URL.createObjectURL(blob)

            let exportFileDefaultName = `${chatflow.name} ${title}.json`

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
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:update' : 'chatflows:update'}
                    onClick={handleFlowRename}
                    disableRipple
                >
                    <EditIcon />
                    Rename
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:duplicate' : 'chatflows:duplicate'}
                    onClick={handleDuplicate}
                    disableRipple
                >
                    <FileCopyIcon />
                    Duplicate
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:export' : 'chatflows:export'}
                    onClick={handleExport}
                    disableRipple
                >
                    <FileDownloadIcon />
                    Export
                </PermissionMenuItem>
                <PermissionMenuItem permissionId={'templates:flowexport'} onClick={handleExportTemplate} disableRipple>
                    <ExportTemplateOutlinedIcon />
                    Save As Template
                </PermissionMenuItem>
                <Divider sx={{ my: 0.5 }} />
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:config' : 'chatflows:config'}
                    onClick={handleFlowStarterPrompts}
                    disableRipple
                >
                    <PictureInPictureAltIcon />
                    Starter Prompts
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:config' : 'chatflows:config'}
                    onClick={handleFlowChatFeedback}
                    disableRipple
                >
                    <ThumbsUpDownOutlinedIcon />
                    Chat Feedback
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:domains' : 'chatflows:domains'}
                    onClick={handleAllowedDomains}
                    disableRipple
                >
                    <VpnLockOutlinedIcon />
                    Allowed Domains
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:config' : 'chatflows:config'}
                    onClick={handleSpeechToText}
                    disableRipple
                >
                    <MicNoneOutlinedIcon />
                    Speech To Text
                </PermissionMenuItem>
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:update' : 'chatflows:update'}
                    onClick={handleFlowCategory}
                    disableRipple
                >
                    <FileCategoryIcon />
                    Update Category
                </PermissionMenuItem>
                <Divider sx={{ my: 0.5 }} />
                <PermissionMenuItem
                    permissionId={isAgentCanvas ? 'agentflows:delete' : 'chatflows:delete'}
                    onClick={handleDelete}
                    disableRipple
                >
                    <FileDeleteIcon />
                    Delete
                </PermissionMenuItem>
            </StyledMenu>
            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: `Rename ${title}`,
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
                onCancel={() => setConversationStartersDialogOpen(false)}
                onConfirm={refreshFlows}
            />
            <ChatFeedbackDialog
                show={chatFeedbackDialogOpen}
                dialogProps={chatFeedbackDialogProps}
                onCancel={() => setChatFeedbackDialogOpen(false)}
                onConfirm={refreshFlows}
            />
            <AllowedDomainsDialog
                show={allowedDomainsDialogOpen}
                dialogProps={allowedDomainsDialogProps}
                onCancel={() => setAllowedDomainsDialogOpen(false)}
                onConfirm={refreshFlows}
            />
            <SpeechToTextDialog
                show={speechToTextDialogOpen}
                dialogProps={speechToTextDialogProps}
                onCancel={() => setSpeechToTextDialogOpen(false)}
                onConfirm={refreshFlows}
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

FlowListMenu.propTypes = {
    chatflow: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    isAgentflowV2: PropTypes.bool,
    setError: PropTypes.func,
    updateFlowsApi: PropTypes.object,
    currentPage: PropTypes.number,
    pageLimit: PropTypes.number
}
