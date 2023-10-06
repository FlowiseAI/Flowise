import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import socketIOClient from 'socket.io-client'
import { cloneDeep } from 'lodash'
import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { CircularProgress, OutlinedInput, Divider, InputAdornment, IconButton, Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSend } from '@tabler/icons'

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
import { isValidURL } from 'utils/genericHelper'

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

    const inputRef = useRef(null)
    const getChatmessageApi = useApi(chatmessageApi.getChatmessageFromChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)

    const onSourceDialogClick = (data) => {
        setSourceDialogProps({ data })
        setSourceDialogOpen(true)
    }

    const onURLClick = (data) => {
        window.open(data, '_blank')
    }

    const handleVectaraMetadata = (message) => {
        if (message.sourceDocuments && message.sourceDocuments[0].metadata.length)
            message.sourceDocuments = message.sourceDocuments.map((docs) => {
                const newMetadata = docs.metadata.reduce((newMetadata, metadata) => {
                    newMetadata[metadata.name] = metadata.value
                    return newMetadata
                }, {})
                return {
                    pageContent: docs.pageContent,
                    metadata: newMetadata
                }
            })
        return message
    }

    const removeDuplicateURL = (message) => {
        const visitedURLs = []
        const newSourceDocuments = []

        message = handleVectaraMetadata(message)

        message.sourceDocuments.forEach((source) => {
            if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
                visitedURLs.push(source.metadata.source)
                newSourceDocuments.push(source)
            } else if (!isValidURL(source.metadata.source)) {
                newSourceDocuments.push(source)
            }
        })
        return newSourceDocuments
    }

    const scrollToBottom = () => {
        if (ps.current) {
            ps.current.scrollTo({ top: maxScroll })
        }
    }

    const onChange = useCallback((e) => setUserInput(e.target.value), [setUserInput])

    const addChatMessage = async (message, type, sourceDocuments) => {
        try {
            const newChatMessageBody = {
                role: type,
                content: message,
                chatflowid: chatflowid
            }
            if (sourceDocuments) newChatMessageBody.sourceDocuments = JSON.stringify(sourceDocuments)
            await chatmessageApi.createNewChatmessage(chatflowid, newChatMessageBody)
        } catch (error) {
            console.error(error)
        }
    }

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
        addChatMessage(message, 'apiMessage')
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
        setMessages((prevMessages) => [...prevMessages, { message: userInput, type: 'userMessage' }])
        // waiting for first chatmessage saved, the first chatmessage will be used in sendMessageAndGetPrediction
        await addChatMessage(userInput, 'userMessage')

        // Send user question and history to API
        try {
            const params = {
                question: userInput,
                history: messages.filter((msg) => msg.message !== 'Hi there! How can I help?')
            }
            if (isChatFlowAvailableToStream) params.socketIOClientId = socketIOClientId

            const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, params)

            if (response.data) {
                let data = response.data

                data = handleVectaraMetadata(data)

                if (typeof data === 'object' && data.text && data.sourceDocuments) {
                    if (!isChatFlowAvailableToStream) {
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            { message: data.text, sourceDocuments: data.sourceDocuments, type: 'apiMessage' }
                        ])
                    }
                    addChatMessage(data.text, 'apiMessage', data.sourceDocuments)
                } else {
                    if (!isChatFlowAvailableToStream) {
                        setMessages((prevMessages) => [...prevMessages, { message: data, type: 'apiMessage' }])
                    }
                    addChatMessage(data, 'apiMessage')
                }
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

    // Get chatmessages successful
    useEffect(() => {
        if (getChatmessageApi.data) {
            const loadedMessages = []
            for (const message of getChatmessageApi.data) {
                const obj = {
                    message: message.content,
                    type: message.role
                }
                if (message.sourceDocuments) obj.sourceDocuments = JSON.parse(message.sourceDocuments)
                loadedMessages.push(obj)
            }
            setMessages((prevMessages) => [...prevMessages, ...loadedMessages])
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
        <>
            <div className={isDialog ? 'cloud-dialog' : 'cloud'}>
                <div ref={ps} className='messagelist'>
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
                                            <div className='markdownanswer'>
                                                {/* Messages are being rendered in Markdown format */}
                                                <MemoizedReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[rehypeMathjax]}
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
                                            {message.sourceDocuments && (
                                                <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                    {removeDuplicateURL(message).map((source, index) => {
                                                        const URL = isValidURL(source.metadata.source)
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
                    </form>
                </div>
            </div>
            <SourceDocDialog show={sourceDialogOpen} dialogProps={sourceDialogProps} onCancel={() => setSourceDialogOpen(false)} />
        </>
    )
}

ChatMessage.propTypes = {
    open: PropTypes.bool,
    chatflowid: PropTypes.string,
    isDialog: PropTypes.bool
}
