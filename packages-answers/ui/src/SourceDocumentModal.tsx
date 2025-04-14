'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { duotoneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { MessageFeedback, Document } from 'types'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

interface IFormInput extends Partial<MessageFeedback> {}

interface ModalProps {
    documents: Document[]
    onClose?: () => void
}

const SourceDocumentModal: React.FC<ModalProps> = ({ documents, onClose }) => {
    const router = useRouter()

    const [open, setOpen] = useState(true)
    const [loading, setLoading] = useState(false)

    const handleClose = () => {
        if (onClose) onClose()
        setOpen(false)
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

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                height: '100%'
            }}
        >
            <Paper
                sx={{
                    width: '100%',

                    background: 'none',
                    backgroundColor: 'background.paper',
                    outline: 'none',

                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    overflowY: 'auto'
                }}
            >
                <Box
                    sx={{
                        position: 'sticky',
                        background: 'none',
                        backgroundColor: 'background.paper',
                        top: 0,
                        zIndex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        p: 2,
                        height: 64
                    }}
                >
                    <Typography variant='h6' component='h3'>
                        {getDocumentLabel(documents[0])}
                    </Typography>
                    <IconButton onClick={handleClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, p: 2 }}>
                    {documents.map((doc, index) => (
                        <Box
                            key={index}
                            sx={{
                                borderBottom: index === documents.length - 1 ? 'none' : '1px solid',
                                borderColor: 'grey.500',
                                color: 'grey.500',
                                py: 2
                            }}
                        >
                            {doc.metadata.source && (
                                <Typography variant='body2' component='p'>
                                    Source: {doc.metadata.source}
                                </Typography>
                            )}
                            {doc.metadata.url && (
                                <Typography variant='body2' component='p'>
                                    Link:
                                    <a href={doc.metadata.url} target='_blank' rel='noreferrer'>
                                        {doc.metadata.url}
                                    </a>
                                </Typography>
                            )}
                            {doc.metadata.pdf?.totalPages && (
                                <Typography variant='body2' component='p'>
                                    Total Pages: {doc.metadata.pdf?.totalPages}
                                </Typography>
                            )}
                            {doc.metadata.loc?.pageNumber && (
                                <Typography variant='body2' component='p'>
                                    Page Number: {doc.metadata.loc?.pageNumber}
                                </Typography>
                            )}
                            {doc.pageContent && (
                                <>
                                    <Typography variant='body2' component='div' sx={{ mt: 1, width: '100%', whiteSpace: 'pre-line' }}>
                                        Page Content:
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
                                                                    img: { objectFit: 'contain', width: '100%' }
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
                                                            {/* <IconButton
                                sx={{ position: 'absolute', bottom: 16, right: 16 }}
                                onClick={() => handleCopyCodeClick(codeExample)}>
                                <ContentCopy />
                              </IconButton> */}
                                                        </Box>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }
                                            }}
                                        >
                                            {doc.pageContent}
                                        </ReactMarkdown>{' '}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    ))}
                </Box>

                {loading && <LinearProgress variant='query' sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} />}
            </Paper>
        </Box>
    )
}

export default SourceDocumentModal
