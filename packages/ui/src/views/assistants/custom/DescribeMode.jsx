import { cloneDeep } from 'lodash'
import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// Material-UI
import { IconButton, Box, Button, OutlinedInput, Stack, Typography } from '@mui/material'
import { useTheme, darken } from '@mui/material/styles'

// Project imports
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'

// Utils
import { initNode, showHideInputParams } from '@/utils/genericHelper'

// Const

// Icons
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'

// Whitelist of params to show in model config
const MODEL_PARAM_WHITELIST = ['credential', 'model', 'modelName', 'customModel', 'customModelName']

// Mock questions for the describe flow
const MOCK_QUESTIONS = [
    {
        text: 'Which tools or integrations should your agent have access to?',
        options: ['Web Search', 'Code Interpreter', 'File Upload / Retrieval', 'Something else']
    },
    {
        text: 'How should the agent respond — concise and direct, or detailed and explanatory?',
        options: ['Concise and direct', 'Detailed and explanatory', 'Adaptive based on query', 'Not sure']
    }
]

const DescribeMode = ({
    selectedChatModel,
    setSelectedChatModel,
    chatModelsComponents,
    chatModelsOptions,
    handleChatModelDataChange,
    setAgentName,
    setCustomAssistantInstruction,
    setCreationMode,
    modelConfirmed,
    setModelConfirmed,
    generateTask,
    defaultConfigResolved = true
}) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [describeInput, setDescribeInput] = useState('')
    const [chatMessages, setChatMessages] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isTyping, setIsTyping] = useState(false)
    const [showScrollButton, setShowScrollButton] = useState(false)

    const chatEndRef = useRef(null)
    const chatContainerRef = useRef(null)
    const isUserNearBottom = useRef(true)
    const isFirstMessage = useRef(true)

    // ==============================|| Scroll Helpers ||============================== //

    const scrollToBottom = (force = false) => {
        setTimeout(() => {
            if (force || isUserNearBottom.current || isFirstMessage.current) {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                isFirstMessage.current = false
            }
        }, 100)
    }

    const handleChatScroll = () => {
        const el = chatContainerRef.current
        if (!el) return
        const threshold = 80
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
        isUserNearBottom.current = atBottom
        setShowScrollButton(!atBottom)
    }

    const handleScrollToBottomClick = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        setShowScrollButton(false)
        isUserNearBottom.current = true
    }

    // ==============================|| Chat Handlers ||============================== //

    const addBotMessage = (content, type = 'text', questionIndex) => {
        setChatMessages((prev) => [...prev, { role: 'bot', content, type, questionIndex }])
        scrollToBottom()
    }

    const handleDescribeSubmit = () => {
        if (!describeInput.trim() || !modelConfirmed) return
        const userMsg = describeInput.trim()
        setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
        setDescribeInput('')
        setIsTyping(true)
        scrollToBottom(true)

        const hasAskedQuestions = chatMessages.some((m) => m.type === 'question')

        if (!hasAskedQuestions) {
            setTimeout(() => {
                setIsTyping(false)
                addBotMessage(`Great idea! I'll help you build that. I have a couple of questions to make sure I get it right.`)
                setTimeout(() => {
                    setCurrentQuestionIndex(0)
                    addBotMessage(MOCK_QUESTIONS[0].text, 'question', 0)
                    scrollToBottom()
                }, 600)
            }, 1200)
        } else {
            setTimeout(() => {
                setIsTyping(false)
                const nextIdx = currentQuestionIndex + 1
                if (nextIdx < MOCK_QUESTIONS.length) {
                    setCurrentQuestionIndex(nextIdx)
                    addBotMessage(MOCK_QUESTIONS[nextIdx].text, 'question', nextIdx)
                } else {
                    handleDescribeFinish(userMsg)
                }
            }, 800)
        }
    }

    const handleOptionSelect = (option) => {
        setChatMessages((prev) => [...prev, { role: 'user', content: option }])
        setIsTyping(true)
        scrollToBottom(true)

        setTimeout(() => {
            setIsTyping(false)
            const nextIdx = currentQuestionIndex + 1
            if (nextIdx < MOCK_QUESTIONS.length) {
                setCurrentQuestionIndex(nextIdx)
                addBotMessage(MOCK_QUESTIONS[nextIdx].text, 'question', nextIdx)
            } else {
                handleDescribeFinish(option)
            }
        }, 800)
    }

    const handleSkipQuestion = () => {
        setIsTyping(true)
        scrollToBottom()

        setTimeout(() => {
            setIsTyping(false)
            const nextIdx = currentQuestionIndex + 1
            if (nextIdx < MOCK_QUESTIONS.length) {
                setCurrentQuestionIndex(nextIdx)
                addBotMessage(MOCK_QUESTIONS[nextIdx].text, 'question', nextIdx)
            } else {
                handleDescribeFinish()
            }
        }, 600)
    }

    const handleDescribeFinish = () => {
        addBotMessage("I've got everything I need. Setting up your agent now...")
        const firstUserMsg = chatMessages.find((m) => m.role === 'user')?.content || 'New Agent'
        setTimeout(() => {
            setAgentName(firstUserMsg.length > 50 ? firstUserMsg.slice(0, 50) : firstUserMsg)
            setCustomAssistantInstruction(firstUserMsg)
            setCreationMode('manual')
        }, 1500)
    }

    // ==============================|| Effects ||============================== //

    // Auto-submit generate task when model is confirmed
    useEffect(() => {
        if (generateTask && chatMessages.length === 0) {
            if (modelConfirmed) {
                setTimeout(() => {
                    setChatMessages([{ role: 'user', content: generateTask }])
                    setDescribeInput('')
                    setIsTyping(true)
                    setTimeout(() => {
                        setIsTyping(false)
                        setChatMessages((prev) => [
                            ...prev,
                            {
                                role: 'bot',
                                content: `Great idea! I'll help you build that. I have a couple of questions to make sure I get it right.`
                            }
                        ])
                        setTimeout(() => {
                            setCurrentQuestionIndex(0)
                            setChatMessages((prev) => [
                                ...prev,
                                { role: 'bot', content: MOCK_QUESTIONS[0].text, type: 'question', questionIndex: 0 }
                            ])
                        }, 600)
                    }, 1200)
                }, 300)
            } else {
                setDescribeInput(generateTask)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generateTask, modelConfirmed])

    // Hide page scrollbar in describe mode
    useEffect(() => {
        const style = document.createElement('style')
        style.id = 'hide-describe-scrollbar'
        if (modelConfirmed) {
            style.textContent = 'html, body { overflow: hidden !important; }'
        } else {
            style.textContent = `
                html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
                html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
            `
        }
        document.head.appendChild(style)
        return () => {
            const el = document.getElementById('hide-describe-scrollbar')
            if (el) el.remove()
        }
    }, [modelConfirmed])

    // ==============================|| Model Selection Handler ||============================== //

    const handleModelSelect = (newValue) => {
        if (!newValue) {
            setSelectedChatModel({})
        } else {
            const found = chatModelsComponents.find((c) => c.name === newValue)
            if (found) {
                const id = `${found.name}_0`
                const cloned = cloneDeep(found)
                const data = initNode(cloned, id)
                setSelectedChatModel(data)
                scrollToBottom(true)
            }
        }
    }

    const handleConfirm = () => {
        setModelConfirmed(true)
        scrollToBottom(true)
    }

    // ==============================|| Render ||============================== //

    return (
        <Box
            sx={
                modelConfirmed
                    ? {
                          display: 'flex',
                          flexDirection: 'column',
                          height: 'calc(100vh - 260px)',
                          overflow: 'hidden'
                      }
                    : {
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 'calc(100vh - 260px)',
                          '&::-webkit-scrollbar': { display: 'none' },
                          scrollbarWidth: 'none'
                      }
            }
        >
            {/* Chat messages area — scrollable */}
            <Box
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: 1,
                    position: 'relative'
                }}
            >
                {/* Empty state — centered content with model selector */}
                {chatMessages.length === 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            minHeight: 'calc(100vh - 440px)',
                            pb: 4
                        }}
                    >
                        <Typography
                            variant='h2'
                            sx={{
                                fontWeight: 700,
                                fontSize: '1.75rem',
                                mb: 1.5,
                                color: theme.palette.text.primary
                            }}
                        >
                            What do you want to build?
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '1rem',
                                color: theme.palette.text.secondary,
                                mb: 3
                            }}
                        >
                            Describe your agent or start with a template.
                        </Typography>

                        {/* Model selector — hidden once confirmed or while default config is still resolving */}
                        {!modelConfirmed && defaultConfigResolved && (
                            <Box sx={{ width: '100%', maxWidth: 400 }}>
                                <Stack spacing={1.5}>
                                    {!selectedChatModel?.name && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 1
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: theme.palette.error.main,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <Typography
                                                sx={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    color: theme.palette.text.secondary
                                                }}
                                            >
                                                Select a model to get started
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box>
                                        <Box sx={{ p: 2 }}>
                                            <Dropdown
                                                key={JSON.stringify(selectedChatModel)}
                                                name='describeChatModel'
                                                options={chatModelsOptions ?? []}
                                                onSelect={handleModelSelect}
                                                value={selectedChatModel?.name || 'choose an option'}
                                            />
                                        </Box>
                                        {/* Credential and model name fields */}
                                        {selectedChatModel &&
                                            Object.keys(selectedChatModel).length > 0 &&
                                            showHideInputParams(selectedChatModel)
                                                .filter(
                                                    (ip) => !ip.hidden && ip.display !== false && MODEL_PARAM_WHITELIST.includes(ip.name)
                                                )
                                                .map((ip, idx) => (
                                                    <DocStoreInputHandler
                                                        key={idx}
                                                        inputParam={ip}
                                                        data={selectedChatModel}
                                                        onNodeDataChange={handleChatModelDataChange}
                                                    />
                                                ))}
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: '0.75rem',
                                            color: theme.palette.text.secondary,
                                            textAlign: 'center',
                                            fontStyle: 'italic'
                                        }}
                                    >
                                        For best results, use larger models such as Claude Opus 4.6, GPT-5.4, or Gemini 3.1
                                    </Typography>
                                    {selectedChatModel?.name && (
                                        <Button
                                            variant='contained'
                                            onClick={handleConfirm}
                                            sx={{
                                                borderRadius: '24px',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                px: 4,
                                                alignSelf: 'center',
                                                background: `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                                                color: theme.palette.common.white,
                                                '&:hover': {
                                                    background: `linear-gradient(90deg, ${darken(
                                                        theme.palette.primary.main,
                                                        0.1
                                                    )} 10%, ${darken(theme.palette.secondary.main, 0.1)} 100%)`
                                                }
                                            }}
                                        >
                                            Confirm
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Messages */}
                {chatMessages.map((msg, idx) => (
                    <Box key={idx} sx={{ mb: 2 }}>
                        {msg.role === 'user' ? (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Box
                                    sx={{
                                        backgroundColor: customization.isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100],
                                        borderRadius: 3,
                                        px: 2,
                                        py: 1.5,
                                        maxWidth: '75%'
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.9rem' }}>{msg.content}</Typography>
                                </Box>
                            </Box>
                        ) : msg.type === 'question' ? (
                            <Box sx={{ maxWidth: '85%' }}>
                                <Box
                                    sx={{
                                        border: 1,
                                        borderColor: theme.palette.grey[900] + 25,
                                        borderRadius: 3,
                                        p: 2.5,
                                        mt: 1
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            mb: 2,
                                            color: theme.palette.text.primary
                                        }}
                                    >
                                        {msg.content}
                                    </Typography>
                                    <Stack spacing={1}>
                                        {MOCK_QUESTIONS[msg.questionIndex]?.options.map((option, optIdx) => {
                                            const isLastQuestion = idx === chatMessages.length - 1
                                            return (
                                                <Box
                                                    key={optIdx}
                                                    onClick={isLastQuestion ? () => handleOptionSelect(option) : undefined}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        py: 1.5,
                                                        px: 2,
                                                        borderRadius: 2,
                                                        cursor: isLastQuestion ? 'pointer' : 'default',
                                                        '&:hover': isLastQuestion
                                                            ? {
                                                                  backgroundColor: customization.isDarkMode
                                                                      ? 'rgba(255,255,255,0.05)'
                                                                      : 'rgba(0,0,0,0.03)'
                                                              }
                                                            : {}
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 1.5,
                                                            border: 1,
                                                            borderColor: theme.palette.grey[900] + 25,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.8rem',
                                                                fontWeight: 500,
                                                                color: theme.palette.text.secondary
                                                            }}
                                                        >
                                                            {optIdx + 1}
                                                        </Typography>
                                                    </Box>
                                                    <Typography sx={{ fontSize: '0.9rem' }}>{option}</Typography>
                                                </Box>
                                            )
                                        })}
                                    </Stack>
                                    {idx === chatMessages.length - 1 && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mt: 2,
                                                pt: 1.5,
                                                borderTop: 1,
                                                borderColor: theme.palette.grey[900] + 15
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    color: theme.palette.text.secondary
                                                }}
                                            >
                                                {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}
                                            </Typography>
                                            <Button
                                                size='small'
                                                onClick={handleSkipQuestion}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 500,
                                                    color: theme.palette.text.secondary
                                                }}
                                            >
                                                Skip
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ maxWidth: '85%' }}>
                                <Typography
                                    sx={{
                                        fontSize: '0.9rem',
                                        color: theme.palette.text.primary,
                                        lineHeight: 1.6
                                    }}
                                >
                                    {msg.content}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <Box sx={{ mb: 2 }}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                gap: 0.5,
                                px: 2,
                                py: 1.5,
                                borderRadius: 3,
                                backgroundColor: customization.isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100]
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: theme.palette.text.secondary,
                                        animation: 'describeDotBounce 1.4s infinite',
                                        animationDelay: `${i * 0.2}s`,
                                        '@keyframes describeDotBounce': {
                                            '0%, 80%, 100%': { opacity: 0.3 },
                                            '40%': { opacity: 1 }
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                <div ref={chatEndRef} />
            </Box>

            {/* Scroll to bottom button */}
            {showScrollButton && modelConfirmed && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: -2, mb: 0.5 }}>
                    <IconButton
                        onClick={handleScrollToBottomClick}
                        size='small'
                        sx={{
                            backgroundColor: theme.palette.background.paper,
                            border: 1,
                            borderColor: theme.palette.grey[900] + 25,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            width: 32,
                            height: 32,
                            zIndex: 1,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover
                            }
                        }}
                    >
                        <IconArrowDown size={16} />
                    </IconButton>
                </Box>
            )}

            {/* Input area */}
            <Box sx={modelConfirmed ? { flexShrink: 0, px: 2, py: 1 } : { px: 2, py: 1 }}>
                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: 3,
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        border: 1,
                        borderColor: theme.palette.grey[900] + 25,
                        '&:focus-within': {
                            borderColor: theme.palette.primary.main
                        }
                    }}
                >
                    <OutlinedInput
                        fullWidth
                        disabled={!modelConfirmed}
                        placeholder={
                            !modelConfirmed
                                ? 'Select a model and confirm to start...'
                                : chatMessages.length === 0
                                ? 'Describe your agent...'
                                : 'Reply...'
                        }
                        value={describeInput}
                        onChange={(e) => setDescribeInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleDescribeSubmit()
                            }
                        }}
                        sx={{
                            pr: 7,
                            '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none'
                            }
                        }}
                    />
                    <IconButton
                        onClick={handleDescribeSubmit}
                        disabled={!describeInput.trim() || !modelConfirmed}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: describeInput.trim() ? theme.palette.primary.main : theme.palette.grey[300],
                            color: describeInput.trim() ? theme.palette.primary.contrastText : theme.palette.text.disabled,
                            borderRadius: 2,
                            width: 32,
                            height: 32,
                            '&:hover': {
                                backgroundColor: describeInput.trim() ? theme.palette.primary.dark : theme.palette.grey[300]
                            }
                        }}
                    >
                        <IconArrowUp size={16} />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    )
}

DescribeMode.propTypes = {
    selectedChatModel: PropTypes.object,
    setSelectedChatModel: PropTypes.func,
    chatModelsComponents: PropTypes.array,
    chatModelsOptions: PropTypes.array,
    handleChatModelDataChange: PropTypes.func,
    setAgentName: PropTypes.func,
    setCustomAssistantInstruction: PropTypes.func,
    setCreationMode: PropTypes.func,
    modelConfirmed: PropTypes.bool,
    setModelConfirmed: PropTypes.func,
    generateTask: PropTypes.string,
    defaultConfigResolved: PropTypes.bool
}

export default DescribeMode
