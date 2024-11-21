'use client'
import React, { Suspense, useRef } from 'react'

import NextLink from 'next/link'

import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import SourceDocumentModal from '@ui/SourceDocumentModal'

import ShareIcon from '@mui/icons-material/IosShare'

import { MessageCard } from './Message'
import { useAnswers } from './AnswersContext'
import ChatInput from './ChatInput'
import DrawerFilters from './DrawerFilters/DrawerFilters'
import NextLink from 'next/link'
import Toolbar from '@mui/material/Toolbar'

import ShareIcon from '@mui/icons-material/IosShare'

import type { AppSettings, Document, Sidekick } from 'types'
import SidekickSelect from './SidekickSelect'
import Drawer from './Drawer'

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

                                        {/* {!showFilters ? (
                  <Tooltip
                    PopperProps={{ placement: 'top-end' }}
                    title={!Object.keys(services)?.length ? null : <Filters />}>
                    <Button
                      size="large"
                      color="inherit"
                      aria-label="manage sources"
                      onClick={() => setShowFilters(!showFilters)}
                      sx={{ display: 'flex', minWidth: 0, borderRadius: 20 }}>
                      {!Object.keys(services)?.length ? 'Select sources' : null}

                      <AvatarGroup
                        max={4}
                        sx={{ '.MuiAvatar-root': { ml: -2, width: 28, height: 28 } }}>
                        {(Object.keys(services)?.length
                          ? Object.values(services)
                          : appSettings.services
                        )?.map((service) => (
                          <Avatar key={service.id} variant="source" src={service.imageURL} />
                        ))}
                      </AvatarGroup>
                    </Button>
                  </Tooltip>
                ) : (
                  <IconButton
                    size="large"
                    color="inherit"
                    aria-label="manage sources"
                    edge="end"
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{}}>
                    <ArrowBackIcon />
                  </IconButton>
                )} */}
                                    </Box>
                                </Toolbar>
                            </AppBar>
                        ) : null}
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
                                <Box ref={scrollRef} sx={{ height: '100%', overflow: 'auto', px: 2, py: 3 }}>
                                    <Suspense fallback={<div>Loading...</div>}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 2
                                            }}
                                        >
                                            {messages?.map((message, index) => (
                                                <MessageCard
                                                    {...message}
                                                    key={`message_${index}`}
                                                    setSelectedDocuments={setSelectedDocuments}
                                                />
                                            ))}

                                            {error ? (
                                                <>
                                                    <MessageCard id='error' role='status' content={`${error.message} `} error={error} />

                                                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                        <Button
                                                            onClick={() => regenerateAnswer()}
                                                            variant='contained'
                                                            color='primary'
                                                            sx={{ margin: 'auto' }}
                                                        >
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
                                                    <Button onClick={() => regenerateAnswer()} variant='outlined' color='primary'>
                                                        Regenerate answer
                                                    </Button>
                                                </Box>
                                            ) : null}
                                        </Box>
                                    </Suspense>
                                </Box>

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
