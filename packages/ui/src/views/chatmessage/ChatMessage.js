import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import socketIOClient from 'socket.io-client'
import { cloneDeep } from 'lodash'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import axios from 'axios'
import audioUploadSVG from 'assets/images/wave-sound.jpg'

import {
    Box,
    Button,
    Card,
    CardActions,
    CardMedia,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    OutlinedInput,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconDownload,
    IconSend,
    IconUpload,
    IconMicrophone,
    IconPhotoPlus,
    IconPlayerStop,
    IconPlayerRecord,
    IconCircleDot
} from '@tabler/icons'

// project import
import { CodeBlock } from 'ui-component/markdown/CodeBlock'
import { MemoizedReactMarkdown } from 'ui-component/markdown/MemoizedReactMarkdown'
import SourceDocDialog from 'ui-component/dialog/SourceDocDialog'
import './ChatMessage.css'
import './audio-recording.css'

// api
import chatmessageApi from 'api/chatmessage'
import chatflowsApi from 'api/chatflows'
import predictionApi from 'api/prediction'

// Hooks
import useApi from 'hooks/useApi'

// Const
import { baseURL, maxScroll } from 'store/constant'

import robotPNG from 'assets/images/robot.png'
import userPNG from 'assets/images/account.png'
import { isValidURL, removeDuplicateURL, setLocalStorageChatflow } from 'utils/genericHelper'
import DeleteIcon from '@mui/icons-material/Delete'

