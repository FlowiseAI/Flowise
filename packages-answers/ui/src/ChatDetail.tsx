'use client'
import React, { Suspense, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SourceDocumentModal from '@ui/SourceDocumentModal'

import { useAnswers } from './AnswersContext'
import ChatInput from './ChatInput'
import DrawerFilters from './DrawerFilters/DrawerFilters'
import NextLink from 'next/link'
import Toolbar from '@mui/material/Toolbar'

import ShareIcon from '@mui/icons-material/IosShare'

import type { AppSettings, Document, Sidekick } from 'types'
import SidekickSelect from './SidekickSelect'
import Drawer from './Drawer'
import { ChatRoom } from './ChatRoom'
import { FileUpload } from './AnswersContext'
import AppBar from '@mui/material/AppBar'
import { IconButton } from '@mui/material'

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
        sidekick: selectedSidekick
    } = useAnswers()

    const scrollRef = useRef<HTMLDivElement>(null)
    const [selectedDocuments, setSelectedDocuments] = React.useState<Document[] | undefined>()
    const [uploadedFiles, setUploadedFiles] = React.useState<FileUpload[]>([])

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
                            justifyContent: 'space-between'
                        }}
                    >
                        {selectedSidekick || chat ? (
                            <AppBar
                                position='static'
                                sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}
                                color={'transparent'}
                                elevation={0}
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
                                        {chat ? <Typography variant='body1'>{chat?.title ?? chat.id}</Typography> : null}

                                        {journey ? <Typography variant='body2'>{journey?.goal ?? journey?.title}</Typography> : null}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        {chat ? (
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
                                        ) : null}
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
                            <>
                                <ChatRoom
                                    messages={messages}
                                    error={error}
                                    isLoading={isLoading}
                                    regenerateAnswer={regenerateAnswer}
                                    chatbotConfig={chatbotConfig}
                                    setSelectedDocuments={() => {}}
                                    sidekicks={sidekicks}
                                    scrollRef={scrollRef}
                                />

                                <ChatInput
                                    sidekicks={sidekicks}
                                    scrollRef={scrollRef}
                                    uploadedFiles={uploadedFiles}
                                    setUploadedFiles={setUploadedFiles}
                                    isWidget={false}
                                />
                            </>
                        ) : (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                Supposed to be the form
                                {/* <iframe src={embeddedUrl} style={{ flex: 1, border: 'none' }} title='Embedded Form' allowFullScreen /> */}
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
                            boxSizing: 'border-box'
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                    variant='permanent'
                    anchor='left'
                    open={!!showFilters || !!selectedDocuments}
                >
                    {selectedDocuments ? (
                        <SourceDocumentModal documents={selectedDocuments} onClose={() => setSelectedDocuments(undefined)} />
                    ) : null}
                    {showFilters ? (
                        <Suspense fallback={<div>Loading...</div>}>
                            <DrawerFilters appSettings={appSettings} />
                        </Suspense>
                    ) : null}
                </Drawer>
            </Box>
        </>
    )
}
