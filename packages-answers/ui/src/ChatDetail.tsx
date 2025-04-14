'use client'
import React, { Suspense, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SourceDocumentModal from '@ui/SourceDocumentModal'

import { useAnswers } from './AnswersContext'
import ChatInput from './ChatInput'
import DrawerFilters from './DrawerFilters/DrawerFilters'
import Toolbar from '@mui/material/Toolbar'

import type { AppSettings, Document, Sidekick } from 'types'
import SidekickSelect from './SidekickSelect'
import Drawer from './Drawer'
import { ChatRoom } from './ChatRoom'
import { FileUpload } from './AnswersContext'
import AppBar from '@mui/material/AppBar'
import { Button, Tooltip } from '@mui/material'
import { CodePreview } from './Message/CodePreview'

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
    // console.log('chat', chat)
    return (
        <>
            <Box sx={{ display: 'flex', width: '100%' }}>
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            width: '100%',
                            height: '100%',
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
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '100%',
                                    width: '100%',
                                    maxWidth: 1200,
                                    flexDirection: 'column',
                                    margin: 'auto'
                                }}
                            >
                                <Typography variant='h4'>What do you want today?</Typography>
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
                        <Suspense fallback={<div>Loading...</div>}>
                            <DrawerFilters appSettings={appSettings} />
                        </Suspense>
                    ) : null}
                </Drawer>
            </Box>
        </>
    )
}
