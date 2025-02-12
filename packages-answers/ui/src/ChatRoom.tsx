import React, { Suspense } from 'react'
import { Box, Button, Card, CardContent, Typography, Stack } from '@mui/material'
import type { Message, Sidekick } from 'types'
import { MessageCard } from './Message'
import AssistantInfoCard from './AssistantInfoCard'
import { useAnswers } from './AnswersContext'

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
    setPreviewCode: any
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
    const { sendMessage, gptModel } = useAnswers()

    // Starter prompts configuration
    const starterPrompts = {
        title: 'Get Started',
        prompts: chatbotConfig?.starterPrompts
    }

    const handleStarterPromptClick = (prompt: string) => {
        sendMessage({
            content: prompt,
            sidekick: selectedSidekick,
            gptModel,
            files: []
        })
    }

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

                <Box sx={{ width: '100%' }}>
                    {!isLoading && starterPrompts.prompts.length > 0 && (
                        <Stack spacing={2} sx={{ width: '100%', my: 4 }}>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography variant='h6' gutterBottom>
                                        {starterPrompts.title}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 1
                                        }}
                                    >
                                        {starterPrompts.prompts.map(({ prompt }: { prompt: string }, promptIndex: number) => (
                                            <Button
                                                key={promptIndex}
                                                variant='outlined'
                                                size='medium'
                                                onClick={() => handleStarterPromptClick(prompt)}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    minHeight: 40
                                                }}
                                            >
                                                {prompt}
                                            </Button>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Stack>
                    )}

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
