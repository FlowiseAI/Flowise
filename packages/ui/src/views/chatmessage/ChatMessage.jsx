import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { cloneDeep } from 'lodash'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

import {
    Box,
    Button,
    Card,
    CardMedia,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    OutlinedInput,
    Typography,
    CardContent,
    Stack
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconCircleDot,
    IconDownload,
    IconSend,
    IconMicrophone,
    IconPhotoPlus,
    IconTrash,
    IconX,
    IconTool,
    IconSquareFilled,
    IconDeviceSdCard,
    IconCheck,
    IconPaperclip,
    IconSparkles
} from '@tabler/icons-react'
import robotPNG from '@/assets/images/robot.png'
import userPNG from '@/assets/images/account.png'
import multiagent_supervisorPNG from '@/assets/images/multiagent_supervisor.png'
import multiagent_workerPNG from '@/assets/images/multiagent_worker.png'
import audioUploadSVG from '@/assets/images/wave-sound.jpg'
import nextAgentGIF from '@/assets/images/next-agent.gif'

// project import
import { CodeBlock } from '@/ui-component/markdown/CodeBlock'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import SourceDocDialog from '@/ui-component/dialog/SourceDocDialog'
import ChatFeedbackContentDialog from '@/ui-component/dialog/ChatFeedbackContentDialog'
import StarterPromptsCard from '@/ui-component/cards/StarterPromptsCard'
import { ImageButton, ImageSrc, ImageBackdrop, ImageMarked } from '@/ui-component/button/ImageButton'
import CopyToClipboardButton from '@/ui-component/button/CopyToClipboardButton'
import ThumbsUpButton from '@/ui-component/button/ThumbsUpButton'
import ThumbsDownButton from '@/ui-component/button/ThumbsDownButton'
import { cancelAudioRecording, startAudioRecording, stopAudioRecording } from './audio-recording'
import './audio-recording.css'
import './ChatMessage.css'

// api
import chatmessageApi from '@/api/chatmessage'
import chatflowsApi from '@/api/chatflows'
import predictionApi from '@/api/prediction'
import vectorstoreApi from '@/api/vectorstore'
import attachmentsApi from '@/api/attachments'
import chatmessagefeedbackApi from '@/api/chatmessagefeedback'
import leadsApi from '@/api/lead'

// Hooks
import useApi from '@/hooks/useApi'

// Const
import { baseURL, maxScroll } from '@/store/constant'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Utils
import { isValidURL, removeDuplicateURL, setLocalStorageChatflow, getLocalStorageChatflow } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import FollowUpPromptsCard from '@/ui-component/cards/FollowUpPromptsCard'

const messageImageStyle = {
    width: '128px',
    height: '128px',
    objectFit: 'cover'
}

const CardWithDeleteOverlay = ({ item, disabled, customization, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false)
    const defaultBackgroundColor = customization.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent'

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            <Card
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '48px',
                    width: 'max-content',
                    p: 2,
                    mr: 1,
                    flex: '0 0 auto',
                    transition: 'opacity 0.3s',
                    opacity: isHovered ? 1 : 1,
                    backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.3)' : defaultBackgroundColor
                }}
                variant='outlined'
            >
                <IconPaperclip size={20} style={{ transition: 'filter 0.3s', filter: isHovered ? 'blur(2px)' : 'none' }} />
                <span
                    style={{
                        marginLeft: '5px',
                        color: customization.isDarkMode ? 'white' : 'inherit',
                        transition: 'filter 0.3s',
                        filter: isHovered ? 'blur(2px)' : 'none'
                    }}
                >
                    {item.name}
                </span>
            </Card>
            {isHovered && !disabled && (
                <Button
                    disabled={disabled}
                    onClick={() => onDelete(item)}
                    startIcon={<IconTrash color='white' size={22} />}
                    title='Remove attachment'
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'transparent',
                        '&:hover': {
                            backgroundColor: 'transparent'
                        }
                    }}
                ></Button>
            )}
        </div>
    )
}

CardWithDeleteOverlay.propTypes = {
    item: PropTypes.object,
    customization: PropTypes.object,
    disabled: PropTypes.bool,
    onDelete: PropTypes.func
}

