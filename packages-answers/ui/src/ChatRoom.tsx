import React from 'react'
import { Box, Button, IconButton } from '@mui/material'
import type { Message, Sidekick } from 'types'
import ChatFeedbackContentDialog from './../../../packages/ui/src/ui-component/dialog/ChatFeedbackContentDialog'
import { useAnswers } from './AnswersContext'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useSubscriptionDialog } from './SubscriptionDialogContext'

import dynamic from 'next/dynamic'

const MessageCard = dynamic(() => import('./Message/Message').then((mod) => ({ default: mod.MessageCard })))
const AssistantInfoCard = dynamic(() => import('./AssistantInfoCard'))

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
    setPreviewCode: (code: string) => void
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
    const openLinksInNewTab = chatbotConfig?.chatLinksInNewTab?.status ?? false
    const { showFeedbackContentDialog, setShowFeedbackContentDialog, feedbackId, submitFeedbackContent } = useAnswers()
    const { openDialog: openSubscriptionDialog } = useSubscriptionDialog()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                p: 2
            }}
        >
            <Box sx={{ bgcolor: 'background.paper' }}>
                <AssistantInfoCard sidekick={selectedSidekick} followers={208000} onShare={() => {}} onSearch={() => {}} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ChatFeedbackContentDialog
                    show={showFeedbackContentDialog}
                    onCancel={() => setShowFeedbackContentDialog(false)}
                    onConfirm={submitFeedbackContent}
                />
                {messages?.map((message, index) => (
                    <MessageCard
                        {...message}
                        key={`message_${index}`}
                        setSelectedDocuments={setSelectedDocuments}
                        setPreviewCode={setPreviewCode}
                        openLinksInNewTab={openLinksInNewTab}
                        role={message.role}
                        isFeedbackAllowed={chatbotConfig?.chatFeedback?.status}
                    />
                ))}

                {error ? (
                    <>
                        <MessageCard
                            id='error'
                            role='status'
                            content={`${typeof error === 'string' ? error : error.message} `}
                            error={error}
                        />
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Button onClick={regenerateAnswer} variant='contained' color='primary' sx={{ margin: 'auto' }}>
                                Retry
                            </Button>
                            {typeof error === 'string' && error.toLowerCase().includes('usage limit') && (
                                <Button onClick={openSubscriptionDialog} variant='contained' color='secondary' sx={{ margin: 'auto' }}>
                                    Upgrade Plan
                                </Button>
                            )}
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
                    <Box sx={{ mt: -4, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton onClick={regenerateAnswer} size='small'>
                            <RefreshIcon fontSize='inherit' />
                        </IconButton>
                    </Box>
                ) : null}
            </Box>
        </Box>
    )
}
