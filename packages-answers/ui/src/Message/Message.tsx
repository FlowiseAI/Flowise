'use client'
import React, { useState } from 'react'
import { AxiosError } from 'axios'
import { useFlags } from 'flagsmith/react'
import Image from 'next/image'
import { JsonViewer } from '@textea/json-viewer'
import { Box, Typography, Avatar, Chip, Button, Divider, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AttachFileIcon from '@mui/icons-material/AttachFile'

import { useAnswers } from '../AnswersContext'
import {
    Accordion as CustomAccordion,
    AccordionSummary as CustomAccordionSummary,
    AccordionDetails as CustomAccordionDetails
} from '../Accordion'
import { AppService, Document, Message } from 'types'
import { Rating } from 'db/generated/prisma-client'
import { getHTMLPreview, getReactPreview, isReactComponent } from '../utils/previewUtils'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import dynamic from 'next/dynamic'
import { FileUpload } from '../types'
import isArray from 'lodash/isArray'

const ReactMarkdown = dynamic(() => import('react-markdown'))
const remarkGfm = dynamic(() => import('remark-gfm'))
const CodeCard = dynamic(() => import('./CodeCard').then((mod) => ({ default: mod.CodeCard })))
const Dialog = dynamic(() => import('@mui/material/Dialog'))
const DialogActions = dynamic(() => import('@mui/material/DialogActions'))
const DialogContent = dynamic(() => import('@mui/material/DialogContent'))
const DialogTitle = dynamic(() => import('@mui/material/DialogTitle'))
const Tooltip = dynamic(() => import('@mui/material/Tooltip'))

interface MessageExtra {
    prompt?: string
    extra?: object
    pineconeData?: object
    filteredData?: object
    unfilteredData?: object
    context?: string
    summary?: string
    completionData?: object
    completionRequest?: object
    filters?: object
    isWidget?: boolean
    contextDocuments?: Document[]
    text?: string
    selectedDocuments?: Document[]
    setSelectedDocuments?: (documents: Document[]) => void
    isLoading?: boolean
    fileUploads?: string | FileUpload[]
    content: undefined | string | any
    usedTools?: any[]
}
interface MessageCardProps extends Partial<Message>, MessageExtra {
    error?: AxiosError<MessageExtra>
    openLinksInNewTab?: boolean
    role: string
    sourceDocuments?: string | Document[]
    setPreviewCode?: (
        preview: {
            code: string
            language: string
            getHTMLPreview: (code: string) => string
            getReactPreview: (code: string) => string
        } | null
    ) => void
    isFeedbackAllowed?: boolean
    chatflowid?: string
}

const getLanguageFromClassName = (className: string | undefined) => {
    if (!className) return 'text'
    const match = className.match(/language-(\w+)/)
    return match ? match[1] : 'text'
}

const getAgentIcon = (nodeName: string | undefined, instructions: string | undefined) => {
    // Simple placeholder icon (can be replaced with actual icons when available)
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJDMiAxNy41MjMgNi40NzcgMjIgMTIgMjJDMTcuNTIzIDIyIDIyIDE3LjUyMyAyMiAxMkMyMiA2LjQ3NyAxNy41MjMgMiAxMiAyWk0xMi43NSAxNi43NVYxOEgxMS4yNVYxNi43NUg5LjAyMzQzQzguNDU4MTkgMTYuNzUgOCAxNi4yOTE4IDggMTUuNzI2NlYxMC4yMDMxQzggOS42Mzc4OSA4LjQ1ODE5IDkuMTc5NjkgOS4wMjM0NCA5LjE3OTY5SDE0Ljk3NjZDMTUuNTQxOCA5LjE3OTY5IDE2IDkuNjM3ODkgMTYgMTAuMjAzMVYxNS43MjY2QzE2IDE2LjI5MTggMTUuNTQxOCAxNi43NSAxNC45NzY2IDE2Ljc1SDEyLjc1Wk0xMiA2QzEyLjgyODQgNiAxMy41IDYuNjcxNTcgMTMuNSA3LjVDMTMuNSA4LjMyODQzIDEyLjgyODQgOSAxMiA5QzExLjE3MTYgOSAxMC41IDguMzI4NDMgMTAuNSA3LjVDMTAuNSA2LjY3MTU3IDExLjE3MTYgNiAxMiA2WiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo='
}

const getLabel = (URL: any, source: any) => {
    if (URL && typeof URL === 'object') {
        if (URL.pathname && typeof URL.pathname === 'string') {
            if (URL.pathname.substring(0, 15) === '/') {
                return URL.host || ''
            } else {
                return `${URL.pathname.substring(0, 15)}...`
            }
        } else if (URL.host) {
            return URL.host
        }
    }

    if (source && source.pageContent && typeof source.pageContent === 'string') {
        return `${source.pageContent.substring(0, 15)}...`
    }

    return ''
}

const onURLClick = (data: any) => {
    window.open(data, '_blank')
}

export const MessageCard = ({
    id,
    content,
    role,
    user,
    error,
    prompt,
    extra,
    pineconeData,
    filteredData,
    unfilteredData,
    context,
    summary,
    completionData,
    completionRequest,
    filters,
    likes,
    dislikes,
    isWidget,
    contextDocuments,
    selectedDocuments,
    setSelectedDocuments,
    isLoading,
    fileUploads,
    setPreviewCode,
    openLinksInNewTab,
    isFeedbackAllowed,
    chatId,
    chatflowid,
    id: messageId,
    usedTools,
    ...other
}: MessageCardProps) => {
    other = { ...other, role, user } as any
    const { developer_mode } = useFlags(['developer_mode']) // only causes re-render if specified flag values / traits change
    const { user: currentUser, sendMessageFeedback, sendMessage, appSettings, messages, sidekick } = useAnswers()
    const sourceDocuments = isArray(other.sourceDocuments) ? other.sourceDocuments : JSON.parse(other.sourceDocuments ?? '[]')
    const contextDocumentsBySource: Record<string, Document[]> = React.useMemo(
        () =>
            sourceDocuments?.reduce((uniqueDocuments: Record<string, Document[]>, current) => {
                const key = current.metadata.url ?? current.metadata.source
                return {
                    ...uniqueDocuments,
                    [key]: [...(uniqueDocuments[key] || []), current]
                }
            }, {}) ?? {},
        [sourceDocuments]
    )
    const [showFeedback, setShowFeedback] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState<{ data: any; title: string } | null>({
        data: null,
        title: ''
    })
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)

    const services: { [key: string]: AppService } =
        appSettings?.services?.reduce((acc, service) => ({ ...acc, [service.id]: service }), {}) ?? {}

    const [lastInteraction, setLastInteraction] = React.useState<Rating | undefined>()
    if (!content && other.text) {
        content = other.text
    } else if (!content && error) {
        content = `An error occurred while replying: ${error?.message}. Please try again later or contact support if the issue persists.`
    }
    const isUserMessage = role === 'userMessage' || role === 'user'

    const hasContent = !isUserMessage ? content : !!content
    if (error) {
        pineconeData = error?.response?.data.pineconeData
        summary = error?.response?.data.summary
        context = error?.response?.data.context
        filters = error?.response?.data.filters
        prompt = error?.response?.data.prompt
    }

    const handleReview = async (rating: Rating) => {
        setLastInteraction(rating)
        if (id) {
            try {
                const feedback = await sendMessageFeedback({
                    messageId: id,
                    rating: rating === 'thumbsUp' ? 'THUMBS_UP' : 'THUMBS_DOWN',
                    content: '',
                    chatflowid: chatflowid ?? '',
                    chatId: chatId ?? ''
                })
                setShowFeedback(true)
            } catch (err) {
                setLastInteraction(undefined)
            }
            // Show modal to ask for added feedback
        }
    }

    const handleCopyCodeClick = (codeString: string) => {
        navigator.clipboard.writeText(codeString)
    }

    // const handleDislike = async (evt: React.MouseEvent<HTMLButtonElement>) => {
    //     evt.stopPropagation()
    //     evt.preventDefault()
    //     setLastInteraction('thumbsDown')
    //     if (id) {
    //         try {
    //             const feedback = await sendMessageFeedback({
    //                 messageId: id,
    //                 rating: 'thumbsDown'
    //             })
    //             setShowFeedback(true)
    //             // Show modal to ask for added feedback } catch (err) {
    //         } catch (err) {
    //             setLastInteraction(undefined)
    //         }
    //     }
    // }

    const getDocumentLabel = (doc: Document) => {
        if (doc.metadata?.source == 'blob' && doc.metadata?.pdf) {
            return `${doc.metadata?.pdf?.info?.Title}`
        }
        return (
            doc.title ??
            doc.url ??
            doc.metadata?.title ??
            doc.metadata?.url ??
            (doc.metadata?.filePath && doc.metadata?.repo ? `${doc.metadata?.repo}/${doc.metadata?.filePath}` : null) ??
            doc.metadata?.source
        )
    }

    const onSourceDialogClick = (data: any, title: string) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    const parsedFileUploads = React.useMemo(() => {
        if (!fileUploads) return []
        if (typeof fileUploads === 'string') {
            try {
                return JSON.parse(fileUploads) as FileUpload[]
            } catch (err) {
                console.error('Error parsing fileUploads:', err)
                return []
            }
        }
        return fileUploads
    }, [fileUploads])

    // Update the isLastMessage check to use content instead of ID
    const isLastMessage = React.useMemo(() => {
        if (!messages || !content) return false

        // Get the last non-user message
        const lastAiMessage = [...messages].reverse().find((msg) => msg.role !== 'userMessage' && msg.role !== 'user')

        // Compare content to identify if this is the last message
        return lastAiMessage?.content === content
    }, [messages, content])

    // Modify the effect to detect partial code blocks
    React.useEffect(() => {
        if (content && !isUserMessage && setPreviewCode && isLastMessage) {
            // Split by code block markers and get the last block
            const blocks = content.split('```')

            // If we have an odd number of ```, we have a complete code block
            // If even, we're in the middle of a code block
            const isInCodeBlock = blocks.length % 2 === 0

            // Get the potential code block (last complete block or current incomplete block)
            const potentialCodeBlock = isInCodeBlock ? blocks[blocks.length - 1] : blocks[blocks.length - 2]

            if (potentialCodeBlock) {
                // Try to extract language and code
                const lines = potentialCodeBlock.trim().split('\n')
                const language = lines[0].trim()
                const code = lines.slice(1).join('\n')

                if (['html', 'jsx', 'tsx', 'javascript'].includes(language)) {
                    setPreviewCode({
                        code: code.trim(),
                        language,
                        getHTMLPreview,
                        getReactPreview
                    })
                }
            }
        }
        return () => {
            if (!isLastMessage && setPreviewCode) {
                setPreviewCode(null)
            }
        }
    }, [content, isUserMessage, setPreviewCode, isLastMessage])

    // Simple lightweight token counter function (approximate)
    const countTokensLite = (text: string): number => {
        if (!text) return 0
        // Simple approximation: count words and add 20% for special tokens/punctuation
        return Math.ceil(text.split(/\s+/).length * 1.2)
    }

    return (
        <Box
            data-cy='message'
            data-role={role}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isUserMessage ? 'flex-end' : 'flex-start',
                maxWidth: isUserMessage ? '70%' : '100%',
                width: isUserMessage ? 'fit-content' : '100%',
                position: 'relative',
                mb: 3,
                minWidth: 0
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUserMessage ? 'flex-end' : 'flex-start',
                    width: '100%',
                    gap: 1,
                    minWidth: 0,
                    maxWidth: '100%'
                }}
            >
                {!isUserMessage && (
                    <Avatar
                        src='/static/images/logos/answerai-logo.png'
                        sx={{
                            bgcolor: 'primary.main',
                            height: '24px',
                            width: '24px',
                            padding: 0.5,
                            background: 'white'
                        }}
                        title='AI'
                    />
                )}

                {/* Agent Reasoning Section - Moved above message content and made collapsible */}
                {(other as any).agentReasoning &&
                    Array.isArray((other as any).agentReasoning) &&
                    (other as any).agentReasoning.length > 0 &&
                    (other as any).agentReasoning.map((agentObject: any) => {
                        return (
                            <CustomAccordion
                                defaultExpanded={agentObject?.messages?.length > 1}
                                key={agentObject.agentName}
                                sx={{
                                    p: 0,
                                    // bgcolor: 'rgba(0,0,0,0.15)',
                                    borderRadius: 1,
                                    boxShadow: 'none',
                                    '&:before': { display: 'none' },
                                    mb: 1
                                }}
                            >
                                <CustomAccordionSummary
                                    expandIcon={<ExpandMoreIcon sx={{ color: '#e0e0e0' }} width={16} height={16} />}
                                    sx={{
                                        p: 0,
                                        minHeight: '36px',
                                        '& .MuiAccordionSummary-content': {
                                            margin: '6px 0'
                                        }
                                    }}
                                >
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            color: '#e0e0e0',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {agentObject.agentName || 'Agent Reasoning'}
                                    </Typography>
                                </CustomAccordionSummary>
                                <CustomAccordionDetails sx={{ p: 0 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {/* Tools used section */}
                                        {agentObject.usedTools &&
                                            Array.isArray(agentObject.usedTools) &&
                                            agentObject.usedTools.length > 0 &&
                                            agentObject.usedTools[0] !== null && (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                                    {agentObject.usedTools.map(({ tool, toolInput }: any, idx) => {
                                                        if (!tool) return null
                                                        return (
                                                            // <Chip
                                                            //     key={idx}
                                                            //     label={typeof tool === 'string' ? tool : 'Tool'}
                                                            //     size='small'
                                                            //     variant='outlined'
                                                            //     sx={{
                                                            //         height: '20px',
                                                            //         fontSize: '0.65rem',
                                                            //         color: 'primary.light',
                                                            //         borderColor: 'rgba(25, 118, 210, 0.5)'
                                                            //     }}
                                                            // />
                                                            <Chip
                                                                key={`tool-${idx}`}
                                                                label={`Use ${tool} with ${Object.keys(toolInput)?.reduce((acc, key) => {
                                                                    return acc + `${key}: ${toolInput[key]}`
                                                                }, '')}`}
                                                                size='small'
                                                                sx={{
                                                                    height: '24px',
                                                                    bgcolor: 'rgba(0,0,0,0.3)',
                                                                    color: '#f48771',
                                                                    fontSize: '0.75rem',
                                                                    fontFamily: 'monospace',
                                                                    '& .MuiChip-label': { px: 1 }
                                                                }}
                                                            />
                                                        )
                                                    })}
                                                </Box>
                                            )}
                                        {/* Messages formatted as paragraph with pills */}
                                        {agentObject.messages && Array.isArray(agentObject.messages) && (
                                            <Box sx={{ mb: 1 }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        flexDirection: 'column',
                                                        gap: 0.75,
                                                        alignItems: 'center',
                                                        mb: 1
                                                    }}
                                                >
                                                    {agentObject.messages.map(
                                                        (
                                                            agentObjectMessage: Array<
                                                                | string
                                                                | {
                                                                      index: string
                                                                      text?: string
                                                                      type?: string
                                                                      input?: string
                                                                      name?: string
                                                                  }
                                                            >,
                                                            idx: number
                                                        ) => {
                                                            console.log(agentObjectMessage)
                                                            if (typeof agentObjectMessage === 'string') {
                                                                return (
                                                                    <Typography
                                                                        key={`text-${idx}`}
                                                                        variant='body2'
                                                                        component='span'
                                                                        sx={{ color: '#e0e0e0', lineHeight: 1.5 }}
                                                                    >
                                                                        {agentObjectMessage}
                                                                    </Typography>
                                                                )
                                                            }
                                                            if (agentObjectMessage.length) {
                                                                return (
                                                                    <Typography
                                                                        key={`text-${idx}`}
                                                                        variant='body2'
                                                                        component='span'
                                                                        sx={{
                                                                            width: '100%',
                                                                            color: '#e0e0e0',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: 0.5,
                                                                            lineHeight: 1.5
                                                                        }}
                                                                    >
                                                                        {Array.isArray(agentObjectMessage) &&
                                                                            agentObjectMessage?.map((message) => {
                                                                                if (message.text) return message.text

                                                                                if (message.type === 'tool_use' && message.name) {
                                                                                    const input = message?.input
                                                                                        ? JSON.parse(message.input)
                                                                                        : {}
                                                                                    return (
                                                                                        <Chip
                                                                                            key={`tool-${idx}`}
                                                                                            label={`Use ${message.name} with ${Object.keys(
                                                                                                input
                                                                                            )?.reduce((acc, key) => {
                                                                                                return acc + `${key}: ${input[key]}`
                                                                                            }, '')}`}
                                                                                            size='small'
                                                                                            sx={{
                                                                                                display: 'block',
                                                                                                height: '24px',
                                                                                                width: 'fit-content',
                                                                                                bgcolor: 'rgba(0,0,0,0.3)',
                                                                                                color: '#f48771',
                                                                                                fontSize: '0.75rem',
                                                                                                fontFamily: 'monospace',
                                                                                                '& .MuiChip-label': { px: 1 }
                                                                                            }}
                                                                                        />
                                                                                    )
                                                                                }
                                                                            })}
                                                                    </Typography>
                                                                )
                                                            }

                                                            return null
                                                        }
                                                    )}
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Artifacts section */}
                                        {agentObject.artifacts &&
                                            Array.isArray(agentObject.artifacts) &&
                                            agentObject.artifacts.length > 0 &&
                                            agentObject.artifacts[0] !== null && (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    <Typography
                                                        variant='caption'
                                                        component='span'
                                                        sx={{
                                                            color: '#9e9e9e',
                                                            mr: 0.5,
                                                            alignSelf: 'center'
                                                        }}
                                                    >
                                                        Artifacts:
                                                    </Typography>
                                                    {agentObject.artifacts.map((artifact, idx) => {
                                                        if (!artifact) return null
                                                        return (
                                                            <Chip
                                                                key={idx}
                                                                label={typeof artifact.name === 'string' ? artifact.name : 'Artifact'}
                                                                size='small'
                                                                variant='outlined'
                                                                sx={{
                                                                    height: '20px',
                                                                    fontSize: '0.65rem',
                                                                    color: 'success.light',
                                                                    borderColor: 'rgba(76, 175, 80, 0.5)'
                                                                }}
                                                                onClick={() =>
                                                                    artifact.data &&
                                                                    onSourceDialogClick(
                                                                        artifact.data,
                                                                        `${typeof artifact.name === 'string' ? artifact.name : 'Artifact'}`
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    })}
                                                </Box>
                                            )}
                                    </Box>
                                </CustomAccordionDetails>
                            </CustomAccordion>
                        )
                    })}

                {/* Files and Audio section */}
                {parsedFileUploads?.length > 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            width: '100%'
                        }}
                    >
                        {parsedFileUploads.map((file: FileUpload, index: number) => (
                            <Box
                                key={index}
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    maxWidth: '100%',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    ...(file.mime?.startsWith('audio/')
                                        ? {}
                                        : {
                                              bgcolor: 'background.paper',
                                              boxShadow: 1
                                          })
                                }}
                            >
                                {file.mime?.startsWith('image/') ? (
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            height: '200px',
                                            borderRadius: 1,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <Image
                                            src={file.preview || file.data}
                                            alt={file.name || 'Uploaded image'}
                                            layout='fill'
                                            objectFit='contain'
                                        />
                                    </Box>
                                ) : file.mime?.startsWith('audio/') ? (
                                    <Box sx={{ width: '100%' }}>
                                        <audio controls src={file.data} style={{ width: '100%' }}>
                                            <track kind='captions' src={file.data} />
                                        </audio>
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: 1,
                                            width: '100%'
                                        }}
                                    >
                                        <AttachFileIcon />
                                        <Typography variant='body2' noWrap>
                                            {file.name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Message content bubble */}
                {hasContent && content && typeof content === 'string' && content !== '[object Object]' ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            bgcolor: isUserMessage ? 'primary.main' : 'transparent',
                            borderRadius: isUserMessage ? 2 : 0,
                            px: isUserMessage ? 2 : 0,
                            py: isUserMessage ? 1 : 0,
                            width: '100%',
                            maxWidth: '100%',
                            minWidth: 0,
                            overflowX: 'hidden',
                            '& > *': {
                                maxWidth: '100%'
                            }
                        }}
                    >
                        <Typography
                            variant='body1'
                            color={isUserMessage ? 'white' : '#E0E0E0'}
                            component='div'
                            sx={{
                                overflow: 'hidden',
                                fontSize: '0.875rem',
                                lineHeight: 1.75,
                                width: '100%',
                                '& > *': {
                                    maxWidth: '100%'
                                },
                                img: {
                                    maxWidth: '100%',
                                    margin: 'auto',
                                    mt: 2
                                },
                                'p,pre,h1,h2,h3,h4,h5,h6,ul,ol': {
                                    ':not(:first-of-type)': {
                                        mt: 2
                                    }
                                },
                                'ul,ol': {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                }
                            }}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: (paragraph: any) => {
                                        const { node } = paragraph

                                        if (node.children[0].tagName === 'img') {
                                            const image = node.children[0]
                                            const metastring = image.properties.alt
                                            const alt = metastring?.replace(/ *\{[^)]*\} */g, '')
                                            const metaWidth = metastring.match(/{([^}]+)x/)
                                            const metaHeight = metastring.match(/x([^}]+)}/)
                                            const width = metaWidth ? metaWidth[1] : undefined
                                            const height = metaHeight ? metaHeight[1] : undefined
                                            const isPriority = metastring?.toLowerCase().match('{priority}')
                                            const hasCaption = metastring?.toLowerCase().includes('{caption:')
                                            const caption = metastring?.match(/{caption: (.*?)}/)?.pop()

                                            return (
                                                <Box
                                                    component='a'
                                                    href={image.properties.src}
                                                    target='_blank'
                                                    sx={{
                                                        display: 'block',
                                                        height: '40vh',
                                                        width: '100%',
                                                        img: { objectFit: 'contain' }
                                                    }}
                                                >
                                                    <Image
                                                        src={image.properties.src}
                                                        // width={width}
                                                        // height={height}
                                                        layout='fill'
                                                        className='postImg'
                                                        alt={alt}
                                                        priority={isPriority}
                                                    />
                                                    {hasCaption ? (
                                                        <div className='caption' aria-label={caption}>
                                                            {caption}
                                                        </div>
                                                    ) : null}
                                                </Box>
                                            )
                                        }
                                        return <p>{paragraph.children}</p>
                                    },

                                    a: ({ node, ...props }) => (
                                        <a {...props} target={openLinksInNewTab ? '_blank' : '_self'} rel='noopener noreferrer'>
                                            {props.children}
                                        </a>
                                    ),

                                    code({ node, inline, className, children, ...props }) {
                                        const codeExample = String(children).replace(/\n$/, '')

                                        if (!inline) {
                                            const language = getLanguageFromClassName(className)
                                            const canPreview =
                                                ['html', 'jsx', 'tsx'].includes(language) ||
                                                (language === 'javascript' && isReactComponent(codeExample))

                                            // Show all non-inline code as CodeCard
                                            return (
                                                <Box sx={{ my: 2 }}>
                                                    <CodeCard
                                                        code={codeExample}
                                                        language={language}
                                                        title='Code'
                                                        onCopy={() => handleCopyCodeClick(codeExample)}
                                                        onPreview={() =>
                                                            setPreviewCode?.({
                                                                code: codeExample,
                                                                language,
                                                                getHTMLPreview,
                                                                getReactPreview
                                                            })
                                                        }
                                                        expandable={true}
                                                    />
                                                </Box>
                                            )
                                        }

                                        return (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </Typography>
                    </Box>
                ) : null}
            </Box>

            {(other as any).action && (
                <Box sx={{ mt: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    {(other as any).action.text && (
                        <Typography variant='body1' sx={{ mb: 1 }}>
                            {(other as any).action.text}
                        </Typography>
                    )}
                    {(other as any).action.elements && (other as any).action.elements.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {(other as any).action.elements.map((element: any, idx: number) => {
                                const isApprove = element.type === 'approve-button' || element.label === 'YES' || element.label === 'Yes'
                                const isReject = element.type === 'reject-button' || element.label === 'NO' || element.label === 'No'

                                return (
                                    <Button
                                        key={idx}
                                        variant={element.style === 'primary' ? 'contained' : 'outlined'}
                                        color={
                                            isApprove ? 'success' : isReject ? 'error' : element.style === 'danger' ? 'error' : 'primary'
                                        }
                                        sx={{
                                            minWidth: '80px',
                                            fontWeight: 'bold',
                                            borderRadius: '20px'
                                        }}
                                        startIcon={isApprove ? '✓' : isReject ? '✗' : null}
                                        onClick={async (e) => {
                                            e.preventDefault()
                                            e.stopPropagation()

                                            try {
                                                // For direct button action handlers
                                                if (element.type === 'button' && typeof element.onClick === 'function') {
                                                    element.onClick()
                                                    return
                                                }

                                                // Clear the action from the current message (consistent with ChatMessage behavior)
                                                if (id && messages) {
                                                    const updatedMessages = messages.map((msg) => {
                                                        if (msg.id === id) {
                                                            return { ...msg, action: null }
                                                        }
                                                        return msg
                                                    })
                                                    // NOTE: We don't need to manually update messages here as the context will handle it
                                                }

                                                // Call the sendMessage function with the element's label and action
                                                await sendMessage({
                                                    content: element.label,
                                                    sidekick,
                                                    action: (other as any).action
                                                })

                                                console.log(`Action clicked: ${element.label}`)
                                            } catch (err) {
                                                console.error('Error handling action click:', err)
                                            }
                                        }}
                                    >
                                        {element.label}
                                    </Button>
                                )
                            })}
                        </Box>
                    )}
                </Box>
            )}

            {sourceDialogOpen && sourceDialogProps && (
                <Dialog open={sourceDialogOpen} onClose={() => setSourceDialogOpen(false)} maxWidth='md' fullWidth>
                    <DialogTitle>{sourceDialogProps.title || 'Source'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {typeof sourceDialogProps.data === 'string'
                                    ? sourceDialogProps.data
                                    : JSON.stringify(sourceDialogProps.data, null, 2)}
                            </pre>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSourceDialogOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}

            {(role === 'assistant' || role === 'apiMessage') && isFeedbackAllowed && !isLoading ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.5
                    }}
                >
                    {lastInteraction ? (
                        <IconButton disabled size='small' sx={{ p: 0.5 }}>
                            {lastInteraction == 'thumbsUp' ? (
                                <ThumbUpIcon sx={{ fontSize: 14 }} />
                            ) : (
                                <ThumbDownIcon sx={{ fontSize: 14 }} />
                            )}
                        </IconButton>
                    ) : (
                        <>
                            <IconButton
                                color={lastInteraction === 'thumbsUp' ? 'secondary' : 'default'}
                                size='small'
                                data-cy='like-button'
                                onClick={(event) => {
                                    event.stopPropagation()
                                    event.preventDefault()
                                    handleReview('thumbsUp')
                                }}
                                sx={{ p: 0.5 }}
                            >
                                <ThumbUpIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                                size='small'
                                color={lastInteraction === 'thumbsDown' ? 'secondary' : 'default'}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    event.preventDefault()
                                    handleReview('thumbsDown')
                                }}
                                sx={{ p: 0.5 }}
                            >
                                <ThumbDownIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </>
                    )}
                </Box>
            ) : null}

            {developer_mode?.enabled ? (
                <Box>
                    {sourceDocuments?.length ? (
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>
                                    Source Documents ({countTokensLite(sourceDocuments?.map((d) => d.pageContent)?.join('/n'))} Tokens)
                                </Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <Typography sx={{ whiteSpace: 'pre-line' }} variant='body1' color='text.secondary' component='div'>
                                    {sourceDocuments?.map((d) => d.pageContent)?.join('/n')}
                                </Typography>
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}

                    {summary ? (
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Summary ({summary?.length})</Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <Typography sx={{ whiteSpace: 'pre-line' }} variant='body1' color='text.secondary' component='div'>
                                    {summary}
                                </Typography>
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}

                    {pineconeData ? (
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Pinecone Data</Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <JsonViewer
                                    rootName='pineconeData'
                                    value={{
                                        filters,
                                        pineconeData
                                    }}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}

                    {completionRequest ? (
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Completion request</Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <JsonViewer
                                    rootName='completionRequest'
                                    value={completionRequest}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}

                    {completionData ? (
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Completion</Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <JsonViewer
                                    rootName=''
                                    value={completionData}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}

                    {Object.keys(other)?.length ? (
                        // Use the @mui accordion component to wrap the extra and response
                        <CustomAccordion TransitionProps={{ unmountOnExit: true }}>
                            <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Extra</Typography>
                            </CustomAccordionSummary>
                            <CustomAccordionDetails>
                                <JsonViewer
                                    rootName=''
                                    value={other}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </CustomAccordionDetails>
                        </CustomAccordion>
                    ) : null}
                </Box>
            ) : null}
            {Object.keys(contextDocumentsBySource)?.length ? (
                <>
                    <Divider />
                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.8,
                            mt: 1.5
                        }}
                    >
                        {Object.entries(contextDocumentsBySource)?.map(([source, documents]) => {
                            const doc = documents?.[0]
                            return (
                                <Tooltip key={`references-${doc.metadata.url ?? doc.metadata.source}`} title={'Click to view details'}>
                                    <Box
                                        onClick={() => setSelectedDocuments?.(documents)}
                                        sx={{
                                            textTransform: 'none',
                                            borderRadius: 20,
                                            color: 'text.secondary',
                                            border: '1px solid',
                                            borderColor: 'text.secondary',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            gap: 1,
                                            fontSize: '0.8125rem',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)'
                                            }
                                        }}
                                    >
                                        {services[doc.source ?? doc.metadata?.source]?.imageURL ? (
                                            <Avatar
                                                variant='source'
                                                src={services[doc.source ?? doc.metadata?.source]?.imageURL}
                                                sx={{ width: 20, height: 20 }}
                                            />
                                        ) : (
                                            <Avatar variant='source' src={services['document']?.imageURL} sx={{ width: 20, height: 20 }} />
                                        )}
                                        {getDocumentLabel(doc)}
                                    </Box>
                                </Tooltip>
                            )
                        })}
                    </Box>
                </>
            ) : null}
            {/* Tools used section */}

            {usedTools?.map(({ tool, toolInput, toolOutput }: any, idx) => {
                if (!tool) return null
                return (
                    <CustomAccordion
                        key={`tool-${idx}`}
                        sx={{
                            p: 0,
                            borderRadius: 1,
                            boxShadow: 'none',
                            '&:before': { display: 'none' },

                            mb: '8px!important',
                            mt: '8px!important'
                        }}
                    >
                        <CustomAccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: '#e0e0e0' }} width={16} height={16} />}
                            sx={{
                                p: 0,
                                minHeight: '36px'
                            }}
                        >
                            <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {`${tool} ${Object.entries(toolInput)
                                    .map(([key, value]) => `"${value}"`)
                                    .join(', ')}`}
                            </Typography>
                        </CustomAccordionSummary>
                        <CustomAccordionDetails sx={{ p: 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                <Typography variant='body2'>
                                    <pre>{JSON.stringify(toolOutput, null, 2)}</pre>
                                </Typography>
                            </Box>
                        </CustomAccordionDetails>
                    </CustomAccordion>
                )
            })}
        </Box>
    )
}