export const ChatMessage = ({ open, chatflowid, isAgentCanvas, isDialog, previews, setPreviews }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const ps = useRef()

    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            message: 'Hi there! How can I help?',
            type: 'apiMessage'
        }
    ])
    const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = useState(false)
    const [isChatFlowAvailableForSpeech, setIsChatFlowAvailableForSpeech] = useState(false)
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState({})
    const [chatId, setChatId] = useState(uuidv4())
    const [isMessageStopping, setIsMessageStopping] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [imageUploadAllowedTypes, setImageUploadAllowedTypes] = useState('')
    const [fileUploadAllowedTypes, setFileUploadAllowedTypes] = useState('')

    const inputRef = useRef(null)
    const getChatmessageApi = useApi(chatmessageApi.getInternalChatmessageFromChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)
    const getAllowChatFlowUploads = useApi(chatflowsApi.getAllowChatflowUploads)
    const getChatflowConfig = useApi(chatflowsApi.getSpecificChatflow)

    const [starterPrompts, setStarterPrompts] = useState([])

    // full file upload
    const [fullFileUpload, setFullFileUpload] = useState(false)

    // feedback
    const [chatFeedbackStatus, setChatFeedbackStatus] = useState(false)
    const [feedbackId, setFeedbackId] = useState('')
    const [showFeedbackContentDialog, setShowFeedbackContentDialog] = useState(false)

    // leads
    const [leadsConfig, setLeadsConfig] = useState(null)
    const [leadName, setLeadName] = useState('')
    const [leadEmail, setLeadEmail] = useState('')
    const [leadPhone, setLeadPhone] = useState('')
    const [isLeadSaving, setIsLeadSaving] = useState(false)
    const [isLeadSaved, setIsLeadSaved] = useState(false)

    // follow-up prompts
    const [followUpPromptsStatus, setFollowUpPromptsStatus] = useState(false)
    const [followUpPrompts, setFollowUpPrompts] = useState([])

    // drag & drop and file input
    const imgUploadRef = useRef(null)
    const fileUploadRef = useRef(null)
    const [isChatFlowAvailableForImageUploads, setIsChatFlowAvailableForImageUploads] = useState(false)
    const [isChatFlowAvailableForFileUploads, setIsChatFlowAvailableForFileUploads] = useState(false)
    const [isChatFlowAvailableForRAGFileUploads, setIsChatFlowAvailableForRAGFileUploads] = useState(false)
    const [isDragActive, setIsDragActive] = useState(false)

    // recording
    const [isRecording, setIsRecording] = useState(false)
    const [recordingNotSupported, setRecordingNotSupported] = useState(false)
    const [isLoadingRecording, setIsLoadingRecording] = useState(false)

    const isFileAllowedForUpload = (file) => {
        const constraints = getAllowChatFlowUploads.data
        /**
         * {isImageUploadAllowed: boolean, imgUploadSizeAndTypes: Array<{ fileTypes: string[], maxUploadSize: number }>}
         */
        let acceptFile = false
        if (constraints.isImageUploadAllowed) {
            const fileType = file.type
            const sizeInMB = file.size / 1024 / 1024
            constraints.imgUploadSizeAndTypes.map((allowed) => {
                if (allowed.fileTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
                    acceptFile = true
                }
            })
        }

        if (fullFileUpload) {
            return true
        } else if (constraints.isRAGFileUploadAllowed) {
            const fileExt = file.name.split('.').pop()
            if (fileExt) {
                constraints.fileUploadSizeAndTypes.map((allowed) => {
                    if (allowed.fileTypes.length === 1 && allowed.fileTypes[0] === '*') {
                        acceptFile = true
                    } else if (allowed.fileTypes.includes(`.${fileExt}`)) {
                        acceptFile = true
                    }
                })
            }
        }
        if (!acceptFile) {
            alert(`Cannot upload file. Kindly check the allowed file types and maximum allowed size.`)
        }
        return acceptFile
    }

    const handleDrop = async (e) => {
        if (!isChatFlowAvailableForImageUploads && !isChatFlowAvailableForFileUploads) {
            return
        }
        e.preventDefault()
        setIsDragActive(false)
        let files = []
        let uploadedFiles = []

        if (e.dataTransfer.files.length > 0) {
            for (const file of e.dataTransfer.files) {
                if (isFileAllowedForUpload(file) === false) {
                    return
                }
                const reader = new FileReader()
                const { name } = file
                // Only add files
                if (!imageUploadAllowedTypes.includes(file.type)) {
                    uploadedFiles.push({ file, type: fullFileUpload ? 'file:full' : 'file:rag' })
                }
                files.push(
                    new Promise((resolve) => {
                        reader.onload = (evt) => {
                            if (!evt?.target?.result) {
                                return
                            }
                            const { result } = evt.target
                            let previewUrl
                            if (file.type.startsWith('audio/')) {
                                previewUrl = audioUploadSVG
                            } else {
                                previewUrl = URL.createObjectURL(file)
                            }
                            resolve({
                                data: result,
                                preview: previewUrl,
                                type: 'file',
                                name: name,
                                mime: file.type
                            })
                        }
                        reader.readAsDataURL(file)
                    })
                )
            }

            const newFiles = await Promise.all(files)
            setUploadedFiles(uploadedFiles)
            setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
        }

        if (e.dataTransfer.items) {
            //TODO set files
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'string' && item.type.match('^text/uri-list')) {
                    item.getAsString((s) => {
                        let upload = {
                            data: s,
                            preview: s,
                            type: 'url',
                            name: s ? s.substring(s.lastIndexOf('/') + 1) : ''
                        }
                        setPreviews((prevPreviews) => [...prevPreviews, upload])
                    })
                } else if (item.kind === 'string' && item.type.match('^text/html')) {
                    item.getAsString((s) => {
                        if (s.indexOf('href') === -1) return
                        //extract href
                        let start = s ? s.substring(s.indexOf('href') + 6) : ''
                        let hrefStr = start.substring(0, start.indexOf('"'))

                        let upload = {
                            data: hrefStr,
                            preview: hrefStr,
                            type: 'url',
                            name: hrefStr ? hrefStr.substring(hrefStr.lastIndexOf('/') + 1) : ''
                        }
                        setPreviews((prevPreviews) => [...prevPreviews, upload])
                    })
                }
            }
        }
    }

    const handleFileChange = async (event) => {
        const fileObj = event.target.files && event.target.files[0]
        if (!fileObj) {
            return
        }
        let files = []
        let uploadedFiles = []
        for (const file of event.target.files) {
            if (isFileAllowedForUpload(file) === false) {
                return
            }
            // Only add files
            if (!imageUploadAllowedTypes.includes(file.type)) {
                uploadedFiles.push({ file, type: fullFileUpload ? 'file:full' : 'file:rag' })
            }
            const reader = new FileReader()
            const { name } = file
            files.push(
                new Promise((resolve) => {
                    reader.onload = (evt) => {
                        if (!evt?.target?.result) {
                            return
                        }
                        const { result } = evt.target
                        resolve({
                            data: result,
                            preview: URL.createObjectURL(file),
                            type: 'file',
                            name: name,
                            mime: file.type
                        })
                    }
                    reader.readAsDataURL(file)
                })
            )
        }

        const newFiles = await Promise.all(files)
        setUploadedFiles(uploadedFiles)
        setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
        // 👇️ reset file input
        event.target.value = null
    }

    const addRecordingToPreviews = (blob) => {
        let mimeType = ''
        const pos = blob.type.indexOf(';')
        if (pos === -1) {
            mimeType = blob.type
        } else {
            mimeType = blob.type ? blob.type.substring(0, pos) : ''
        }
        // read blob and add to previews
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
            const base64data = reader.result
            const upload = {
                data: base64data,
                preview: audioUploadSVG,
                type: 'audio',
                name: `audio_${Date.now()}.wav`,
                mime: mimeType
            }
            setPreviews((prevPreviews) => [...prevPreviews, upload])
        }
    }

    const handleDrag = (e) => {
        if (isChatFlowAvailableForImageUploads || isChatFlowAvailableForFileUploads) {
            e.preventDefault()
            e.stopPropagation()
            if (e.type === 'dragenter' || e.type === 'dragover') {
                setIsDragActive(true)
            } else if (e.type === 'dragleave') {
                setIsDragActive(false)
            }
        }
    }

    const handleAbort = async () => {
        setIsMessageStopping(true)
        try {
            await chatmessageApi.abortMessage(chatflowid, chatId)
        } catch (error) {
            setIsMessageStopping(false)
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

    const handleDeletePreview = (itemToDelete) => {
        if (itemToDelete.type === 'file') {
            URL.revokeObjectURL(itemToDelete.preview) // Clean up for file
        }
        setPreviews(previews.filter((item) => item !== itemToDelete))
    }

    const handleFileUploadClick = () => {
        // 👇️ open file input box on click of another element
        fileUploadRef.current.click()
    }

    const handleImageUploadClick = () => {
        // 👇️ open file input box on click of another element
        imgUploadRef.current.click()
    }

    const clearPreviews = () => {
        // Revoke the data uris to avoid memory leaks
        previews.forEach((file) => URL.revokeObjectURL(file.preview))
        setPreviews([])
    }

    const onMicrophonePressed = () => {
        setIsRecording(true)
        startAudioRecording(setIsRecording, setRecordingNotSupported)
    }

    const onRecordingCancelled = () => {
        if (!recordingNotSupported) cancelAudioRecording()
        setIsRecording(false)
        setRecordingNotSupported(false)
    }

    const onRecordingStopped = async () => {
        setIsLoadingRecording(true)
        stopAudioRecording(addRecordingToPreviews)
    }

    const onSourceDialogClick = (data, title) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    const onURLClick = (data) => {
        window.open(data, '_blank')
    }

    const scrollToBottom = () => {
        if (ps.current) {
            ps.current.scrollTo({ top: maxScroll })
        }
    }

    const onChange = useCallback((e) => setUserInput(e.target.value), [setUserInput])

    const updateLastMessage = (text) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].message += text
            allMessages[allMessages.length - 1].feedback = null
            return allMessages
        })
    }

    const updateErrorMessage = (errorMessage) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            allMessages.push({ message: errorMessage, type: 'apiMessage' })
            return allMessages
        })
    }

    const updateLastMessageSourceDocuments = (sourceDocuments) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].sourceDocuments = sourceDocuments
            return allMessages
        })
    }

    const updateLastMessageAgentReasoning = (agentReasoning) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].agentReasoning = agentReasoning
            return allMessages
        })
    }

    const updateLastMessageAction = (action) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].action = action
            return allMessages
        })
    }

    const updateLastMessageArtifacts = (artifacts) => {
        artifacts.forEach((artifact) => {
            if (artifact.type === 'png' || artifact.type === 'jpeg') {
                artifact.data = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatflowid}&chatId=${chatId}&fileName=${artifact.data.replace(
                    'FILE-STORAGE::',
                    ''
                )}`
            }
        })
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].artifacts = artifacts
            return allMessages
        })
    }

    const updateLastMessageNextAgent = (nextAgent) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning
            if (lastAgentReasoning && lastAgentReasoning.length > 0) {
                lastAgentReasoning.push({ nextAgent })
            }
            allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning
            return allMessages
        })
    }

    const abortMessage = () => {
        setIsMessageStopping(false)
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning
            if (lastAgentReasoning && lastAgentReasoning.length > 0) {
                allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning.filter((reasoning) => !reasoning.nextAgent)
            }
            return allMessages
        })
        setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
        enqueueSnackbar({
            message: 'Message stopped',
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
    }

    const updateLastMessageUsedTools = (usedTools) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].usedTools = usedTools
            return allMessages
        })
    }

    const updateLastMessageFileAnnotations = (fileAnnotations) => {
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].fileAnnotations = fileAnnotations
            return allMessages
        })
    }

    // Handle errors
    const handleError = (message = 'Oops! There seems to be an error. Please try again.') => {
        message = message.replace(`Unable to parse JSON response from chat agent.\n\n`, '')
        setMessages((prevMessages) => [...prevMessages, { message, type: 'apiMessage' }])
        setLoading(false)
        setUserInput('')
        setUploadedFiles([])
        setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
    }

    const handlePromptClick = async (promptStarterInput) => {
        setUserInput(promptStarterInput)
        handleSubmit(undefined, promptStarterInput)
    }

    const handleFollowUpPromptClick = async (promptStarterInput) => {
        setUserInput(promptStarterInput)
        setFollowUpPrompts([])
        handleSubmit(undefined, promptStarterInput)
    }

    const handleActionClick = async (elem, action) => {
        setUserInput(elem.label)
        setMessages((prevMessages) => {
            let allMessages = [...cloneDeep(prevMessages)]
            if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages
            allMessages[allMessages.length - 1].action = null
            return allMessages
        })
        handleSubmit(undefined, elem.label, action)
    }

    const updateMetadata = (data, input) => {
        // set message id that is needed for feedback
        if (data.chatMessageId) {
            setMessages((prevMessages) => {
                let allMessages = [...cloneDeep(prevMessages)]
                if (allMessages[allMessages.length - 1].type === 'apiMessage') {
                    allMessages[allMessages.length - 1].id = data.chatMessageId
                }
                return allMessages
            })
        }

        if (data.chatId) {
            setChatId(data.chatId)
        }

        if (input === '' && data.question) {
            // the response contains the question even if it was in an audio format
            // so if input is empty but the response contains the question, update the user message to show the question
            setMessages((prevMessages) => {
                let allMessages = [...cloneDeep(prevMessages)]
                if (allMessages[allMessages.length - 2].type === 'apiMessage') return allMessages
                allMessages[allMessages.length - 2].message = data.question
                return allMessages
            })
        }

        if (data.followUpPrompts) {
            const followUpPrompts = JSON.parse(data.followUpPrompts)
            setFollowUpPrompts(followUpPrompts)
        }
    }

    const handleFileUploads = async (uploads) => {
        if (!uploadedFiles.length) return uploads

        if (fullFileUpload) {
            const filesWithFullUploadType = uploadedFiles.filter((file) => file.type === 'file:full')

            if (filesWithFullUploadType.length > 0) {
                const formData = new FormData()
                for (const file of filesWithFullUploadType) {
                    formData.append('files', file.file)
                }
                formData.append('chatId', chatId)

                const response = await attachmentsApi.createAttachment(chatflowid, chatId, formData)
                const data = response.data
                for (const extractedFileData of data) {
                    const content = extractedFileData.content
                    const fileName = extractedFileData.name

                    // find matching name in previews and replace data with content
                    const uploadIndex = uploads.findIndex((upload) => upload.name === fileName)
                    if (uploadIndex !== -1) {
                        uploads[uploadIndex] = {
                            ...uploads[uploadIndex],
                            data: content,
                            name: fileName,
                            type: 'file:full'
                        }
                    }
                }
            }
        } else if (isChatFlowAvailableForRAGFileUploads) {
            const filesWithRAGUploadType = uploadedFiles.filter((file) => file.type === 'file:rag')

            if (filesWithRAGUploadType.length > 0) {
                const formData = new FormData()
                for (const file of filesWithRAGUploadType) {
                    formData.append('files', file.file)
                }
                formData.append('chatId', chatId)

                await vectorstoreApi.upsertVectorStoreWithFormData(chatflowid, formData)

                // delay for vector store to be updated
                const delay = (delayInms) => {
                    return new Promise((resolve) => setTimeout(resolve, delayInms))
                }
                await delay(2500) //TODO: check if embeddings can be retrieved using file name as metadata filter

                uploads = uploads.map((upload) => {
                    return {
                        ...upload,
                        type: 'file:rag'
                    }
                })
            }
        }
        return uploads
    }

    // Handle form submission
    const handleSubmit = async (e, selectedInput, action) => {
        if (e) e.preventDefault()

        if (!selectedInput && userInput.trim() === '') {
            const containsFile = previews.filter((item) => !item.mime.startsWith('image') && item.type !== 'audio').length > 0
            if (!previews.length || (previews.length && containsFile)) {
                return
            }
        }

        let input = userInput

        if (selectedInput !== undefined && selectedInput.trim() !== '') input = selectedInput

        setLoading(true)
        let uploads = previews.map((item) => {
            return {
                data: item.data,
                type: item.type,
                name: item.name,
                mime: item.mime
            }
        })

        try {
            uploads = await handleFileUploads(uploads)
        } catch (error) {
            handleError('Unable to upload documents')
            return
        }

        clearPreviews()
        setMessages((prevMessages) => [...prevMessages, { message: input, type: 'userMessage', fileUploads: uploads }])

        // Send user question to Prediction Internal API
        try {
            const params = {
                question: input,
                chatId
            }
            if (uploads && uploads.length > 0) params.uploads = uploads
            if (leadEmail) params.leadEmail = leadEmail
            if (action) params.action = action

            if (isChatFlowAvailableToStream) {
                fetchResponseFromEventStream(chatflowid, params)
            } else {
                const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, params)
                if (response.data) {
                    const data = response.data

                    updateMetadata(data, input)

                    let text = ''
                    if (data.text) text = data.text
                    else if (data.json) text = '```json\n' + JSON.stringify(data.json, null, 2)
                    else text = JSON.stringify(data, null, 2)

                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            message: text,
                            id: data?.chatMessageId,
                            sourceDocuments: data?.sourceDocuments,
                            usedTools: data?.usedTools,
                            fileAnnotations: data?.fileAnnotations,
                            agentReasoning: data?.agentReasoning,
                            action: data?.action,
                            artifacts: data?.artifacts,
                            type: 'apiMessage',
                            feedback: null
                        }
                    ])

                    setLocalStorageChatflow(chatflowid, data.chatId)
                    setLoading(false)
                    setUserInput('')
                    setUploadedFiles([])
                    setTimeout(() => {
                        inputRef.current?.focus()
                        scrollToBottom()
                    }, 100)
                }
            }
        } catch (error) {
            handleError(error.response.data.message)
            return
        }
    }

    const fetchResponseFromEventStream = async (chatflowid, params) => {
        const chatId = params.chatId
        const input = params.question
        const username = localStorage.getItem('username')
        const password = localStorage.getItem('password')
        params.streaming = true
        await fetchEventSource(`${baseURL}/api/v1/internal-prediction/${chatflowid}`, {
            openWhenHidden: true,
            method: 'POST',
            body: JSON.stringify(params),
            headers: {
                'Content-Type': 'application/json',
                Authorization: username && password ? `Basic ${btoa(`${username}:${password}`)}` : undefined,
                'x-request-from': 'internal'
            },
            async onopen(response) {
                if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
                    //console.log('EventSource Open')
                }
            },
            async onmessage(ev) {
                const payload = JSON.parse(ev.data)
                switch (payload.event) {
                    case 'start':
                        setMessages((prevMessages) => [...prevMessages, { message: '', type: 'apiMessage' }])
                        break
                    case 'token':
                        updateLastMessage(payload.data)
                        break
                    case 'sourceDocuments':
                        updateLastMessageSourceDocuments(payload.data)
                        break
                    case 'usedTools':
                        updateLastMessageUsedTools(payload.data)
                        break
                    case 'fileAnnotations':
                        updateLastMessageFileAnnotations(payload.data)
                        break
                    case 'agentReasoning':
                        updateLastMessageAgentReasoning(payload.data)
                        break
                    case 'artifacts':
                        updateLastMessageArtifacts(payload.data)
                        break
                    case 'action':
                        updateLastMessageAction(payload.data)
                        break
                    case 'nextAgent':
                        updateLastMessageNextAgent(payload.data)
                        break
                    case 'metadata':
                        updateMetadata(payload.data, input)
                        break
                    case 'error':
                        updateErrorMessage(payload.data)
                        break
                    case 'abort':
                        abortMessage(payload.data)
                        closeResponse()
                        break
                    case 'end':
                        setLocalStorageChatflow(chatflowid, chatId)
                        closeResponse()
                        break
                }
            },
            async onclose() {
                closeResponse()
            },
            async onerror(err) {
                console.error('EventSource Error: ', err)
                closeResponse()
                throw err
            }
        })
    }

    const closeResponse = () => {
        setLoading(false)
        setUserInput('')
        setUploadedFiles([])
        setTimeout(() => {
            inputRef.current?.focus()
            scrollToBottom()
        }, 100)
    }
    // Prevent blank submissions and allow for multiline input
    const handleEnter = (e) => {
        // Check if IME composition is in progress
        const isIMEComposition = e.isComposing || e.keyCode === 229
        if (e.key === 'Enter' && userInput && !isIMEComposition) {
            if (!e.shiftKey && userInput) {
                handleSubmit(e)
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
        }
    }

    const getLabel = (URL, source) => {
        if (URL && typeof URL === 'object') {
            if (URL.pathname && typeof URL.pathname === 'string') {
                if (URL.pathname.substring(0, 15) === '/') {
                    return URL.host || ''
                } else {
                    return `${URL.pathname.substring(0, 15)}...`
                }
            } else if (URL.host) {
                return URL.host
            }
        }

        if (source && source.pageContent && typeof source.pageContent === 'string') {
            return `${source.pageContent.substring(0, 15)}...`
        }

        return ''
    }

    const getFileUploadAllowedTypes = () => {
        if (fullFileUpload) return '*'
        return fileUploadAllowedTypes.includes('*') ? '*' : fileUploadAllowedTypes || '*'
    }

    const downloadFile = async (fileAnnotation) => {
        try {
            const response = await axios.post(
                `${baseURL}/api/v1/openai-assistants-file/download`,
                { fileName: fileAnnotation.fileName, chatflowId: chatflowid, chatId: chatId },
                { responseType: 'blob' }
            )
            const blob = new Blob([response.data], { type: response.headers['content-type'] })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = fileAnnotation.fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const getAgentIcon = (nodeName, instructions) => {
        if (nodeName) {
            return `${baseURL}/api/v1/node-icon/${nodeName}`
        } else if (instructions) {
            return multiagent_supervisorPNG
        } else {
            return multiagent_workerPNG
        }
    }

    // Get chatmessages successful
    useEffect(() => {
        if (getChatmessageApi.data?.length) {
            const chatId = getChatmessageApi.data[0]?.chatId
            setChatId(chatId)
            const loadedMessages = getChatmessageApi.data.map((message) => {
                const obj = {
                    id: message.id,
                    message: message.content,
                    feedback: message.feedback,
                    type: message.role
                }
                if (message.sourceDocuments) obj.sourceDocuments = message.sourceDocuments
                if (message.usedTools) obj.usedTools = message.usedTools
                if (message.fileAnnotations) obj.fileAnnotations = message.fileAnnotations
                if (message.agentReasoning) obj.agentReasoning = message.agentReasoning
                if (message.action) obj.action = message.action
                if (message.artifacts) {
                    obj.artifacts = message.artifacts
                    obj.artifacts.forEach((artifact) => {
                        if (artifact.type === 'png' || artifact.type === 'jpeg') {
                            artifact.data = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatflowid}&chatId=${chatId}&fileName=${artifact.data.replace(
                                'FILE-STORAGE::',
                                ''
                            )}`
                        }
                    })
                }
                if (message.fileUploads) {
                    obj.fileUploads = message.fileUploads
                    obj.fileUploads.forEach((file) => {
                        if (file.type === 'stored-file') {
                            file.data = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatflowid}&chatId=${chatId}&fileName=${file.name}`
                        }
                    })
                }
                if (message.followUpPrompts) obj.followUpPrompts = JSON.parse(message.followUpPrompts)
                return obj
            })
            setMessages((prevMessages) => [...prevMessages, ...loadedMessages])
            setLocalStorageChatflow(chatflowid, chatId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatmessageApi.data])

    // Get chatflow streaming capability
    useEffect(() => {
        if (getIsChatflowStreamingApi.data) {
            setIsChatFlowAvailableToStream(getIsChatflowStreamingApi.data?.isStreaming ?? false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getIsChatflowStreamingApi.data])

    // Get chatflow uploads capability
    useEffect(() => {
        if (getAllowChatFlowUploads.data) {
            setIsChatFlowAvailableForImageUploads(getAllowChatFlowUploads.data?.isImageUploadAllowed ?? false)
            setIsChatFlowAvailableForRAGFileUploads(getAllowChatFlowUploads.data?.isRAGFileUploadAllowed ?? false)
            setIsChatFlowAvailableForSpeech(getAllowChatFlowUploads.data?.isSpeechToTextEnabled ?? false)
            setImageUploadAllowedTypes(getAllowChatFlowUploads.data?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(','))
            setFileUploadAllowedTypes(getAllowChatFlowUploads.data?.fileUploadSizeAndTypes.map((allowed) => allowed.fileTypes).join(','))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllowChatFlowUploads.data])

    useEffect(() => {
        if (getChatflowConfig.data) {
            if (getChatflowConfig.data?.chatbotConfig && JSON.parse(getChatflowConfig.data?.chatbotConfig)) {
                let config = JSON.parse(getChatflowConfig.data?.chatbotConfig)
                if (config.starterPrompts) {
                    let inputFields = []
                    Object.getOwnPropertyNames(config.starterPrompts).forEach((key) => {
                        if (config.starterPrompts[key]) {
                            inputFields.push(config.starterPrompts[key])
                        }
                    })
                    setStarterPrompts(inputFields.filter((field) => field.prompt !== ''))
                }
                if (config.chatFeedback) {
                    setChatFeedbackStatus(config.chatFeedback.status)
                }

                if (config.leads) {
                    setLeadsConfig(config.leads)
                    if (config.leads.status && !getLocalStorageChatflow(chatflowid).lead) {
                        setMessages((prevMessages) => {
                            const leadCaptureMessage = {
                                message: '',
                                type: 'leadCaptureMessage'
                            }

                            return [...prevMessages, leadCaptureMessage]
                        })
                    }
                }

                if (config.followUpPrompts) {
                    setFollowUpPromptsStatus(config.followUpPrompts.status)
                }

                if (config.fullFileUpload) {
                    setFullFileUpload(config.fullFileUpload.status)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatflowConfig.data])

    useEffect(() => {
        if (fullFileUpload) {
            setIsChatFlowAvailableForFileUploads(true)
        } else if (isChatFlowAvailableForRAGFileUploads) {
            setIsChatFlowAvailableForFileUploads(true)
        } else {
            setIsChatFlowAvailableForFileUploads(false)
        }
    }, [isChatFlowAvailableForRAGFileUploads, fullFileUpload])

    // Auto scroll chat to bottom
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (isDialog && inputRef) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [isDialog, inputRef])

    useEffect(() => {
        if (open && chatflowid) {
            // API request
            getChatmessageApi.request(chatflowid)
            getIsChatflowStreamingApi.request(chatflowid)
            getAllowChatFlowUploads.request(chatflowid)
            getChatflowConfig.request(chatflowid)

            // Scroll to bottom
            scrollToBottom()

            setIsRecording(false)

            // leads
            const savedLead = getLocalStorageChatflow(chatflowid)?.lead
            if (savedLead) {
                setIsLeadSaved(!!savedLead)
                setLeadEmail(savedLead.email)
            }
        }

        return () => {
            setUserInput('')
            setUploadedFiles([])
            setLoading(false)
            setMessages([
                {
                    message: 'Hi there! How can I help?',
                    type: 'apiMessage'
                }
            ])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chatflowid])

    useEffect(() => {
        // wait for audio recording to load and then send
        const containsAudio = previews.filter((item) => item.type === 'audio').length > 0
        if (previews.length >= 1 && containsAudio) {
            setIsRecording(false)
            setRecordingNotSupported(false)
            handlePromptClick('')
        }
        // eslint-disable-next-line
    }, [previews])

    useEffect(() => {
        if (followUpPromptsStatus && messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage.type === 'apiMessage' && lastMessage.followUpPrompts) {
                setFollowUpPrompts(lastMessage.followUpPrompts)
            } else if (lastMessage.type === 'userMessage') {
                setFollowUpPrompts([])
            }
        }
    }, [followUpPromptsStatus, messages])

    const copyMessageToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text || '')
        } catch (error) {
            console.error('Error copying to clipboard:', error)
        }
    }

    const onThumbsUpClick = async (messageId) => {
        const body = {
            chatflowid,
            chatId,
            messageId,
            rating: 'THUMBS_UP',
            content: ''
        }
        const result = await chatmessagefeedbackApi.addFeedback(chatflowid, body)
        if (result.data) {
            const data = result.data
            let id = ''
            if (data && data.id) id = data.id
            setMessages((prevMessages) => {
                const allMessages = [...cloneDeep(prevMessages)]
                return allMessages.map((message) => {
                    if (message.id === messageId) {
                        message.feedback = {
                            rating: 'THUMBS_UP'
                        }
                    }
                    return message
                })
            })
            setFeedbackId(id)
            setShowFeedbackContentDialog(true)
        }
    }

    const onThumbsDownClick = async (messageId) => {
        const body = {
            chatflowid,
            chatId,
            messageId,
            rating: 'THUMBS_DOWN',
            content: ''
        }
        const result = await chatmessagefeedbackApi.addFeedback(chatflowid, body)
        if (result.data) {
            const data = result.data
            let id = ''
            if (data && data.id) id = data.id
            setMessages((prevMessages) => {
                const allMessages = [...cloneDeep(prevMessages)]
                return allMessages.map((message) => {
                    if (message.id === messageId) {
                        message.feedback = {
                            rating: 'THUMBS_DOWN'
                        }
                    }
                    return message
                })
            })
            setFeedbackId(id)
            setShowFeedbackContentDialog(true)
        }
    }

    const submitFeedbackContent = async (text) => {
        const body = {
            content: text
        }
        const result = await chatmessagefeedbackApi.updateFeedback(feedbackId, body)
        if (result.data) {
            setFeedbackId('')
            setShowFeedbackContentDialog(false)
        }
    }

    const handleLeadCaptureSubmit = async (event) => {
        if (event) event.preventDefault()
        setIsLeadSaving(true)

        const body = {
            chatflowid,
            chatId,
            name: leadName,
            email: leadEmail,
            phone: leadPhone
        }

        const result = await leadsApi.addLead(body)
        if (result.data) {
            const data = result.data
            setChatId(data.chatId)
            setLocalStorageChatflow(chatflowid, data.chatId, { lead: { name: leadName, email: leadEmail, phone: leadPhone } })
            setIsLeadSaved(true)
            setLeadEmail(leadEmail)
            setMessages((prevMessages) => {
                let allMessages = [...cloneDeep(prevMessages)]
                if (allMessages[allMessages.length - 1].type !== 'leadCaptureMessage') return allMessages
                allMessages[allMessages.length - 1].message =
                    leadsConfig.successMessage || 'Thank you for submitting your contact information.'
                return allMessages
            })
        }
        setIsLeadSaving(false)
    }

    const getInputDisabled = () => {
        return (
            loading ||
            !chatflowid ||
            (leadsConfig?.status && !isLeadSaved) ||
            (messages[messages.length - 1].action && Object.keys(messages[messages.length - 1].action).length > 0)
        )
    }

    const previewDisplay = (item) => {
        if (item.mime.startsWith('image/')) {
            return (
                <ImageButton
                    focusRipple
                    style={{
                        width: '48px',
                        height: '48px',
                        marginRight: '10px',
                        flex: '0 0 auto'
                    }}
                    disabled={getInputDisabled()}
                    onClick={() => handleDeletePreview(item)}
                >
                    <ImageSrc style={{ backgroundImage: `url(${item.data})` }} />
                    <ImageBackdrop className='MuiImageBackdrop-root' />
                    <ImageMarked className='MuiImageMarked-root'>
                        <IconTrash size={20} color='white' />
                    </ImageMarked>
                </ImageButton>
            )
        } else if (item.mime.startsWith('audio/')) {
            return (
                <Card
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '48px',
                        width: isDialog ? ps?.current?.offsetWidth / 4 : ps?.current?.offsetWidth / 2,
                        p: 0.5,
                        mr: 1,
                        backgroundColor: theme.palette.grey[500],
                        flex: '0 0 auto'
                    }}
                    variant='outlined'
                >
                    <CardMedia component='audio' sx={{ color: 'transparent' }} controls src={item.data} />
                    <IconButton disabled={getInputDisabled()} onClick={() => handleDeletePreview(item)} size='small'>
                        <IconTrash size={20} color='white' />
                    </IconButton>
                </Card>
            )
        } else {
            return (
                <CardWithDeleteOverlay
                    disabled={getInputDisabled()}
                    item={item}
                    customization={customization}
                    onDelete={() => handleDeletePreview(item)}
                />
            )
        }
    }

    const renderFileUploads = (item, index) => {
        if (item?.mime?.startsWith('image/')) {
            return (
                <Card
                    key={index}
                    sx={{
                        p: 0,
                        m: 0,
                        maxWidth: 128,
                        marginRight: '10px',
                        flex: '0 0 auto'
                    }}
                >
                    <CardMedia component='img' image={item.data} sx={{ height: 64 }} alt={'preview'} style={messageImageStyle} />
                </Card>
            )
        } else if (item?.mime?.startsWith('audio/')) {
            return (
                /* eslint-disable jsx-a11y/media-has-caption */
                <audio controls='controls'>
                    Your browser does not support the &lt;audio&gt; tag.
                    <source src={item.data} type={item.mime} />
                </audio>
            )
        } else {
            return (
                <Card
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '48px',
                        width: 'max-content',
                        p: 2,
                        mr: 1,
                        flex: '0 0 auto',
                        backgroundColor: customization.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'transparent'
                    }}
                    variant='outlined'
                >
                    <IconPaperclip size={20} />
                    <span
                        style={{
                            marginLeft: '5px',
                            color: customization.isDarkMode ? 'white' : 'inherit'
                        }}
                    >
                        {item.name}
                    </span>
                </Card>
            )
        }
    }

    const agentReasoningArtifacts = (artifacts) => {
        const newArtifacts = cloneDeep(artifacts)
        for (let i = 0; i < newArtifacts.length; i++) {
            const artifact = newArtifacts[i]
            if (artifact && (artifact.type === 'png' || artifact.type === 'jpeg')) {
                const data = artifact.data
                newArtifacts[i].data = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatflowid}&chatId=${chatId}&fileName=${data.replace(
                    'FILE-STORAGE::',
                    ''
                )}`
            }
        }
        return newArtifacts
    }

    const renderArtifacts = (item, index, isAgentReasoning) => {
        if (item.type === 'png' || item.type === 'jpeg') {
            return (
                <Card
                    key={index}
                    sx={{
                        p: 0,
                        m: 0,
                        mt: 2,
                        mb: 2,
                        flex: '0 0 auto'
                    }}
                >
                    <CardMedia
                        component='img'
                        image={item.data}
                        sx={{ height: 'auto' }}
                        alt={'artifact'}
                        style={{
                            width: isAgentReasoning ? '200px' : '100%',
                            height: isAgentReasoning ? '200px' : 'auto',
                            objectFit: 'cover'
                        }}
                    />
                </Card>
            )
        } else if (item.type === 'html') {
            return (
                <div style={{ marginTop: '20px' }}>
                    <div dangerouslySetInnerHTML={{ __html: item.data }}></div>
                </div>
            )
        } else {
            return (
                <MemoizedReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax, rehypeRaw]}
                    components={{
                        code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline ? (
                                <CodeBlock
                                    key={Math.random()}
                                    chatflowid={chatflowid}
                                    isDialog={isDialog}
                                    language={(match && match[1]) || ''}
                                    value={String(children).replace(/\n$/, '')}
                                    {...props}
                                />
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {item.data}
                </MemoizedReactMarkdown>
            )
        }
    }

    return (
        <div onDragEnter={handleDrag}>
            {isDragActive && (
                <div
                    className='image-dropzone'
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragEnd={handleDrag}
                    onDrop={handleDrop}
                />
            )}
            {isDragActive &&
                (getAllowChatFlowUploads.data?.isImageUploadAllowed || getAllowChatFlowUploads.data?.isRAGFileUploadAllowed) && (
                    <Box className='drop-overlay'>
                        <Typography variant='h2'>Drop here to upload</Typography>
                        {[
                            ...getAllowChatFlowUploads.data.imgUploadSizeAndTypes,
                            ...getAllowChatFlowUploads.data.fileUploadSizeAndTypes
                        ].map((allowed) => {
                            return (
                                <>
                                    <Typography variant='subtitle1'>{allowed.fileTypes?.join(', ')}</Typography>
                                    {allowed.maxUploadSize && (
                                        <Typography variant='subtitle1'>Max Allowed Size: {allowed.maxUploadSize} MB</Typography>
                                    )}
                                </>
                            )
                        })}
                    </Box>
                )}
            <div ref={ps} className={`${isDialog ? 'cloud-dialog' : 'cloud'}`}>
                <div id='messagelist' className={'messagelist'}>
                    {messages &&
                        messages.map((message, index) => {
                            return (
                                // The latest message sent by the user will be animated while waiting for a response
                                <Box
                                    sx={{
                                        background:
                                            message.type === 'apiMessage' || message.type === 'leadCaptureMessage'
                                                ? theme.palette.asyncSelect.main
                                                : ''
                                    }}
                                    key={index}
                                    style={{ display: 'flex' }}
                                    className={
                                        message.type === 'userMessage' && loading && index === messages.length - 1
                                            ? customization.isDarkMode
                                                ? 'usermessagewaiting-dark'
                                                : 'usermessagewaiting-light'
                                            : message.type === 'usermessagewaiting'
                                            ? 'apimessage'
                                            : 'usermessage'
                                    }
                                >
                                    {/* Display the correct icon depending on the message type */}
                                    {message.type === 'apiMessage' || message.type === 'leadCaptureMessage' ? (
                                        <img src={robotPNG} alt='AI' width='30' height='30' className='boticon' />
                                    ) : (
                                        <img src={userPNG} alt='Me' width='30' height='30' className='usericon' />
                                    )}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            width: '100%'
                                        }}
                                    >
                                        {message.fileUploads && message.fileUploads.length > 0 && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    flexDirection: 'column',
                                                    width: '100%',
                                                    gap: '8px'
                                                }}
                                            >
                                                {message.fileUploads.map((item, index) => {
                                                    return <>{renderFileUploads(item, index)}</>
                                                })}
                                            </div>
                                        )}
                                        {message.agentReasoning && (
                                            <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                {message.agentReasoning.map((agent, index) => {
                                                    return agent.nextAgent ? (
                                                        <Card
                                                            key={index}
                                                            sx={{
                                                                border: customization.isDarkMode ? 'none' : '1px solid #e0e0e0',
                                                                borderRadius: `${customization.borderRadius}px`,
                                                                background: customization.isDarkMode
                                                                    ? `linear-gradient(to top, #303030, #212121)`
                                                                    : `linear-gradient(to top, #f6f3fb, #f2f8fc)`,
                                                                mb: 1
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Stack
                                                                    sx={{
                                                                        alignItems: 'center',
                                                                        justifyContent: 'flex-start',
                                                                        width: '100%'
                                                                    }}
                                                                    flexDirection='row'
                                                                >
                                                                    <Box sx={{ height: 'auto', pr: 1 }}>
                                                                        <img
                                                                            style={{
                                                                                objectFit: 'cover',
                                                                                height: '35px',
                                                                                width: 'auto'
                                                                            }}
                                                                            src={nextAgentGIF}
                                                                            alt='agentPNG'
                                                                        />
                                                                    </Box>
                                                                    <div>{agent.nextAgent}</div>
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                    ) : (
                                                        <Card
                                                            key={index}
                                                            sx={{
                                                                border: customization.isDarkMode ? 'none' : '1px solid #e0e0e0',
                                                                borderRadius: `${customization.borderRadius}px`,
                                                                background: customization.isDarkMode
                                                                    ? `linear-gradient(to top, #303030, #212121)`
                                                                    : `linear-gradient(to top, #f6f3fb, #f2f8fc)`,
                                                                mb: 1
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Stack
                                                                    sx={{
                                                                        alignItems: 'center',
                                                                        justifyContent: 'flex-start',
                                                                        width: '100%'
                                                                    }}
                                                                    flexDirection='row'
                                                                >
                                                                    <Box sx={{ height: 'auto', pr: 1 }}>
                                                                        <img
                                                                            style={{
                                                                                objectFit: 'cover',
                                                                                height: '25px',
                                                                                width: 'auto'
                                                                            }}
                                                                            src={getAgentIcon(agent.nodeName, agent.instructions)}
                                                                            alt='agentPNG'
                                                                        />
                                                                    </Box>
                                                                    <div>{agent.agentName}</div>
                                                                </Stack>
                                                                {agent.usedTools && agent.usedTools.length > 0 && (
                                                                    <div
                                                                        style={{
                                                                            display: 'block',
                                                                            flexDirection: 'row',
                                                                            width: '100%'
                                                                        }}
                                                                    >
                                                                        {agent.usedTools.map((tool, index) => {
                                                                            return tool !== null ? (
                                                                                <Chip
                                                                                    size='small'
                                                                                    key={index}
                                                                                    label={tool.tool}
                                                                                    component='a'
                                                                                    sx={{ mr: 1, mt: 1 }}
                                                                                    variant='outlined'
                                                                                    clickable
                                                                                    icon={<IconTool size={15} />}
                                                                                    onClick={() => onSourceDialogClick(tool, 'Used Tools')}
                                                                                />
                                                                            ) : null
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {agent.state && Object.keys(agent.state).length > 0 && (
                                                                    <div
                                                                        style={{
                                                                            display: 'block',
                                                                            flexDirection: 'row',
                                                                            width: '100%'
                                                                        }}
                                                                    >
                                                                        <Chip
                                                                            size='small'
                                                                            label={'State'}
                                                                            component='a'
                                                                            sx={{ mr: 1, mt: 1 }}
                                                                            variant='outlined'
                                                                            clickable
                                                                            icon={<IconDeviceSdCard size={15} />}
                                                                            onClick={() => onSourceDialogClick(agent.state, 'State')}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {agent.artifacts && (
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexWrap: 'wrap',
                                                                            flexDirection: 'row',
                                                                            width: '100%',
                                                                            gap: '8px'
                                                                        }}
                                                                    >
                                                                        {agentReasoningArtifacts(agent.artifacts).map((item, index) => {
                                                                            return item !== null ? (
                                                                                <>{renderArtifacts(item, index, true)}</>
                                                                            ) : null
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {agent.messages.length > 0 && (
                                                                    <MemoizedReactMarkdown
                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                        rehypePlugins={[rehypeMathjax, rehypeRaw]}
                                                                        components={{
                                                                            code({ inline, className, children, ...props }) {
                                                                                const match = /language-(\w+)/.exec(className || '')
                                                                                return !inline ? (
                                                                                    <CodeBlock
                                                                                        key={Math.random()}
                                                                                        chatflowid={chatflowid}
                                                                                        isDialog={isDialog}
                                                                                        language={(match && match[1]) || ''}
                                                                                        value={String(children).replace(/\n$/, '')}
                                                                                        {...props}
                                                                                    />
                                                                                ) : (
                                                                                    <code className={className} {...props}>
                                                                                        {children}
                                                                                    </code>
                                                                                )
                                                                            }
                                                                        }}
                                                                    >
                                                                        {agent.messages.length > 1
                                                                            ? agent.messages.join('\\n')
                                                                            : agent.messages[0]}
                                                                    </MemoizedReactMarkdown>
                                                                )}
                                                                {agent.instructions && <p>{agent.instructions}</p>}
                                                                {agent.messages.length === 0 && !agent.instructions && <p>Finished</p>}
                                                                {agent.sourceDocuments && agent.sourceDocuments.length > 0 && (
                                                                    <div
                                                                        style={{
                                                                            display: 'block',
                                                                            flexDirection: 'row',
                                                                            width: '100%'
                                                                        }}
                                                                    >
                                                                        {removeDuplicateURL(agent).map((source, index) => {
                                                                            const URL =
                                                                                source && source.metadata && source.metadata.source
                                                                                    ? isValidURL(source.metadata.source)
                                                                                    : undefined
                                                                            return (
                                                                                <Chip
                                                                                    size='small'
                                                                                    key={index}
                                                                                    label={getLabel(URL, source) || ''}
                                                                                    component='a'
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                    variant='outlined'
                                                                                    clickable
                                                                                    onClick={() =>
                                                                                        URL
                                                                                            ? onURLClick(source.metadata.source)
                                                                                            : onSourceDialogClick(source)
                                                                                    }
                                                                                />
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {message.usedTools && (
                                            <div
                                                style={{
                                                    display: 'block',
                                                    flexDirection: 'row',
                                                    width: '100%'
                                                }}
                                            >
                                                {message.usedTools.map((tool, index) => {
                                                    return tool ? (
                                                        <Chip
                                                            size='small'
                                                            key={index}
                                                            label={tool.tool}
                                                            component='a'
                                                            sx={{ mr: 1, mt: 1 }}
                                                            variant='outlined'
                                                            clickable
                                                            icon={<IconTool size={15} />}
                                                            onClick={() => onSourceDialogClick(tool, 'Used Tools')}
                                                        />
                                                    ) : null
                                                })}
                                            </div>
                                        )}
                                        {message.artifacts && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    flexDirection: 'column',
                                                    width: '100%'
                                                }}
                                            >
                                                {message.artifacts.map((item, index) => {
                                                    return item !== null ? <>{renderArtifacts(item, index)}</> : null
                                                })}
                                            </div>
                                        )}
                                        <div className='markdownanswer'>
                                            {message.type === 'leadCaptureMessage' &&
                                            !getLocalStorageChatflow(chatflowid)?.lead &&
                                            leadsConfig.status ? (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 2,
                                                        marginTop: 2
                                                    }}
                                                >
                                                    <Typography sx={{ lineHeight: '1.5rem', whiteSpace: 'pre-line' }}>
                                                        {leadsConfig.title || 'Let us know where we can reach you:'}
                                                    </Typography>
                                                    <form
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px',
                                                            width: isDialog ? '50%' : '100%'
                                                        }}
                                                        onSubmit={handleLeadCaptureSubmit}
                                                    >
                                                        {leadsConfig.name && (
                                                            <OutlinedInput
                                                                id='leadName'
                                                                type='text'
                                                                fullWidth
                                                                placeholder='Name'
                                                                name='leadName'
                                                                value={leadName}
                                                                // eslint-disable-next-line
                                                                autoFocus={true}
                                                                onChange={(e) => setLeadName(e.target.value)}
                                                            />
                                                        )}
                                                        {leadsConfig.email && (
                                                            <OutlinedInput
                                                                id='leadEmail'
                                                                type='email'
                                                                fullWidth
                                                                placeholder='Email Address'
                                                                name='leadEmail'
                                                                value={leadEmail}
                                                                onChange={(e) => setLeadEmail(e.target.value)}
                                                            />
                                                        )}
                                                        {leadsConfig.phone && (
                                                            <OutlinedInput
                                                                id='leadPhone'
                                                                type='number'
                                                                fullWidth
                                                                placeholder='Phone Number'
                                                                name='leadPhone'
                                                                value={leadPhone}
                                                                onChange={(e) => setLeadPhone(e.target.value)}
                                                            />
                                                        )}
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <Button
                                                                variant='outlined'
                                                                fullWidth
                                                                type='submit'
                                                                sx={{ borderRadius: '20px' }}
                                                            >
                                                                {isLeadSaving ? 'Saving...' : 'Save'}
                                                            </Button>
                                                        </Box>
                                                    </form>
                                                </Box>
                                            ) : (
                                                <>
                                                    {/* Messages are being rendered in Markdown format */}
                                                    <MemoizedReactMarkdown
                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                        rehypePlugins={[rehypeMathjax, rehypeRaw]}
                                                        components={{
                                                            code({ inline, className, children, ...props }) {
                                                                const match = /language-(\w+)/.exec(className || '')
                                                                return !inline ? (
                                                                    <CodeBlock
                                                                        key={Math.random()}
                                                                        chatflowid={chatflowid}
                                                                        isDialog={isDialog}
                                                                        language={(match && match[1]) || ''}
                                                                        value={String(children).replace(/\n$/, '')}
                                                                        {...props}
                                                                    />
                                                                ) : (
                                                                    <code className={className} {...props}>
                                                                        {children}
                                                                    </code>
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        {message.message}
                                                    </MemoizedReactMarkdown>
                                                </>
                                            )}
                                        </div>
                                        {message.fileAnnotations && (
                                            <div
                                                style={{
                                                    display: 'block',
                                                    flexDirection: 'row',
                                                    width: '100%',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                {message.fileAnnotations.map((fileAnnotation, index) => {
                                                    return (
                                                        <Button
                                                            sx={{
                                                                fontSize: '0.85rem',
                                                                textTransform: 'none',
                                                                mb: 1
                                                            }}
                                                            key={index}
                                                            variant='outlined'
                                                            onClick={() => downloadFile(fileAnnotation)}
                                                            endIcon={<IconDownload color={theme.palette.primary.main} />}
                                                        >
                                                            {fileAnnotation.fileName}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {message.sourceDocuments && (
                                            <div
                                                style={{
                                                    display: 'block',
                                                    flexDirection: 'row',
                                                    width: '100%',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                {removeDuplicateURL(message).map((source, index) => {
                                                    const URL =
                                                        source.metadata && source.metadata.source
                                                            ? isValidURL(source.metadata.source)
                                                            : undefined
                                                    return (
                                                        <Chip
                                                            size='small'
                                                            key={index}
                                                            label={getLabel(URL, source) || ''}
                                                            component='a'
                                                            sx={{ mr: 1, mb: 1 }}
                                                            variant='outlined'
                                                            clickable
                                                            onClick={() =>
                                                                URL ? onURLClick(source.metadata.source) : onSourceDialogClick(source)
                                                            }
                                                        />
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {message.action && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    flexDirection: 'row',
                                                    width: '100%',
                                                    gap: '8px',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                {(message.action.elements || []).map((elem, index) => {
                                                    return (
                                                        <>
                                                            {elem.type === 'approve-button' && elem.label === 'Yes' ? (
                                                                <Button
                                                                    sx={{
                                                                        width: 'max-content',
                                                                        borderRadius: '20px',
                                                                        background: customization.isDarkMode ? 'transparent' : 'white'
                                                                    }}
                                                                    variant='outlined'
                                                                    color='success'
                                                                    key={index}
                                                                    startIcon={<IconCheck />}
                                                                    onClick={() => handleActionClick(elem, message.action)}
                                                                >
                                                                    {elem.label}
                                                                </Button>
                                                            ) : elem.type === 'reject-button' && elem.label === 'No' ? (
                                                                <Button
                                                                    sx={{
                                                                        width: 'max-content',
                                                                        borderRadius: '20px',
                                                                        background: customization.isDarkMode ? 'transparent' : 'white'
                                                                    }}
                                                                    variant='outlined'
                                                                    color='error'
                                                                    key={index}
                                                                    startIcon={<IconX />}
                                                                    onClick={() => handleActionClick(elem, message.action)}
                                                                >
                                                                    {elem.label}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    sx={{ width: 'max-content', borderRadius: '20px', background: 'white' }}
                                                                    variant='outlined'
                                                                    key={index}
                                                                    onClick={() => handleActionClick(elem, message.action)}
                                                                >
                                                                    {elem.label}
                                                                </Button>
                                                            )}
                                                        </>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {message.type === 'apiMessage' && message.id && chatFeedbackStatus ? (
                                            <>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'start',
                                                        gap: 1
                                                    }}
                                                >
                                                    <CopyToClipboardButton onClick={() => copyMessageToClipboard(message.message)} />
                                                    {!message.feedback ||
                                                    message.feedback.rating === '' ||
                                                    message.feedback.rating === 'THUMBS_UP' ? (
                                                        <ThumbsUpButton
                                                            isDisabled={message.feedback && message.feedback.rating === 'THUMBS_UP'}
                                                            rating={message.feedback ? message.feedback.rating : ''}
                                                            onClick={() => onThumbsUpClick(message.id)}
                                                        />
                                                    ) : null}
                                                    {!message.feedback ||
                                                    message.feedback.rating === '' ||
                                                    message.feedback.rating === 'THUMBS_DOWN' ? (
                                                        <ThumbsDownButton
                                                            isDisabled={message.feedback && message.feedback.rating === 'THUMBS_DOWN'}
                                                            rating={message.feedback ? message.feedback.rating : ''}
                                                            onClick={() => onThumbsDownClick(message.id)}
                                                        />
                                                    ) : null}
                                                </Box>
                                            </>
                                        ) : null}
                                    </div>
                                </Box>
                            )
                        })}
                </div>
            </div>

            {messages && messages.length === 1 && starterPrompts.length > 0 && (
                <div style={{ position: 'relative' }}>
                    <StarterPromptsCard
                        sx={{ bottom: previews && previews.length > 0 ? 70 : 0 }}
                        starterPrompts={starterPrompts || []}
                        onPromptClick={handlePromptClick}
                        isGrid={isDialog}
                    />
                </div>
            )}

            {messages && messages.length > 2 && followUpPromptsStatus && followUpPrompts.length > 0 && (
                <>
                    <Divider sx={{ width: '100%' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', position: 'relative', pt: 1.5 }}>
                        <Stack sx={{ flexDirection: 'row', alignItems: 'center', px: 1.5, gap: 0.5 }}>
                            <IconSparkles size={12} />
                            <Typography sx={{ fontSize: '0.75rem' }} variant='body2'>
                                Try these prompts
                            </Typography>
                        </Stack>
                        <FollowUpPromptsCard
                            sx={{ bottom: previews && previews.length > 0 ? 70 : 0 }}
                            followUpPrompts={followUpPrompts || []}
                            onPromptClick={handleFollowUpPromptClick}
                            isGrid={isDialog}
                        />
                    </Box>
                </>
            )}

            <Divider sx={{ width: '100%' }} />

            <div className='center'>
                {previews && previews.length > 0 && (
                    <Box sx={{ width: '100%', mb: 1.5, display: 'flex', alignItems: 'center' }}>
                        {previews.map((item, index) => (
                            <Fragment key={index}>{previewDisplay(item)}</Fragment>
                        ))}
                    </Box>
                )}
                {isRecording ? (
                    <>
                        {recordingNotSupported ? (
                            <div className='overlay'>
                                <div className='browser-not-supporting-audio-recording-box'>
                                    <Typography variant='body1'>
                                        To record audio, use modern browsers like Chrome or Firefox that support audio recording.
                                    </Typography>
                                    <Button
                                        variant='contained'
                                        color='error'
                                        size='small'
                                        type='button'
                                        onClick={() => onRecordingCancelled()}
                                    >
                                        Okay
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '54px',
                                    px: 2,
                                    border: '1px solid',
                                    borderRadius: 3,
                                    backgroundColor: customization.isDarkMode ? '#32353b' : '#fafafa',
                                    borderColor: 'rgba(0, 0, 0, 0.23)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div className='recording-elapsed-time'>
                                    <span className='red-recording-dot'>
                                        <IconCircleDot />
                                    </span>
                                    <Typography id='elapsed-time'>00:00</Typography>
                                    {isLoadingRecording && <Typography ml={1.5}>Sending...</Typography>}
                                </div>
                                <div className='recording-control-buttons-container'>
                                    <IconButton onClick={onRecordingCancelled} size='small'>
                                        <IconX
                                            color={loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                        />
                                    </IconButton>
                                    <IconButton onClick={onRecordingStopped} size='small'>
                                        <IconSend
                                            color={loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                        />
                                    </IconButton>
                                </div>
                            </Box>
                        )}
                    </>
                ) : (
                    <form style={{ width: '100%' }} onSubmit={handleSubmit}>
                        <OutlinedInput
                            inputRef={inputRef}
                            // eslint-disable-next-line
                            autoFocus
                            sx={{ width: '100%' }}
                            disabled={getInputDisabled()}
                            onKeyDown={handleEnter}
                            id='userInput'
                            name='userInput'
                            placeholder={loading ? 'Waiting for response...' : 'Type your question...'}
                            value={userInput}
                            onChange={onChange}
                            multiline={true}
                            maxRows={isDialog ? 7 : 2}
                            startAdornment={
                                <>
                                    {isChatFlowAvailableForImageUploads && !isChatFlowAvailableForFileUploads && (
                                        <InputAdornment position='start' sx={{ ml: 2 }}>
                                            <IconButton
                                                onClick={handleImageUploadClick}
                                                type='button'
                                                disabled={getInputDisabled()}
                                                edge='start'
                                            >
                                                <IconPhotoPlus
                                                    color={getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    {!isChatFlowAvailableForImageUploads && isChatFlowAvailableForFileUploads && (
                                        <InputAdornment position='start' sx={{ ml: 2 }}>
                                            <IconButton
                                                onClick={handleFileUploadClick}
                                                type='button'
                                                disabled={getInputDisabled()}
                                                edge='start'
                                            >
                                                <IconPaperclip
                                                    color={getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    {isChatFlowAvailableForImageUploads && isChatFlowAvailableForFileUploads && (
                                        <InputAdornment position='start' sx={{ ml: 2 }}>
                                            <IconButton
                                                onClick={handleImageUploadClick}
                                                type='button'
                                                disabled={getInputDisabled()}
                                                edge='start'
                                            >
                                                <IconPhotoPlus
                                                    color={getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                                />
                                            </IconButton>
                                            <IconButton
                                                sx={{ ml: 0 }}
                                                onClick={handleFileUploadClick}
                                                type='button'
                                                disabled={getInputDisabled()}
                                                edge='start'
                                            >
                                                <IconPaperclip
                                                    color={getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    {!isChatFlowAvailableForImageUploads && !isChatFlowAvailableForFileUploads && <Box sx={{ pl: 1 }} />}
                                </>
                            }
                            endAdornment={
                                <>
                                    {isChatFlowAvailableForSpeech && (
                                        <InputAdornment position='end'>
                                            <IconButton
                                                onClick={() => onMicrophonePressed()}
                                                type='button'
                                                disabled={getInputDisabled()}
                                                edge='end'
                                            >
                                                <IconMicrophone
                                                    className={'start-recording-button'}
                                                    color={getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    {!isAgentCanvas && (
                                        <InputAdornment position='end' sx={{ paddingRight: '15px' }}>
                                            <IconButton type='submit' disabled={getInputDisabled()} edge='end'>
                                                {loading ? (
                                                    <div>
                                                        <CircularProgress color='inherit' size={20} />
                                                    </div>
                                                ) : (
                                                    // Send icon SVG in input field
                                                    <IconSend
                                                        color={
                                                            getInputDisabled() ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'
                                                        }
                                                    />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    {isAgentCanvas && (
                                        <>
                                            {!loading && (
                                                <InputAdornment position='end' sx={{ paddingRight: '15px' }}>
                                                    <IconButton type='submit' disabled={getInputDisabled()} edge='end'>
                                                        <IconSend
                                                            color={
                                                                getInputDisabled()
                                                                    ? '#9e9e9e'
                                                                    : customization.isDarkMode
                                                                    ? 'white'
                                                                    : '#1e88e5'
                                                            }
                                                        />
                                                    </IconButton>
                                                </InputAdornment>
                                            )}
                                            {loading && (
                                                <InputAdornment position='end' sx={{ padding: '15px', mr: 1 }}>
                                                    <IconButton
                                                        edge='end'
                                                        title={isMessageStopping ? 'Stopping...' : 'Stop'}
                                                        style={{ border: !isMessageStopping ? '2px solid red' : 'none' }}
                                                        onClick={() => handleAbort()}
                                                        disabled={isMessageStopping}
                                                    >
                                                        {isMessageStopping ? (
                                                            <div>
                                                                <CircularProgress color='error' size={20} />
                                                            </div>
                                                        ) : (
                                                            <IconSquareFilled size={15} color='red' />
                                                        )}
                                                    </IconButton>
                                                </InputAdornment>
                                            )}
                                        </>
                                    )}
                                </>
                            }
                        />
                        {isChatFlowAvailableForImageUploads && (
                            <input
                                style={{ display: 'none' }}
                                multiple
                                ref={imgUploadRef}
                                type='file'
                                onChange={handleFileChange}
                                accept={imageUploadAllowedTypes || '*'}
                            />
                        )}
                        {isChatFlowAvailableForFileUploads && (
                            <input
                                style={{ display: 'none' }}
                                multiple
                                ref={fileUploadRef}
                                type='file'
                                onChange={handleFileChange}
                                accept={getFileUploadAllowedTypes()}
                            />
                        )}
                    </form>
                )}
            </div>
            <SourceDocDialog show={sourceDialogOpen} dialogProps={sourceDialogProps} onCancel={() => setSourceDialogOpen(false)} />
            <ChatFeedbackContentDialog
                show={showFeedbackContentDialog}
                onCancel={() => setShowFeedbackContentDialog(false)}
                onConfirm={submitFeedbackContent}
            />
        </div>
    )
}

ChatMessage.propTypes = {
    open: PropTypes.bool,
    chatflowid: PropTypes.string,
    isAgentCanvas: PropTypes.bool,
    isDialog: PropTypes.bool,
    previews: PropTypes.array,
    setPreviews: PropTypes.func
}
