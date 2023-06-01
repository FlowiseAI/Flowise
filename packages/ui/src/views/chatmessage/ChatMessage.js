import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import socketIOClient from 'socket.io-client'
import { cloneDeep } from 'lodash'
import rehypeMathjax from 'rehype-mathjax'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { CircularProgress, OutlinedInput, Divider, InputAdornment, IconButton, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
<<<<<<< HEAD
import { IconMessage, IconX, IconSend, IconEraser, IconFile } from '@tabler/icons'
=======
import { IconSend } from '@tabler/icons'
>>>>>>> 5af2c3ba7b7671657e01390b411b243bba4f36de

// project import
import { CodeBlock } from 'ui-component/markdown/CodeBlock'
import { MemoizedReactMarkdown } from 'ui-component/markdown/MemoizedReactMarkdown'
import './ChatMessage.css'

// api
import chatmessageApi from 'api/chatmessage'
import chatflowsApi from 'api/chatflows'
import predictionApi from 'api/prediction'

// Hooks
import useApi from 'hooks/useApi'

<<<<<<< HEAD
import { maxScroll } from 'store/constant'
import { add } from 'lodash'
=======
// Const
import { baseURL, maxScroll } from 'store/constant'
>>>>>>> 5af2c3ba7b7671657e01390b411b243bba4f36de

export const ChatMessage = ({ open, chatflowid, isDialog }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const ps = useRef()

    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            message: '我是钉钉AI助手，可有什么以帮助你吗?',
            type: 'apiMessage'
        }
    ])
    const [socketIOClientId, setSocketIOClientId] = useState('')
    const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = useState(false)

    const inputRef = useRef(null)
    const getChatmessageApi = useApi(chatmessageApi.getChatmessageFromChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)

    const scrollToBottom = () => {
        if (ps.current) {
            ps.current.scrollTo({ top: maxScroll })
        }
    }

    const onChange = useCallback((e) => setUserInput(e.target.value), [setUserInput])

    const addChatMessage = async (message, type) => {
        try {
            const newChatMessageBody = {
                role: type,
                content: message,
                chatflowid: chatflowid
            }
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

    const uploadFile = async (e) => {
        setLoading(true)

        const file = e.target.files[0]
        const { data, status } = await chatmessageApi.uploadFile(file)
        if (status !== 200) return
        console.log('res', data)
        // const displayMessage = `上传文件成功！,文件路径是： ${data.path}。`
        const message = `请记住：用户上传了一个文件，文件路径是： ${data.path}。`
        setMessages((prevMessages) => [...prevMessages, { message: message, type: 'userMessage' }])
        addChatMessage(message, 'userMessage')
        try {
            console.log('messages', messages)
            const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, {
                question: message,
                history: messages.filter((msg) => msg.message !== '我是钉钉AI助手，可有什么以帮助你吗?')
            })
            if (response.data) {
                const data = response.data
                setMessages((prevMessages) => [...prevMessages, { message: data, type: 'apiMessage' }])
                addChatMessage(data, 'apiMessage')
                setLoading(false)
                setUserInput('')
                setTimeout(() => {
                    inputRef.current.focus()
                    scrollToBottom()
                }, 100)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            handleError(errorData)
            return
        }
    }
    // 使用chatmessageApi上传文件，拿到地址，然后生成一个userMessage
    const handleUploadFile = async () => {
        const input = document.getElementById('file')
        console.log('input', input)
        input.addEventListener('change', uploadFile, false)
        input.click()
        // input.removeEventListener('change', uploadFile, false)
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()

        if (userInput.trim() === '') {
            return
        }

        setLoading(true)
        setMessages((prevMessages) => [...prevMessages, { message: userInput, type: 'userMessage' }])
        addChatMessage(userInput, 'userMessage')

        // Send user question and history to API
        try {
            const params = {
                question: userInput,
                history: messages.filter((msg) => msg.message !== '我是钉钉AI助手，可有什么以帮助你吗?')
            }
            if (isChatFlowAvailableToStream) params.socketIOClientId = socketIOClientId

            const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, params)

            if (response.data) {
                const data = response.data
                if (!isChatFlowAvailableToStream) setMessages((prevMessages) => [...prevMessages, { message: data, type: 'apiMessage' }])
                addChatMessage(data, 'apiMessage')
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
        if (e.key === 'Enter' && userInput) {
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
                loadedMessages.push({
                    message: message.content,
                    type: message.role
                })
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

            socket.on('token', updateLastMessage)
        }

        return () => {
            setUserInput('')
            setLoading(false)
            setMessages([
                {
                    message: '我是钉钉AI助手，可有什么以帮助你吗?',
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
                                        <img
                                            src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                                            alt='AI'
                                            width='30'
                                            height='30'
                                            className='boticon'
                                        />
                                    ) : (
                                        <img
                                            src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                                            alt='Me'
                                            width='30'
                                            height='30'
                                            className='usericon'
                                        />
                                    )}
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
                                </Box>
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
                            endAdornment={
                                <InputAdornment position='end'>
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
<<<<<<< HEAD
                        }
                    ]
                }}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    <div className='cloud'>
                                        <div ref={ps} className='messagelist'>
                                            {messages.map((message, index) => {
                                                return (
                                                    // The latest message sent by the user will be animated while waiting for a response
                                                    <Box
                                                        sx={{
                                                            background: message.type === 'apiMessage' ? theme.palette.asyncSelect.main : ''
                                                        }}
                                                        key={index}
                                                        style={{ display: 'flex', alignItems: 'center' }}
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
                                                            <img
                                                                src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                                                                alt='AI'
                                                                width='30'
                                                                height='30'
                                                                className='boticon'
                                                            />
                                                        ) : (
                                                            <img
                                                                src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                                                                alt='Me'
                                                                width='30'
                                                                height='30'
                                                                className='usericon'
                                                            />
                                                        )}
                                                        <div className='markdownanswer'>
                                                            {/* Messages are being rendered in Markdown format */}
                                                            <ReactMarkdown linkTarget={'_blank'}>{message.message}</ReactMarkdown>
                                                        </div>
                                                    </Box>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <Divider />
                                    <div className='center'>
                                        <div style={{ width: '100%' }}>
                                            <form style={{ width: '100%' }} onSubmit={handleSubmit}>
                                                <input id='file' type='file' style={{ display: 'none' }} />
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
                                                    onChange={(e) => setUserInput(e.target.value)}
                                                    endAdornment={
                                                        <InputAdornment position='end'>
                                                            <IconFile onClick={handleUploadFile} />
                                                            <IconButton type='submit' disabled={loading || !chatflowid} edge='end'>
                                                                {loading ? (
                                                                    <div>
                                                                        <CircularProgress color='inherit' size={20} />
                                                                    </div>
                                                                ) : (
                                                                    // Send icon SVG in input field
                                                                    <IconSend
                                                                        color={
                                                                            loading || !chatflowid
                                                                                ? '#9e9e9e'
                                                                                : customization.isDarkMode
                                                                                ? 'white'
                                                                                : '#1e88e5'
                                                                        }
                                                                    />
                                                                )}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    }
                                                />
                                            </form>
                                        </div>
                                    </div>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
=======
                        />
                    </form>
                </div>
            </div>
>>>>>>> 5af2c3ba7b7671657e01390b411b243bba4f36de
        </>
    )
}

ChatMessage.propTypes = {
    open: PropTypes.bool,
    chatflowid: PropTypes.string,
    isDialog: PropTypes.bool
}
