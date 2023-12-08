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
import { IconDownload, IconSend, IconUpload } from '@tabler/icons'

// project import
import { CodeBlock } from 'ui-component/markdown/CodeBlock'
import { MemoizedReactMarkdown } from 'ui-component/markdown/MemoizedReactMarkdown'
import SourceDocDialog from 'ui-component/dialog/SourceDocDialog'
import './ChatMessage.css'

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
        objectFit: 'cover' // This makes the image cover the area, cropping it if necessary
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
                                                        <Card key={index} sx={{ maxWidth: 128, margin: 5 }}>
                                                            <CardMedia
                                                                component='img'
                                                                image={item.data}
                                                                sx={{ height: 64 }}
                                                                alt={'preview'}
                                                                style={messageImageStyle}
                                                            />
                                                        </Card>
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
                                            <IconUpload
                                                color={loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                            />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                            endAdornment={
                                <InputAdornment position='end' sx={{ padding: '15px' }}>
                                    <IconButton type='submit' disabled={loading || !chatflowid} edge='end'>
                                        {loading ? (
                                            <div>
                                                <CircularProgress color='inherit' size={20} />
                                            </div>
                                        ) : (
                                            // Send icon SVG in input field
                                            <IconSend
                                                color={loading || !chatflowid ? '#9e9e9e' : customization.isDarkMode ? 'white' : '#1e88e5'}
                                            />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            }
                        />
                        {isChatFlowAvailableForUploads && (
                            <input style={{ display: 'none' }} ref={fileUploadRef} type='file' onChange={handleFileChange} />
                        )}
                    </form>
                </div>
            </div>
            <div className='preview-container'>
                {previews && previews.length > 0 && (
                    <Grid container spacing={2} sx={{ p: 1, mt: '5px', ml: '1px' }}>
                        {previews.map((item, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Card variant='outlined' sx={{ maxWidth: 128 }}>
                                    <CardMedia
                                        component='img'
                                        image={item.preview}
                                        sx={{ height: 64 }}
                                        alt={`preview ${index}`}
                                        style={previewStyle}
                                    />
                                    <CardActions className='center' sx={{ p: 0, m: 0 }}>
                                        <Button
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleDeletePreview(item)}
                                            size='small'
                                            variant='text'
                                        />
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
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
