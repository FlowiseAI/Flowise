import { useState } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

import Button from '@mui/material/Button'
import { IconX } from '@tabler/icons-react'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

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
import {
    IconDotsVertical,
    IconPencil,
    IconCopy,
    IconBookmarks,
    IconPictureInPicture,
    IconFileExport,
    IconWorldStar,
    IconMicrophone,
    IconCategory,
    IconTrash
} from '@tabler/icons-react'
import { IconThumbUp } from '@tabler/icons-react'
import { IconThumbDown } from '@tabler/icons-react'

export default function FlowListMenu({ chatflow, isAgentCanvas, setError, updateFlowsApi }) {
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
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

    const [exportTemplateDialogOpen, setExportTemplateDialogOpen] = useState(false)
    const [exportTemplateDialogProps, setExportTemplateDialogProps] = useState({})

    const title = isAgentCanvas ? 'Agents' : 'Chatflow'

    const handleFlowRename = () => {
        setFlowDialogOpen(true)
    }

    const handleFlowStarterPrompts = () => {
        setConversationStartersDialogProps({
            title: 'Starter Prompts - ' + chatflow.name,
            chatflow: chatflow
        })
        setConversationStartersDialogOpen(true)
    }

    const handleExportTemplate = () => {
        setExportTemplateDialogProps({
            chatflow: chatflow
        })
        setExportTemplateDialogOpen(true)
    }

    const handleFlowChatFeedback = () => {
        setChatFeedbackDialogProps({
            title: 'Chat Feedback - ' + chatflow.name,
            chatflow: chatflow
        })
        setChatFeedbackDialogOpen(true)
    }

    const handleAllowedDomains = () => {
        setAllowedDomainsDialogProps({
            title: 'Allowed Domains - ' + chatflow.name,
            chatflow: chatflow
        })
        setAllowedDomainsDialogOpen(true)
    }

    const handleSpeechToText = () => {
        setSpeechToTextDialogProps({
            title: 'Speech To Text - ' + chatflow.name,
            chatflow: chatflow
        })
        setSpeechToTextDialogOpen(true)
    }

    const saveFlowRename = async (chatflowName) => {
        setFlowDialogOpen(false)
        const updateBody = {
            name: chatflowName,
            chatflow
        }
        try {
            await updateChatflowApi.request(chatflow.id, updateBody)
            await updateFlowsApi.request()
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
        const confirmPayload = {
            title: `Are you sure?`,
            description: `This action cannot be undone. This will permanently delete the ${title.toLowerCase()} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
                await updateFlowsApi.request()
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
        try {
            localStorage.setItem('duplicatedFlowData', chatflow.flowData)
            window.open(`${uiBaseURL}/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, '_blank')
        } catch (e) {
            console.error(e)
        }
    }

    const handleExport = () => {
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
        <>
            <DropdownMenu>
                <DropdownMenuTrigger size='icon' variant='ghost'>
                    <IconDotsVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-64'>
                    <DropdownMenuItem onClick={handleFlowRename} disableRipple>
                        <IconPencil size={20} stroke={1.5} />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate} disableRipple>
                        <IconCopy size={20} stroke={1.5} />
                        Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExport} disableRipple>
                        <IconFileExport size={20} stroke={1.5} />
                        Export
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportTemplate} disableRipple>
                        <IconBookmarks size={20} stroke={1.5} />
                        Save As Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleFlowStarterPrompts} disableRipple>
                        <IconPictureInPicture size={20} stroke={1.5} />
                        Starter Prompts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleFlowChatFeedback} disableRipple>
                        <span className='relative w-5 h-5'>
                            <IconThumbUp className='absolute top-0 left-0' size={12} stroke={2} />
                            <IconThumbDown className='absolute bottom-0 right-0' size={12} stroke={2} />
                        </span>
                        Chat Feedback
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAllowedDomains} disableRipple>
                        <IconWorldStar size={20} stroke={1.5} />
                        Allowed Domains
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSpeechToText} disableRipple>
                        <IconMicrophone size={20} stroke={1.5} />
                        Speech To Text
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleFlowCategory} disableRipple>
                        <IconCategory size={20} stroke={1.5} />
                        Update Category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className='text-red-500 hover:text-red-500' onClick={handleDelete} disableRipple>
                        <IconTrash size={20} stroke={1.5} />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
            />
            <ChatFeedbackDialog
                show={chatFeedbackDialogOpen}
                dialogProps={chatFeedbackDialogProps}
                onCancel={() => setChatFeedbackDialogOpen(false)}
            />
            <AllowedDomainsDialog
                show={allowedDomainsDialogOpen}
                dialogProps={allowedDomainsDialogProps}
                onCancel={() => setAllowedDomainsDialogOpen(false)}
            />
            <SpeechToTextDialog
                show={speechToTextDialogOpen}
                dialogProps={speechToTextDialogProps}
                onCancel={() => setSpeechToTextDialogOpen(false)}
            />
            {exportTemplateDialogOpen && (
                <ExportAsTemplateDialog
                    show={exportTemplateDialogOpen}
                    dialogProps={exportTemplateDialogProps}
                    onCancel={() => setExportTemplateDialogOpen(false)}
                />
            )}
        </>
    )
}

FlowListMenu.propTypes = {
    chatflow: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    setError: PropTypes.func,
    updateFlowsApi: PropTypes.object
}
