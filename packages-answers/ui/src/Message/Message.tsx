'use client'
import React, { useState } from 'react'
import { AxiosError } from 'axios'
import { useFlags } from 'flagsmith/react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { duotoneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Image from 'next/image'
import { JsonViewer } from '@textea/json-viewer'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardMedia from '@mui/material/CardMedia'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ContentCopy from '@mui/icons-material/ContentCopy'
import LinkIcon from '@mui/icons-material/Link'
import AttachFileIcon from '@mui/icons-material/AttachFile'

import { countTokens } from '@utils/utilities/countTokens'

import { useAnswers } from '../AnswersContext'
import { Accordion, AccordionSummary, AccordionDetails } from '../Accordion'
import FeedbackModal from '@ui/FeedbackModal'
import { AppService, Document, Message, FileUpload } from 'types'
import { Rating } from 'db/generated/prisma-client'
import { CircularProgress, Tooltip } from '@mui/material'

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
}
interface MessageCardProps extends Partial<Message>, MessageExtra {
    error?: AxiosError<MessageExtra>

    role: string
}

const getLanguageFromClassName = (className: string | undefined) => {
    if (!className) return 'text'
    const match = className.match(/language-(\w+)/)
    return match ? match[1] : 'text'
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
    ...other
}: MessageCardProps) => {
    other = { ...other, role, user } as any
    const { developer_mode } = useFlags(['developer_mode']) // only causes re-render if specified flag values / traits change
    const { user: currentUser, sendMessageFeedback, appSettings } = useAnswers()
    const contextDocumentsBySource: Record<string, Document[]> = React.useMemo(
        () =>
            contextDocuments?.reduce((uniqueDocuments: Record<string, Document[]>, current) => {
                const key = current.metadata.url ?? current.metadata.source
                return {
                    ...uniqueDocuments,
                    [key]: [...(uniqueDocuments[key] || []), current]
                }
            }, {}) ?? {},
        [contextDocuments]
    )
    const [showFeedback, setShowFeedback] = useState(false)
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

    const handleLike = async (evt: React.MouseEvent<HTMLButtonElement>) => {
        evt.stopPropagation()
        evt.preventDefault()
        setLastInteraction('thumbsUp')
        if (id) {
            try {
                const feedback = await sendMessageFeedback({
                    messageId: id,
                    rating: 'thumbsUp'
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

    const handleDislike = async (evt: React.MouseEvent<HTMLButtonElement>) => {
        evt.stopPropagation()
        evt.preventDefault()
        setLastInteraction('thumbsDown')
        if (id) {
            try {
                const feedback = await sendMessageFeedback({
                    messageId: id,
                    rating: 'thumbsDown'
                })
                setShowFeedback(true)
                // Show modal to ask for added feedback } catch (err) {
            } catch (err) {
                setLastInteraction(undefined)
            }
        }
    }

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

    return (
        <Box
            data-cy='message'
            data-role={role}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isUserMessage ? 'flex-end' : 'flex-start',
                maxWidth: isUserMessage ? '70%': '100%',
                width: '100%',
                position: 'relative',
                mb: 3,
                minWidth: 0,
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
                                    ...(file.mime?.startsWith('audio/') ? {} : {
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
                                            layout="fill"
                                            objectFit="contain"
                                        />
                                    </Box>
                                ) : file.mime?.startsWith('audio/') ? (
                                    <Box sx={{ width: '100%' }}>
                                        <audio 
                                            controls 
                                            src={file.data} 
                                            style={{ width: '100%' }}
                                        />
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
                                        <Typography variant="body2" noWrap>
                                            {file.name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Message content bubble */}
                {hasContent && content ? (
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
                                lineHeight: 1.5,
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

                                    code({ node, inline, className, children, ...props }) {
                                        const codeExample = String(children).replace(/\n$/, '')
                                        
                                        if (!inline) {
                                            const language = getLanguageFromClassName(className)
                                            return (
                                                <Box 
                                                    sx={{ 
                                                        position: 'relative',
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        width: '100%',
                                                        '& pre': {
                                                            m: 0,
                                                            borderRadius: 0,
                                                            backgroundColor: '#1E1E1E !important',
                                                            overflowX: 'auto',
                                                            width: '100%',
                                                            '& > div': {
                                                                minWidth: 'fit-content'
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            px: 2,
                                                            py: 1,
                                                            backgroundColor: '#2D2D2D',
                                                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                        <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                                color: 'rgba(255,255,255,0.7)',
                                                                textTransform: 'lowercase',
                                                                fontFamily: 'monospace'
                                                            }}
                                                        >
                                                            {language}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCopyCodeClick(codeExample)}
                                                            sx={{
                                                                color: 'rgba(255,255,255,0.7)',
                                                                '&:hover': {
                                                                    color: 'white',
                                                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                                                }
                                                            }}
                                                        >
                                                            <ContentCopy fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                    <SyntaxHighlighter 
                                                        language={language}
                                                        style={duotoneDark as any} 
                                                        customStyle={{
                                                            margin: 0,
                                                            padding: '16px',
                                                            backgroundColor: '#1E1E1E'
                                                        }}
                                                        PreTag='div'
                                                        {...props}
                                                    >
                                                        {codeExample}
                                                    </SyntaxHighlighter>
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

            {/* 
            // TODO: Add feedback buttons
            {!isUserMessage ? (
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
                                color={lastInteraction === 'like' ? 'secondary' : 'default'}
                                size='small'
                                data-cy='like-button'
                                onClick={handleLike}
                                sx={{ p: 0.5 }}
                            >
                                <ThumbUpIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                                size='small'
                                color={lastInteraction === 'dislike' ? 'secondary' : 'default'}
                                onClick={handleDislike}
                                sx={{ p: 0.5 }}
                            >
                                <ThumbDownIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </>
                    )}
                </Box>
            ) : null} */}

            {developer_mode?.enabled ? (
                <Box>
                    {contextDocuments?.length ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>
                                    Context ({countTokens(contextDocuments?.map((d) => d.pageContent)?.join('/n'))} Tokens)
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography sx={{ whiteSpace: 'pre-line' }} variant='body1' color='text.secondary' component='div'>
                                    {contextDocuments?.map((d) => d.pageContent)?.join('/n')}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ) : null}
                    {/* {error ? (
              <>
                <Accordion TransitionProps={{ unmountOnExit: true }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header">
                    <Typography variant="overline">Error</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <JsonViewer
                      rootName="error"
                      value={error}
                      theme={'dark'}
                      collapseStringsAfterLength={100}
                    />
                  </AccordionDetails>
                </Accordion>
              </>
            ) : null} */}

                    {summary ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Summary ({summary?.length})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography sx={{ whiteSpace: 'pre-line' }} variant='body1' color='text.secondary' component='div'>
                                    {summary}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ) : null}

                    {pineconeData ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Pinecone Data</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
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
                            </AccordionDetails>
                        </Accordion>
                    ) : null}

                    {completionRequest ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Completion request</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <JsonViewer
                                    rootName='completionRequest'
                                    value={completionRequest}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ) : null}

                    {completionData ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Completion</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <JsonViewer
                                    rootName=''
                                    value={completionData}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ) : null}

                    {Object.keys(other)?.length ? (
                        // Use the @mui accordion component to wrap the extra and response
                        <Accordion TransitionProps={{ unmountOnExit: true }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='panel1a-content' id='panel1a-header'>
                                <Typography variant='overline'>Extra</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <JsonViewer
                                    rootName=''
                                    value={other}
                                    theme={'dark'}
                                    // defaultInspectDepth={0}
                                    collapseStringsAfterLength={100}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ) : null}
                </Box>
            ) : null}
        </Box>
    )
}
