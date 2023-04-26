import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ReactMarkdown from 'react-markdown'
import PropTypes from 'prop-types'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

import {
    ClickAwayListener,
    Paper,
    Popper,
    CircularProgress,
    OutlinedInput,
    Divider,
    InputAdornment,
    IconButton,
    Box,
    Button
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconMessage, IconX, IconSend, IconEraser } from '@tabler/icons'

// project import
import { StyledFab } from 'ui-component/button/StyledFab'
import MainCard from 'ui-component/cards/MainCard'
import Transitions from 'ui-component/extended/Transitions'
import './ChatMessage.css'

// api
import chatmessageApi from 'api/chatmessage'
import predictionApi from 'api/prediction'

// Hooks
import useApi from 'hooks/useApi'
import useConfirm from 'hooks/useConfirm'
import useNotifier from 'utils/useNotifier'

import { maxScroll } from 'store/constant'

export const ChatMessage = ({ chatflowid }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    const ps = useRef()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [open, setOpen] = useState(false)
    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            message: 'Hi there! How can I help?',
            type: 'apiMessage'
        }
    ])

    const inputRef = useRef(null)
    const anchorRef = useRef(null)
    const prevOpen = useRef(open)
    const getChatmessageApi = useApi(chatmessageApi.getChatmessageFromChatflow)

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const clearChat = async () => {
        const confirmPayload = {
            title: `Clear Chat History`,
            description: `Are you sure you want to clear all chat history?`,
            confirmButtonName: 'Clear',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatmessageApi.deleteChatmessage(chatflowid)
                enqueueSnackbar({
                    message: 'Succesfully cleared all chat history',
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

    const scrollToBottom = () => {
        if (ps.current) {
            ps.current.scrollTo({ top: maxScroll, behavior: 'smooth' })
        }
    }

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

    // Handle errors
    const handleError = (message = 'Oops! There seems to be an error. Please try again.') => {
        message = message.replace(`Unable to parse JSON response from chat agent.\n\n`, '')
        setMessages((prevMessages) => [...prevMessages, { message, type: 'apiMessage' }])
        addChatMessage(message, 'apiMessage')
        setLoading(false)
        setUserInput('')
        setTimeout(() => {
            inputRef.current.focus()
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
        addChatMessage(userInput, 'userMessage')

        // Send user question and history to API
        try {
            const response = await predictionApi.sendMessageAndGetPrediction(chatflowid, {
                question: userInput,
                history: messages.filter((msg) => msg.message !== 'Hi there! How can I help?')
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

    // Auto scroll chat to bottom
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        if (open && chatflowid) {
            getChatmessageApi.request(chatflowid)
            scrollToBottom()
        }

        prevOpen.current = open

        return () => {
            setUserInput('')
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

    return (
        <>
            <StyledFab
                sx={{ position: 'absolute', right: 20, top: 20 }}
                ref={anchorRef}
                size='small'
                color='secondary'
                aria-label='chat'
                title='Chat'
                onClick={handleToggle}
            >
                {open ? <IconX /> : <IconMessage />}
            </StyledFab>
            {open && (
                <StyledFab
                    sx={{ position: 'absolute', right: 80, top: 20 }}
                    onClick={clearChat}
                    size='small'
                    color='error'
                    aria-label='clear'
                    title='Clear Chat History'
                >
                    <IconEraser />
                </StyledFab>
            )}
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [40, 14]
                            }
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
        </>
    )
}

ChatMessage.propTypes = { chatflowid: PropTypes.string }
