import React, { Suspense } from 'react'
import { Box, Button } from '@mui/material'
import type { Message, Sidekick } from 'types'
import { MessageCard } from './Message'
import AssistantInfoCard from './AssistantInfoCard'

interface ChatRoomProps {
    messages: Message[] | null | undefined
    error: any
    isLoading: boolean
    regenerateAnswer: () => void
    chatbotConfig: any
    setSelectedDocuments: any
    sidekicks: Sidekick[]
    scrollRef: React.RefObject<HTMLDivElement>
    selectedSidekick?: Sidekick
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
    messages,
    error,
    isLoading,
    regenerateAnswer,
    chatbotConfig,
    setSelectedDocuments,
    sidekicks,
    scrollRef,
    selectedSidekick,
    setPreviewCode
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                p: 2
            }}
        >
            <Suspense fallback={<div>Loading...</div>}>
                <Box sx={{ bgcolor: 'background.paper' }}>
                    <AssistantInfoCard sidekick={selectedSidekick} followers={208000} onShare={() => {}} onSearch={() => {}} />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {messages?.map((message, index) => (
                        <MessageCard
                            {...message}
                            key={`message_${index}`}
                            setSelectedDocuments={setSelectedDocuments}
                            setPreviewCode={setPreviewCode}
                        />
                    ))}

                    {error ? (
                        <>
                            <MessageCard id='error' role='status' content={`${error.message} `} error={error} />
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <Button onClick={regenerateAnswer} variant='contained' color='primary' sx={{ margin: 'auto' }}>
                                    Retry
                                </Button>
                            </Box>
                        </>
                    ) : null}

                    {isLoading && messages?.[messages?.length - 1]?.role === 'user' ? (
                        <MessageCard role='status' isLoading content={'...'} />
                    ) : null}

                    {!messages?.length && !isLoading ? (
                        <MessageCard
                            id='placeholder'
                            role='status'
                            content={chatbotConfig?.welcomeMessage ?? 'Welcome! Try asking me something!'}
                        />
                    ) : null}

                    {!isLoading && !error && messages?.length ? (
                        <Box sx={{ py: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Button onClick={regenerateAnswer} variant='outlined' color='primary'>
                                Regenerate answer
                            </Button>
                        </Box>
                    ) : null}
                </Box>
            </Suspense>
        </Box>
    )
}
