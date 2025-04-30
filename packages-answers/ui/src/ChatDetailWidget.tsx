'use client'
import React from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { AppSettings, User } from 'types'
import { MessageCard } from './Message'
import { useAnswers } from './AnswersContext'
import ChatInput from './ChatInput'
import Refresh from '@mui/icons-material/Refresh'
import CircularProgress from '@mui/material/CircularProgress'

const ChatDetailWidget = ({ appSettings, user, prompts }: { appSettings: AppSettings; user: User; prompts?: any }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const { setInputValue, error, chat, journey, messages, isLoading, regenerateAnswer } = useAnswers()
    React.useEffect(() => {
        if (messages?.length) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
        inputRef.current?.focus()
    }, [chat, journey, messages, error])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                flex: 1,
                justifyContent: 'space-between'
            }}
        >
            <Box ref={scrollRef} sx={{ height: '100%', overflow: 'auto', px: 1, py: 1 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                    }}
                >
                    {messages?.map((message, index) => (
                        <MessageCard {...message} key={`message_${index}`} isWidget />
                    ))}

                    {error ? (
                        <>
                            <MessageCard
                                user={user}
                                // eslint-disable-next-line jsx-a11y/aria-role
                                role='assistant'
                                content={`There was an error completing your request, please try again`}
                                error={error}
                                isWidget
                            />
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <Button onClick={() => regenerateAnswer()} variant='contained' color='primary' sx={{ margin: 'auto' }}>
                                    Retry
                                </Button>
                            </Box>
                        </>
                    ) : null}

                    {isLoading && (
                        <>
                            {/* <MessageCard user={user} role="assistant" content={'...'} /> */}
                            <CircularProgress
                                color='primary' // customize the color of the icon
                            />
                        </>
                    )}

                    {!messages?.length ? (
                        <MessageCard
                            user={user}
                            // eslint-disable-next-line jsx-a11y/aria-role
                            role='assistant'
                            content={'Welcome! Try asking me something below!'}
                            isWidget
                        />
                    ) : null}

                    {messages?.length && !isLoading && !error ? (
                        <Box sx={{ py: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Button onClick={() => regenerateAnswer()} variant='outlined' color='primary'>
                                <Refresh />
                            </Button>
                        </Box>
                    ) : null}
                </Box>
            </Box>
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    px: 1,
                    paddingBottom: 1
                }}
            >
                <ChatInput isWidget />
            </Box>
        </Box>
    )
}

export default ChatDetailWidget
