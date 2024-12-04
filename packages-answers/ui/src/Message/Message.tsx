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
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardMedia from '@mui/material/CardMedia'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ContentCopy from '@mui/icons-material/ContentCopy'
import LinkIcon from '@mui/icons-material/Link'

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {showFeedback && id ? <FeedbackModal messageId={id} rating={lastInteraction!} onClose={() => setShowFeedback(false)} /> : null}

            <Card
                data-cy='message'
                data-role={role}
                sx={{
                    borderRadius: 0,
                    position: 'relative',
                    ...(isLoading && {
                        mb: 10
                    })
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: 'flex',
                        gap: 1,
                        // px: isWidget ? 1 : 1,
                        // py: isWidget ? 1 : 1,
                        width: '100%',
                        flexDirection: isWidget ? 'column' : 'row'
                    }}
                >
                    <CardContent
                        sx={{
                            position: 'relative',
                            gap: 2,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                            // p: 0
                        }}
                    >
                        <Box sx={{ gap: 2, display: 'flex' }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <Avatar
                                    src={
                                        isUserMessage
                                            ? currentUser?.picture ?? currentUser?.image!
                                            : '/static/images/logos/answerai-logo.png'
                                    }
                                    sx={{
                                        bgcolor: isUserMessage ? 'secondary.main' : 'primary.main',
                                        height: isWidget ? '24px' : '32px',
                                        width: isWidget ? '24px' : '32px',
                                        ...(!isUserMessage && {
                                            padding: 1,
                                            background: 'white'
                                        })
                                    }}
                                    title={!isUserMessage ? 'AI' : user?.name?.charAt(0)}
                                />
                                {isLoading && (
                                    <CircularProgress
                                        size={isWidget ? 26 : 36}
                                        sx={{
                                            color: 'primary.main',
                                            position: 'absolute',
                                            top: -2,
                                            left: -2,
                                            zIndex: 1
                                        }}
                                    />
                                )}
                            </Box>
                            {hasContent && content ? (
                                <>
                                    {parsedFileUploads.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                                            {parsedFileUploads.map((file, index) => (
                                                <React.Fragment key={index}>
                                                    {file.mime?.startsWith('image/') ? (
                                                        <Card
                                                            sx={{
                                                                p: 0,
                                                                m: 0,
                                                                maxWidth: 128,
                                                                marginRight: '10px',
                                                                flex: '0 0 auto'
                                                            }}
                                                        >
                                                            <CardMedia
                                                                component='img'
                                                                image={file.data}
                                                                sx={{ height: 64 }}
                                                                alt={'preview'}
                                                                style={{ objectFit: 'cover' }}
                                                            />
                                                        </Card>
                                                    ) : file.mime?.startsWith('audio/') ? (
                                                        <audio controls='controls'>
                                                            Your browser does not support the <code>audio</code> tag.
                                                            <source src={file.data} type={file.mime} />
                                                        </audio>
                                                    ) : file.type === 'url' ? (
                                                        <Button
                                                            variant='outlined'
                                                            href={file.data}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                            startIcon={<LinkIcon />}
                                                        >
                                                            {file.name}
                                                        </Button>
                                                    ) : null}
                                                </React.Fragment>
                                            ))}
                                        </Box>
                                    )}
                                    <Typography
                                        variant='body1'
                                        color='text.secondary'
                                        component='div'
                                        sx={{
                                            overflow: 'hidden',
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
                                                    return !inline ? (
                                                        <Box sx={{ position: 'relative' }}>
                                                            <SyntaxHighlighter style={duotoneDark as any} PreTag='div' {...props}>
                                                                {codeExample}
                                                            </SyntaxHighlighter>
                                                            <IconButton
                                                                sx={{ position: 'absolute', bottom: 16, right: 16 }}
                                                                onClick={() => handleCopyCodeClick(codeExample)}
                                                            >
                                                                <ContentCopy />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
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
                                </>
                            ) : null}
                        </Box>

                        {Object.keys(contextDocumentsBySource)?.length ? (
                            <>
                                <Divider />
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 1
                                    }}
                                >
                                    <Typography variant='body2'>References:</Typography>
                                    {Object.entries(contextDocumentsBySource)?.map(([source, documents]) => {
                                        const doc = documents?.[0]
                                        return (
                                            <Tooltip
                                                key={`references-${doc.metadata.url ?? doc.metadata.source}`}
                                                title={'Click to view details'}
                                            >
                                                <Button
                                                    onClick={() => setSelectedDocuments(documents)}
                                                    size='small'
                                                    // disabled={!doc.metadata.url}
                                                    variant='outlined'
                                                    color='inherit'
                                                    sx={{
                                                        textTransform: 'none',
                                                        borderRadius: 20,
                                                        color: 'text.secondary',
                                                        borderColor: 'text.secondary',
                                                        '&:hover': { textDecoration: 'none' }
                                                    }}
                                                    startIcon={
                                                        services[doc.source ?? doc.metadata?.source]?.imageURL ? (
                                                            <Avatar
                                                                variant='source'
                                                                src={services[doc.source ?? doc.metadata?.source]?.imageURL}
                                                                sx={{ width: 20, height: 20 }}
                                                            />
                                                        ) : (
                                                            <Avatar
                                                                variant='source'
                                                                src={services['document']?.imageURL}
                                                                sx={{ width: 20, height: 20 }}
                                                            />
                                                        )
                                                    }
                                                >
                                                    {getDocumentLabel(doc)}
                                                </Button>
                                            </Tooltip>
                                        )
                                    })}
                                </Box>
                            </>
                        ) : null}
                    </CardContent>

                    {!isUserMessage ? (
                        <CardActions
                            sx={{
                                zIndex: 1000,
                                position: 'absolute',
                                bottom: isWidget ? 'auto' : 0,
                                top: isWidget ? 0 : '100%',
                                right: 8
                            }}
                        >
                            {lastInteraction ? (
                                <IconButton disabled size='small'>
                                    {lastInteraction == 'thumbsUp' ? (
                                        <ThumbUpIcon sx={{ fontSize: 16 }} />
                                    ) : (
                                        <ThumbDownIcon sx={{ fontSize: 16 }} />
                                    )}
                                </IconButton>
                            ) : (
                                <>
                                    <IconButton
                                        color={lastInteraction === 'like' ? 'secondary' : 'default'}
                                        size='small'
                                        data-cy='like-button'
                                        onClick={handleLike}
                                    >
                                        <ThumbUpIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        color={lastInteraction === 'dislike' ? 'secondary' : 'default'}
                                        onClick={handleDislike}
                                    >
                                        <ThumbDownIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </>
                            )}
                        </CardActions>
                    ) : null}
                </Box>

                {/* {context ? (
          // Use the @mui accordion component to wrap the context and response
          <Accordion TransitionProps={{ unmountOnExit: true }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header">
              <Typography variant="overline">Context ({countTokens(context)} Tokens)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                sx={{ whiteSpace: 'pre-line' }}
                variant="body1"
                color="text.secondary"
                component="div">
                {context}
              </Typography>
            </AccordionDetails>
          </Accordion>
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
            </Card>
        </Box>
    )
}
