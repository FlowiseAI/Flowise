'use client'
import React, { useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useAnswers } from './AnswersContext'
import Toolbar from '@mui/material/Toolbar'

import type { AppSettings, Document, Sidekick } from 'types'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Button from '@mui/material/Button'
import RateReviewIcon from '@mui/icons-material/RateReview'

const AppBar = dynamic(() => import('@mui/material/AppBar'))
const ChatRoom = dynamic(() => import('./ChatRoom').then((mod) => ({ default: mod.ChatRoom })))
const SidekickSelect = dynamic(() => import('./SidekickSelect'))
const Drawer = dynamic(() => import('./Drawer'), { ssr: false })
const SourceDocumentModal = dynamic(() => import('@ui/SourceDocumentModal'), { ssr: false })
const CodePreview = dynamic(() => import('./Message/CodePreview').then((mod) => ({ default: mod.CodePreview })), { ssr: false })
const DrawerFilters = dynamic(() => import('./DrawerFilters/DrawerFilters'), { ssr: false })
const ChatInput = dynamic(() => import('./ChatInput'), { ssr: true })

const DISPLAY_MODES = {
    CHATBOT: 'chatbot',
    EMBEDDED_FORM: 'embeddedForm'
}

export const ChatDetail = ({
    appSettings,
    sidekicks = [],
    session
}: {
    appSettings: AppSettings
    prompts?: any
    sidekicks?: Sidekick[]
    session: any
}) => {
    const {
        error,
        chat,
        journey,
        messages: clientMessages,
        isLoading,
        regenerateAnswer,
        showFilters,
        chatbotConfig,
        sidekick: selectedSidekick,
        startNewChat
    } = useAnswers()

    const scrollRef = useRef<HTMLDivElement>(null)
    const [selectedDocuments, setSelectedDocuments] = React.useState<Document[] | undefined>()
    const [uploadedFiles, setUploadedFiles] = React.useState<FileUpload[]>([])
    const [previewCode, setPreviewCode] = React.useState<{
        code: string
        language: string
        getHTMLPreview: (code: string) => string
        getReactPreview: (code: string) => string
    } | null>(null)
    const messages = clientMessages || chat?.messages

    const displayMode = chatbotConfig?.displayMode || DISPLAY_MODES.CHATBOT
    const embeddedUrl = chatbotConfig?.embeddedUrl || ''
    const handleNewChat = () => {
        startNewChat()
    }
    return (
        <>
            <Box sx={{ display: 'flex', width: '100%' }}>
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100vh',
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            width: '100%',
                            height: 'calc(100vh - 67px)',
                            flex: 1,
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}
                    >
                        {selectedSidekick || chat ? (
                            <AppBar
                                position='static'
                                sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)', zIndex: 1000 }}
                                color={'transparent'}
                                elevation={1}
                            >
                                <Toolbar sx={{ px: '16px!important', gap: 1 }}>
                                    <SidekickSelect sidekicks={sidekicks} />
                                    <Box
                                        sx={{
                                            flexGrow: 1,
                                            display: 'flex',
                                            gap: 2,
                                            p: {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                textTransform: 'capitalize',
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: '1'
                                            }
                                        }}
                                    >
                                        {chat?.id ? <Typography variant='body1'>{chat?.title ?? chat.id}</Typography> : null}

                                        {journey ? <Typography variant='body2'>{journey?.goal ?? journey?.title}</Typography> : null}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button
                                            variant='text'
                                            onClick={handleNewChat}
                                            endIcon={<RateReviewIcon />}
                                            fullWidth
                                            sx={{
                                                textTransform: 'capitalize',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            New chat
                                        </Button>
                                        {/* {chat ? (
                                            <IconButton
                                                size='large'
                                                edge='start'
                                                color='inherit'
                                                aria-label='share'
                                                component={NextLink}
                                                href={`?modal=share`}
                                            >
                                                <ShareIcon />
                                            </IconButton>
                                        ) : null} */}
                                    </Box>
                                </Toolbar>
                            </AppBar>
                        ) : null}
                        {selectedSidekick || chat ? <></> : null}
                        {!selectedSidekick && !chat ? (
                            <Box
                                sx={{
                                    // border: '1px solid red',
                                    display: 'flex',
                                    // justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    // height: '100%',
                                    width: '100%',
                                    flexDirection: 'column',
                                    paddingTop: 10,
                                    gap: 10,
                                    maxWidth: 1200,

                                    px: { xs: 2, sm: 3 },
                                    overflowY: 'auto',
                                    margin: '0 auto'
                                }}
                            >
                                <Image
                                    src='/static/images/logos/answerai-logo-600-wide-white.png'
                                    alt='Answers Logo'
                                    width={600}
                                    height={120}
                                    priority
                                    style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
                                />
                                <SidekickSelect noDialog sidekicks={sidekicks} />
                            </Box>
                        ) : displayMode === DISPLAY_MODES.CHATBOT ? (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        overflow: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                    ref={scrollRef}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            maxWidth: 768,
                                            margin: '0 auto',
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            px: { xs: 2, sm: 3 }
                                        }}
                                    >
                                        <ChatRoom
                                            messages={messages}
                                            error={error}
                                            isLoading={isLoading}
                                            regenerateAnswer={regenerateAnswer}
                                            chatbotConfig={chatbotConfig}
                                            setSelectedDocuments={setSelectedDocuments}
                                            setPreviewCode={setPreviewCode}
                                            sidekicks={sidekicks}
                                            scrollRef={scrollRef}
                                            selectedSidekick={selectedSidekick}
                                        />
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 768,
                                        margin: '0 auto',
                                        px: { xs: 2, sm: 3 }
                                    }}
                                >
                                    <ChatInput
                                        sidekicks={sidekicks}
                                        scrollRef={scrollRef}
                                        uploadedFiles={uploadedFiles}
                                        setUploadedFiles={setUploadedFiles}
                                        isWidget={false}
                                    />
                                </Box>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    width: '100%'
                                }}
                            >
                                <iframe src={embeddedUrl} style={{ flex: 1, border: 'none' }} title='Embedded Form' allowFullScreen />
                            </Box>
                        )}
                    </Box>
                </Box>
                <Drawer
                    sx={{
                        flexShrink: 0,
                        zIndex: 1000,
                        position: { md: 'relative', xs: 'absolute' },
                        '& .MuiDrawer-paper': {
                            position: 'absolute',
                            boxSizing: 'border-box',
                            height: '100%'
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                    PaperProps={{
                        sx: {
                            height: '100%'
                        }
                    }}
                    variant='permanent'
                    anchor='left'
                    open={!!showFilters || !!selectedDocuments || !!previewCode}
                >
                    {selectedDocuments ? (
                        <SourceDocumentModal documents={selectedDocuments} onClose={() => setSelectedDocuments(undefined)} />
                    ) : previewCode ? (
                        <CodePreview {...previewCode} onClose={() => setPreviewCode(null)} />
                    ) : showFilters ? (
                        <DrawerFilters appSettings={appSettings} />
                    ) : null}
                </Drawer>
            </Box>
        </>
    )
}