export const ChatMessage = ({ open, chatflowid, isDialog }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const ps = useRef()

    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            message: 'Hi there! How can I help?',
            type: 'apiMessage'
        }
    ])
    const [socketIOClientId, setSocketIOClientId] = useState('')
    const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = useState(false)
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState({})
    const [chatId, setChatId] = useState(undefined)

    const inputRef = useRef(null)
    const getChatmessageApi = useApi(chatmessageApi.getInternalChatmessageFromChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)

    const fileUploadRef = useRef(null)
    const getAllowChatFlowUploads = useApi(chatflowsApi.getAllowChatflowUploads)
    const [isChatFlowAvailableForUploads, setIsChatFlowAvailableForUploads] = useState(false)
    const [previews, setPreviews] = useState([])
    const [isDragOver, setIsDragOver] = useState(false)
    const handleDragOver = (e) => {
        if (!isChatFlowAvailableForUploads) {
            return
        }
        e.preventDefault()
    }
    const isFileAllowedForUpload = (file) => {
        const constraints = getAllowChatFlowUploads.data
        let acceptFile = false
        if (constraints.allowUploads) {
            const fileType = file.type
            const sizeInMB = file.size / 1024 / 1024
            constraints.allowed.map((allowed) => {
                if (allowed.allowedTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
                    acceptFile = true
                }
            })
        }
        if (!acceptFile) {
            alert(`Cannot upload file. Kindly check the allowed file types and maximum allowed size.`)
        }
        return acceptFile
    }
    const handleDrop = async (e) => {
        if (!isChatFlowAvailableForUploads) {
            return
        }
        e.preventDefault()
        setIsDragOver(false)
        let files = []
        if (e.dataTransfer.files.length > 0) {
            for (const file of e.dataTransfer.files) {
                if (isFileAllowedForUpload(file) === false) {
                    return
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
                            let previewUrl
                            if (file.type.startsWith('audio/')) {
                                previewUrl = audioUploadSVG
                            } else if (file.type.startsWith('image/')) {
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
            setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
            // if (newFiles.length > 0) {
            //     document.getElementById('messagelist').style.height = '80%'
            // }
        }
        if (e.dataTransfer.items) {
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'string' && item.type.match('^text/uri-list')) {
                    item.getAsString((s) => {
                        let upload = {
                            data: s,
                            preview: s,
                            type: 'url',
                            name: s.substring(s.lastIndexOf('/') + 1)
                        }
                        setPreviews((prevPreviews) => [...prevPreviews, upload])
                    })
                } else if (item.kind === 'string' && item.type.match('^text/html')) {
                    item.getAsString((s) => {
                        if (s.indexOf('href') === -1) return
                        //extract href
                        let start = s.substring(s.indexOf('href') + 6)
                        let hrefStr = start.substring(0, start.indexOf('"'))

                        let upload = {
                            data: hrefStr,
                            preview: hrefStr,
                            type: 'url',
                            name: hrefStr.substring(hrefStr.lastIndexOf('/') + 1)
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
        for (const file of event.target.files) {
            if (isFileAllowedForUpload(file) === false) {
                return
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
        setPreviews((prevPreviews) => [...prevPreviews, ...newFiles])
        // 👇️ reset file input
        event.target.value = null
    }

    const handleDragEnter = (e) => {
        if (isChatFlowAvailableForUploads) {
            e.preventDefault()
            setIsDragOver(true)
        }
    }

    const handleDragLeave = (e) => {
        if (isChatFlowAvailableForUploads) {
            e.preventDefault()
            if (e.originalEvent?.pageX !== 0 || e.originalEvent?.pageY !== 0) {
                return false
            }
            setIsDragOver(false) // Set the drag over state to false when the drag leaves
        }
    }
    const handleDeletePreview = (itemToDelete) => {
        if (itemToDelete.type === 'file') {
            URL.revokeObjectURL(itemToDelete.preview) // Clean up for file
        }
        setPreviews(previews.filter((item) => item !== itemToDelete))
    }
    const handleUploadClick = () => {
        // 👇️ open file input box on click of another element
        fileUploadRef.current.click()
    }

    const previewStyle = {
        width: '128px',
        height: '64px',
        objectFit: 'fit' // This makes the image cover the area, cropping it if necessary
    }
    const messageImageStyle = {
        width: '128px',
        height: '128px',
        objectFit: 'cover' // This makes the image cover the area, cropping it if necessary
    }

    const clearPreviews = () => {
        // Revoke the data uris to avoid memory leaks
        previews.forEach((file) => URL.revokeObjectURL(file.preview))
        setPreviews([])
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

    // Handle errors
    const handleError = (message = 'Oops! There seems to be an error. Please try again.') => {
        message = message.replace(`Unable to parse JSON response from chat agent.\n\n`, '')
        setMessages((prevMessages) => [...prevMessages, { message, type: 'apiMessage' }])
        setLoading(false)
        setUserInput('')
        setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()

        if (userInput.trim() === '') {
            return
        }

        setLoading(true)
        const urls = []
        previews.map((item) => {
            urls.push({
                data: item.data,
                type: item.type,
                name: item.name,
                mime: item.mime
            })
        })
        clearPreviews()
        setMessages((prevMessages) => [...prevMessages, { message: userInput, type: 'userMessage', fileUploads: urls }])

        // Send user question and history to API
        try {
            const params = {
                question: userInput,
                history: messages.filter((msg) => msg.message !== 'Hi there! How can I help?'),
                chatId
            }
            if (urls) params.uploads = urls
            if (isChatFlowAvailableToStream) params.socketIOClientId = socketIOClientId

            const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, params)

            if (response.data) {
                const data = response.data

                if (!chatId) setChatId(data.chatId)

                if (!isChatFlowAvailableToStream) {
                    let text = ''
                    if (data.text) text = data.text
                    else if (data.json) text = '```json\n' + JSON.stringify(data.json, null, 2)
                    else text = JSON.stringify(data, null, 2)

                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            message: text,
                            sourceDocuments: data?.sourceDocuments,
                            usedTools: data?.usedTools,
                            fileAnnotations: data?.fileAnnotations,
                            type: 'apiMessage'
                        }
                    ])
                }
                setLocalStorageChatflow(chatflowid, data.chatId, messages)
                setLoading(false)
                setUserInput('')
                setTimeout(() => {
                    inputRef.current?.focus()
                    scrollToBottom()
                }, 100)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            handleError(errorData)
            return
        }
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

    const downloadFile = async (fileAnnotation) => {
        try {
            const response = await axios.post(
                `${baseURL}/api/v1/openai-assistants-file`,
                { fileName: fileAnnotation.fileName },
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

    // Get chatmessages successful
    useEffect(() => {
        if (getChatmessageApi.data?.length) {
            const chatId = getChatmessageApi.data[0]?.chatId
            setChatId(chatId)
            const loadedMessages = getChatmessageApi.data.map((message) => {
                const obj = {
                    message: message.content,
                    type: message.role
                }
                if (message.sourceDocuments) obj.sourceDocuments = JSON.parse(message.sourceDocuments)
                if (message.usedTools) obj.usedTools = JSON.parse(message.usedTools)
                if (message.fileAnnotations) obj.fileAnnotations = JSON.parse(message.fileAnnotations)
                if (message.fileUploads) {
                    obj.fileUploads = JSON.parse(message.fileUploads)
                    obj.fileUploads.forEach((file) => {
                        if (file.type === 'stored-file') {
                            file.data = `${baseURL}/api/v1/get-upload-file/${file.name}?chatId=${chatId}`
                        }
                    })
                }
                return obj
            })
            setMessages((prevMessages) => [...prevMessages, ...loadedMessages])
            setLocalStorageChatflow(chatflowid, chatId, messages)
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
            setIsChatFlowAvailableForUploads(getAllowChatFlowUploads.data?.allowUploads ?? false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllowChatFlowUploads.data])

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
        let socket
        if (open && chatflowid) {
            getChatmessageApi.request(chatflowid)
            getIsChatflowStreamingApi.request(chatflowid)
            getAllowChatFlowUploads.request(chatflowid)
            scrollToBottom()
            initAudioRecording()

            socket = socketIOClient(baseURL)

            socket.on('connect', () => {
                setSocketIOClientId(socket.id)
            })

            socket.on('start', () => {
                setMessages((prevMessages) => [...prevMessages, { message: '', type: 'apiMessage' }])
            })

            socket.on('sourceDocuments', updateLastMessageSourceDocuments)

            socket.on('token', updateLastMessage)
        }

        return () => {
            setUserInput('')
            setLoading(false)
            setMessages([
                {
                    message: 'Hi there! How can I help?',
                    type: 'apiMessage'
                }
            ])
            if (socket) {
                socket.disconnect()
                setSocketIOClientId('')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chatflowid])

    return (
        <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`file-drop-field`}
        >
            <div className={'audio-recording-container'}>
                <div className='recording-control-buttons-container hide'>
                    <i className='cancel-recording-button' aria-hidden='true'>
                        <IconPlayerRecord />
                    </i>
                    <div className='recording-elapsed-time'>
                        <i className='red-recording-dot' aria-hidden='true'>
                            <IconCircleDot />
                        </i>
                        <p className='elapsed-time'></p>
                    </div>
                    <i className='stop-recording-button' aria-hidden='true'>
                        <IconPlayerStop />
                    </i>
                </div>
                <div className='text-indication-of-audio-playing-container'>
                    <p className='text-indication-of-audio-playing hide'>
                        Audio is playing<span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </p>
                </div>
            </div>
            <div className='overlay hide'>
                <div className='browser-not-supporting-audio-recording-box'>
                    <p>To record audio, use browsers like Chrome and Firefox that support audio recording.</p>
                    <button type='button' className='close-browser-not-supported-box'>
                        Ok.
                    </button>
                </div>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls className='audio-element hide'></audio>
            {isDragOver && getAllowChatFlowUploads.data?.allowUploads && (
                <Box className='drop-overlay'>
                    <Typography variant='h2'>Drop here to upload</Typography>
                    {getAllowChatFlowUploads.data.allowed.map((allowed) => {
                        return (
                            <>
                                <Typography variant='subtitle1'>{allowed.allowedTypes?.join(', ')}</Typography>
                                <Typography variant='subtitle1'>Max Allowed Size: {allowed.maxUploadSize} MB</Typography>
                            </>
                        )
                    })}
                </Box>
            )}
            <div className={`${isDialog ? 'cloud-dialog' : 'cloud'}`}>
                <div ref={ps} id='messagelist' className={'messagelist'}>
                    {messages &&
                        messages.map((message, index) => {
                            return (
                                // The latest message sent by the user will be animated while waiting for a response
                                <>
                                    <Box
                                        sx={{
                                            background: message.type === 'apiMessage' ? theme.palette.asyncSelect.main : ''
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
                                        {message.type === 'apiMessage' ? (
                                            <img src={robotPNG} alt='AI' width='30' height='30' className='boticon' />
                                        ) : (
                                            <img src={userPNG} alt='Me' width='30' height='30' className='usericon' />
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                            {message.usedTools && (
                                                <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                    {message.usedTools.map((tool, index) => {
                                                        return (
                                                            <Chip
                                                                size='small'
                                                                key={index}
                                                                label={tool.tool}
                                                                component='a'
                                                                sx={{ mr: 1, mt: 1 }}
                                                                variant='outlined'
                                                                clickable
                                                                onClick={() => onSourceDialogClick(tool, 'Used Tools')}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            )}
                                            <div className='markdownanswer'>
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
                                            </div>
                                            {message.fileAnnotations && (
                                                <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                    {message.fileAnnotations.map((fileAnnotation, index) => {
                                                        return (
                                                            <Button
                                                                sx={{ fontSize: '0.85rem', textTransform: 'none', mb: 1 }}
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
                                            {message.fileUploads &&
                                                message.fileUploads.map((item, index) => {
                                                    return (
                                                        <>
                                                            {item.mime.startsWith('image/') ? (
                                                                <Card key={index} sx={{ maxWidth: 128, margin: 5 }}>
                                                                    <CardMedia
                                                                        component='img'
                                                                        image={item.data}
                                                                        sx={{ height: 64 }}
                                                                        alt={'preview'}
                                                                        style={messageImageStyle}
                                                                    />
                                                                </Card>
                                                            ) : (
                                                                // eslint-disable-next-line jsx-a11y/media-has-caption
                                                                <audio controls='controls'>
                                                                    Your browser does not support the &lt;audio&gt; tag.
                                                                    <source src={item.data} type={item.mime} />
                                                                </audio>
                                                            )}
                                                        </>
                                                    )
                                                })}
                                            {message.sourceDocuments && (
                                                <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                    {removeDuplicateURL(message).map((source, index) => {
                                                        const URL =
                                                            source.metadata && source.metadata.source
                                                                ? isValidURL(source.metadata.source)
                                                                : undefined
                                                        return (
                                                            <Chip
                                                                size='small'
                                                                key={index}
                                                                label={
                                                                    URL
                                                                        ? URL.pathname.substring(0, 15) === '/'
                                                                            ? URL.host
                                                                            : `${URL.pathname.substring(0, 15)}...`
                                                                        : `${source.pageContent.substring(0, 15)}...`
                                                                }
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
                                        </div>
                                    </Box>
                                </>
                            )
                        })}
                </div>
            </div>
            <Divider />
            <div>
                {previews && previews.length > 0 && (
                    <div className='flex-col flex'>
                        <div className='flex justify-between items-center h-[80px] px-1 py-1'>
                            <Grid container spacing={2} sx={{ mt: '2px' }}>
                                {previews.map((item, index) => (
                                    <>
                                        {item.mime.startsWith('image/') ? (
                                            <Grid item xs={6} sm={3} md={3} lg={3} key={index}>
                                                <Card key={index} sx={{ maxWidth: 128 }} variant='outlined'>
                                                    <CardMedia style={previewStyle} component='img' image={item.data} alt={'preview'} />
                                                    <CardActions className='center'>
                                                        <IconButton onClick={() => handleDeletePreview(item)} size='small'>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </CardActions>
                                                </Card>
                                            </Grid>
                                        ) : (
                                            <Grid item xs={12} sm={6} md={6} lg={6} key={index}>
                                                <Card key={index} variant='outlined'>
                                                    <CardMedia component='audio' sx={{ h: 68 }} controls src={item.data} />
                                                    <CardActions className='center'>
                                                        <IconButton onClick={() => handleDeletePreview(item)} size='small'>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </CardActions>
                                                </Card>
                                            </Grid>
                                        )}
                                    </>
                                ))}
                            </Grid>
                        </div>
                    </div>
                )}
            </div>
            <div className='center'>
                <div style={{ width: '100%' }}>
                    <form style={{ width: '100%' }} onSubmit={handleSubmit}>
                        <OutlinedInput
                            inputRef={inputRef}
                            // eslint-disable-next-line
                        autoFocus
                            sx={{ width: '100%' }}
                            disabled={loading || !chatflowid}
                            onKeyDown={handleEnter}
                            id='userInput'
                            name='userInput'
                            placeholder={loading ? 'Waiting for response...' : 'Type your question...'}
                            value={userInput}
                            onChange={onChange}
                            multiline={true}
                            maxRows={isDialog ? 7 : 2}
                            startAdornment={
                                isChatFlowAvailableForUploads && (
                                    <InputAdornment position='start' sx={{ padding: '15px' }}>
                                        <IconButton
                                            onClick={handleUploadClick}
                                            type='button'
                                            disabled={loading || !chatflowid}
                                            edge='start'
                                        >
                                            <IconPhotoPlus
                                                color={loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                            />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                            endAdornment={
                                <>
                                    {isChatFlowAvailableForUploads && (
                                        <InputAdornment className={'start-recording-button'} position='end'>
                                            <IconButton type='button' disabled={loading || !chatflowid} edge='end'>
                                                <IconMicrophone
                                                    color={
                                                        loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'
                                                    }
                                                />
                                            </IconButton>
                                        </InputAdornment>
                                    )}
                                    <InputAdornment position='end' sx={{ padding: '15px' }}>
                                        <IconButton type='submit' disabled={loading || !chatflowid} edge='end'>
                                            {loading ? (
                                                <div>
                                                    <CircularProgress color='inherit' size={20} />
                                                </div>
                                            ) : (
                                                // Send icon SVG in input field
                                                <IconSend
                                                    color={
                                                        loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'
                                                    }
                                                />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                </>
                            }
                        />
                        {isChatFlowAvailableForUploads && (
                            <input style={{ display: 'none' }} ref={fileUploadRef} type='file' onChange={handleFileChange} />
                        )}
                    </form>
                </div>
            </div>

            <SourceDocDialog show={sourceDialogOpen} dialogProps={sourceDialogProps} onCancel={() => setSourceDialogOpen(false)} />
        </div>
    )
}

ChatMessage.propTypes = {
    open: PropTypes.bool,
    chatflowid: PropTypes.string,
    isDialog: PropTypes.bool
}

// audio-recording.js ---------------
//View
let microphoneButton = document.getElementsByClassName('start-recording-button')[0]
let recordingControlButtonsContainer = document.getElementsByClassName('recording-control-buttons-container')[0]
let stopRecordingButton = document.getElementsByClassName('stop-recording-button')[0]
let cancelRecordingButton = document.getElementsByClassName('cancel-recording-button')[0]
let elapsedTimeTag = document.getElementsByClassName('elapsed-time')[0]
let closeBrowserNotSupportedBoxButton = document.getElementsByClassName('close-browser-not-supported-box')[0]
let overlay = document.getElementsByClassName('overlay')[0]
let audioElement = document.getElementsByClassName('audio-element')[0]
let audioElementSource = audioElement?.getElementsByTagName('source')[0]
let textIndicatorOfAudiPlaying = document.getElementsByClassName('text-indication-of-audio-playing')[0]

const initAudioRecording = () => {
    microphoneButton = document.getElementsByClassName('start-recording-button')[0]
    recordingControlButtonsContainer = document.getElementsByClassName('recording-control-buttons-container')[0]
    stopRecordingButton = document.getElementsByClassName('stop-recording-button')[0]
    cancelRecordingButton = document.getElementsByClassName('cancel-recording-button')[0]
    elapsedTimeTag = document.getElementsByClassName('elapsed-time')[0]
    closeBrowserNotSupportedBoxButton = document.getElementsByClassName('close-browser-not-supported-box')[0]
    overlay = document.getElementsByClassName('overlay')[0]
    audioElement = document.getElementsByClassName('audio-element')[0]
    audioElementSource = audioElement?.getElementsByTagName('source')[0]
    textIndicatorOfAudiPlaying = document.getElementsByClassName('text-indication-of-audio-playing')[0]
    //Listeners

    //Listen to start recording button
    if (microphoneButton) microphoneButton.onclick = startAudioRecording

    //Listen to stop recording button
    if (stopRecordingButton) stopRecordingButton.onclick = stopAudioRecording

    //Listen to cancel recording button
    if (cancelRecordingButton) cancelRecordingButton.onclick = cancelAudioRecording

    //Listen to when the ok button is clicked in the browser not supporting audio recording box
    if (closeBrowserNotSupportedBoxButton) closeBrowserNotSupportedBoxButton.onclick = hideBrowserNotSupportedOverlay

    //Listen to when the audio being played ends
    if (audioElement) audioElement.onended = hideTextIndicatorOfAudioPlaying
}

/** Displays recording control buttons */
function handleDisplayingRecordingControlButtons() {
    //Hide the microphone button that starts audio recording
    microphoneButton.style.display = 'none'

    //Display the recording control buttons
    recordingControlButtonsContainer.classList.remove('hide')

    //Handle the displaying of the elapsed recording time
    handleElapsedRecordingTime()
}

/** Hide the displayed recording control buttons */
function handleHidingRecordingControlButtons() {
    //Display the microphone button that starts audio recording
    microphoneButton.style.display = 'block'

    //Hide the recording control buttons
    recordingControlButtonsContainer.classList.add('hide')

    //stop interval that handles both time elapsed and the red dot
    clearInterval(elapsedTimeTimer)
}

/** Displays browser not supported info box for the user*/
function displayBrowserNotSupportedOverlay() {
    overlay.classList.remove('hide')
}

/** Displays browser not supported info box for the user*/
function hideBrowserNotSupportedOverlay() {
    overlay.classList.add('hide')
}

/** Creates a source element for the audio element in the HTML document*/
function createSourceForAudioElement() {
    let sourceElement = document.createElement('source')
    audioElement.appendChild(sourceElement)

    audioElementSource = sourceElement
}

/** Display the text indicator of the audio being playing in the background */
function displayTextIndicatorOfAudioPlaying() {
    textIndicatorOfAudiPlaying.classList.remove('hide')
}

/** Hide the text indicator of the audio being playing in the background */
function hideTextIndicatorOfAudioPlaying() {
    textIndicatorOfAudiPlaying.classList.add('hide')
}

//Controller

/** Stores the actual start time when an audio recording begins to take place to ensure elapsed time start time is accurate*/
let audioRecordStartTime

/** Stores the maximum recording time in hours to stop recording once maximum recording hour has been reached */
let maximumRecordingTimeInHours = 1

/** Stores the reference of the setInterval function that controls the timer in audio recording*/
let elapsedTimeTimer

/** Starts the audio recording*/
function startAudioRecording() {
    console.log('Recording Audio...')

    //If a previous audio recording is playing, pause it
    let recorderAudioIsPlaying = !audioElement.paused // the paused property tells whether the media element is paused or not
    console.log('paused?', !recorderAudioIsPlaying)
    if (recorderAudioIsPlaying) {
        audioElement.pause()
        //also hide the audio playing indicator displayed on the screen
        hideTextIndicatorOfAudioPlaying()
    }

    //start recording using the audio recording API
    audioRecorder
        .start()
        .then(() => {
            //on success

            //store the recording start time to display the elapsed time according to it
            audioRecordStartTime = new Date()

            //display control buttons to offer the functionality of stop and cancel
            handleDisplayingRecordingControlButtons()
        })
        .catch((error) => {
            //on error
            //No Browser Support Error
            if (error.message.includes('mediaDevices API or getUserMedia method is not supported in this browser.')) {
                console.log('To record audio, use browsers like Chrome and Firefox.')
                displayBrowserNotSupportedOverlay()
            }

            //Error handling structure
            switch (error.name) {
                case 'AbortError': //error from navigator.mediaDevices.getUserMedia
                    console.log('An AbortError has occurred.')
                    break
                case 'NotAllowedError': //error from navigator.mediaDevices.getUserMedia
                    console.log('A NotAllowedError has occurred. User might have denied permission.')
                    break
                case 'NotFoundError': //error from navigator.mediaDevices.getUserMedia
                    console.log('A NotFoundError has occurred.')
                    break
                case 'NotReadableError': //error from navigator.mediaDevices.getUserMedia
                    console.log('A NotReadableError has occurred.')
                    break
                case 'SecurityError': //error from navigator.mediaDevices.getUserMedia or from the MediaRecorder.start
                    console.log('A SecurityError has occurred.')
                    break
                case 'TypeError': //error from navigator.mediaDevices.getUserMedia
                    console.log('A TypeError has occurred.')
                    break
                case 'InvalidStateError': //error from the MediaRecorder.start
                    console.log('An InvalidStateError has occurred.')
                    break
                case 'UnknownError': //error from the MediaRecorder.start
                    console.log('An UnknownError has occurred.')
                    break
                default:
                    console.log('An error occurred with the error name ' + error.name)
            }
        })
}
/** Stop the currently started audio recording & sends it
 */
function stopAudioRecording() {
    console.log('Stopping Audio Recording...')

    //stop the recording using the audio recording API
    audioRecorder
        .stop()
        .then((audioAsblob) => {
            //Play recorder audio
            playAudio(audioAsblob)

            //hide recording control button & return record icon
            handleHidingRecordingControlButtons()
        })
        .catch((error) => {
            //Error handling structure
            switch (error.name) {
                case 'InvalidStateError': //error from the MediaRecorder.stop
                    console.log('An InvalidStateError has occurred.')
                    break
                default:
                    console.log('An error occurred with the error name ' + error.name)
            }
        })
}

/** Cancel the currently started audio recording */
function cancelAudioRecording() {
    console.log('Canceling audio...')

    //cancel the recording using the audio recording API
    audioRecorder.cancel()

    //hide recording control button & return record icon
    handleHidingRecordingControlButtons()
}

/** Plays recorded audio using the audio element in the HTML document
 * @param {Blob} recorderAudioAsBlob - recorded audio as a Blob Object
 */
function playAudio(recorderAudioAsBlob) {
    //read content of files (Blobs) asynchronously
    let reader = new FileReader()

    //once content has been read
    reader.onload = (e) => {
        //store the base64 URL that represents the URL of the recording audio
        let base64URL = e.target.result

        //If this is the first audio playing, create a source element
        //as pre-populating the HTML with a source of empty src causes error
        if (!audioElementSource)
            //if it is not defined create it (happens first time only)
            createSourceForAudioElement()

        //set the audio element's source using the base64 URL
        audioElementSource.src = base64URL

        //set the type of the audio element based on the recorded audio's Blob type
        let BlobType = recorderAudioAsBlob.type.includes(';')
            ? recorderAudioAsBlob.type.substr(0, recorderAudioAsBlob.type.indexOf(';'))
            : recorderAudioAsBlob.type
        audioElementSource.type = BlobType

        //call the load method as it is used to update the audio element after changing the source or other settings
        audioElement.load()

        //play the audio after successfully setting new src and type that corresponds to the recorded audio
        console.log('Playing audio...')
        audioElement.play()

        //Display text indicator of having the audio play in the background
        displayTextIndicatorOfAudioPlaying()
    }

    //read content and convert it to a URL (base64)
    reader.readAsDataURL(recorderAudioAsBlob)
}

/** Computes the elapsed recording time since the moment the function is called in the format h:m:s*/
function handleElapsedRecordingTime() {
    //display initial time when recording begins
    displayElapsedTimeDuringAudioRecording('00:00')

    //create an interval that compute & displays elapsed time, as well as, animate red dot - every second
    elapsedTimeTimer = setInterval(() => {
        //compute the elapsed time every second
        let elapsedTime = computeElapsedTime(audioRecordStartTime) //pass the actual record start time
        //display the elapsed time
        displayElapsedTimeDuringAudioRecording(elapsedTime)
    }, 1000) //every second
}

/** Display elapsed time during audio recording
 * @param {String} elapsedTime - elapsed time in the format mm:ss or hh:mm:ss
 */
function displayElapsedTimeDuringAudioRecording(elapsedTime) {
    //1. display the passed elapsed time as the elapsed time in the elapsedTime HTML element
    elapsedTimeTag.innerHTML = elapsedTime

    //2. Stop the recording when the max number of hours is reached
    if (elapsedTimeReachedMaximumNumberOfHours(elapsedTime)) {
        stopAudioRecording()
    }
}

/**
 * @param {String} elapsedTime - elapsed time in the format mm:ss or hh:mm:ss
 * @returns {Boolean} whether the elapsed time reached the maximum number of hours or not
 */
function elapsedTimeReachedMaximumNumberOfHours(elapsedTime) {
    //Split the elapsed time by the symbol that separates the hours, minutes and seconds :
    let elapsedTimeSplit = elapsedTime.split(':')

    //Turn the maximum recording time in hours to a string and pad it with zero if less than 10
    let maximumRecordingTimeInHoursAsString =
        maximumRecordingTimeInHours < 10 ? '0' + maximumRecordingTimeInHours : maximumRecordingTimeInHours.toString()

    //if the elapsed time reach hours and also reach the maximum recording time in hours return true
    if (elapsedTimeSplit.length === 3 && elapsedTimeSplit[0] === maximumRecordingTimeInHoursAsString) return true
    //otherwise, return false
    else return false
}

/** Computes the elapsedTime since the moment the function is called in the format mm:ss or hh:mm:ss
 * @param {String} startTime - start time to compute the elapsed time since
 * @returns {String} elapsed time in mm:ss format or hh:mm:ss format, if elapsed hours are 0.
 */
function computeElapsedTime(startTime) {
    //record end time
    let endTime = new Date()

    //time difference in ms
    let timeDiff = endTime - startTime

    //convert time difference from ms to seconds
    timeDiff = timeDiff / 1000

    //extract integer seconds that don't form a minute using %
    let seconds = Math.floor(timeDiff % 60) //ignoring incomplete seconds (floor)

    //pad seconds with a zero if necessary
    seconds = seconds < 10 ? '0' + seconds : seconds

    //convert time difference from seconds to minutes using %
    timeDiff = Math.floor(timeDiff / 60)

    //extract integer minutes that don't form an hour using %
    let minutes = timeDiff % 60 //no need to floor possible incomplete minutes, because they've been handled as seconds
    minutes = minutes < 10 ? '0' + minutes : minutes

    //convert time difference from minutes to hours
    timeDiff = Math.floor(timeDiff / 60)

    //extract integer hours that don't form a day using %
    let hours = timeDiff % 24 //no need to floor possible incomplete hours, because they've been handled as seconds

    //convert time difference from hours to days
    timeDiff = Math.floor(timeDiff / 24)

    // the rest of timeDiff is number of days
    let days = timeDiff //add days to hours

    let totalHours = hours + days * 24
    totalHours = totalHours < 10 ? '0' + totalHours : totalHours

    if (totalHours === '00') {
        return minutes + ':' + seconds
    } else {
        return totalHours + ':' + minutes + ':' + seconds
    }
}

//API to handle audio recording

const audioRecorder = {
    /** Stores the recorded audio as Blob objects of audio data as the recording continues*/
    audioBlobs: [] /*of type Blob[]*/,
    /** Stores the reference of the MediaRecorder instance that handles the MediaStream when recording starts*/
    mediaRecorder: null /*of type MediaRecorder*/,
    /** Stores the reference to the stream currently capturing the audio*/
    streamBeingCaptured: null /*of type MediaStream*/,
    /** Start recording the audio
     * @returns {Promise} - returns a promise that resolves if audio recording successfully started
     */
    start: function () {
        //Feature Detection
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            //Feature is not supported in browser
            //return a custom error
            return Promise.reject(new Error('mediaDevices API or getUserMedia method is not supported in this browser.'))
        } else {
            //Feature is supported in browser

            //create an audio stream
            return (
                navigator.mediaDevices
                    .getUserMedia({ audio: true } /*of type MediaStreamConstraints*/)
                    //returns a promise that resolves to the audio stream
                    .then((stream) /*of type MediaStream*/ => {
                        //save the reference of the stream to be able to stop it when necessary
                        audioRecorder.streamBeingCaptured = stream

                        //create a media recorder instance by passing that stream into the MediaRecorder constructor
                        audioRecorder.mediaRecorder = new MediaRecorder(stream) /*the MediaRecorder interface of the MediaStream Recording
                    API provides functionality to easily record media*/

                        //clear previously saved audio Blobs, if any
                        audioRecorder.audioBlobs = []

                        //add a dataavailable event listener in order to store the audio data Blobs when recording
                        audioRecorder.mediaRecorder.addEventListener('dataavailable', (event) => {
                            //store audio Blob object
                            audioRecorder.audioBlobs.push(event.data)
                        })

                        //start the recording by calling the start method on the media recorder
                        audioRecorder.mediaRecorder.start()
                    })
            )

            /* errors are not handled in the API because if its handled and the promise is chained, the .then after the catch will be executed*/
        }
    },
    /** Stop the started audio recording
     * @returns {Promise} - returns a promise that resolves to the audio as a blob file
     */
    stop: function () {
        //return a promise that would return the blob or URL of the recording
        return new Promise((resolve) => {
            //save audio type to pass to set the Blob type
            let mimeType = audioRecorder.mediaRecorder.mimeType

            //listen to the stop event in order to create & return a single Blob object
            audioRecorder.mediaRecorder.addEventListener('stop', () => {
                //create a single blob object, as we might have gathered a few Blob objects that needs to be joined as one
                let audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType })

                //resolve promise with the single audio blob representing the recorded audio
                resolve(audioBlob)
            })
            audioRecorder.cancel()
        })
    },
    /** Cancel audio recording*/
    cancel: function () {
        //stop the recording feature
        audioRecorder.mediaRecorder.stop()

        //stop all the tracks on the active stream in order to stop the stream
        audioRecorder.stopStream()

        //reset API properties for next recording
        audioRecorder.resetRecordingProperties()
    },
    /** Stop all the tracks on the active stream in order to stop the stream and remove
     * the red flashing dot showing in the tab
     */
    stopStream: function () {
        //stopping the capturing request by stopping all the tracks on the active stream
        audioRecorder.streamBeingCaptured
            .getTracks() //get all tracks from the stream
            .forEach((track) /*of type MediaStreamTrack*/ => track.stop()) //stop each one
    },
    /** Reset all the recording properties including the media recorder and stream being captured*/
    resetRecordingProperties: function () {
        audioRecorder.mediaRecorder = null
        audioRecorder.streamBeingCaptured = null

        /*No need to remove event listeners attached to mediaRecorder as
    If a DOM element which is removed is reference-free (no references pointing to it), the element itself is picked
    up by the garbage collector as well as any event handlers/listeners associated with it.
    getEventListeners(audioRecorder.mediaRecorder) will return an empty array of events.*/
    }
}
