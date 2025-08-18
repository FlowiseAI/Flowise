import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Box, Link } from '@mui/material'
import { IconDownload } from '@tabler/icons-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getHTMLPreview, getReactPreview, isReactComponent } from '../utils/previewUtils'

const CodeCard = dynamic(() => import('./CodeCard').then((mod) => ({ default: mod.CodeCard })))

interface SimpleMarkdownProps {
    content: string
    openLinksInNewTab?: boolean
    setPreviewCode?: (
        preview: {
            code: string
            language: string
            getHTMLPreview: (code: string) => string
            getReactPreview: (code: string) => string
        } | null
    ) => void
}

const getLanguageFromClassName = (className: string | undefined) => {
    if (!className) return 'text'
    const match = className.match(/language-(\w+)/)
    return match ? match[1] : 'text'
}

const handleCopyCodeClick = (codeString: string) => {
    navigator.clipboard.writeText(codeString)
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content, openLinksInNewTab, setPreviewCode }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Table components with proper Material-UI dark theme styling
                table: ({ children, ...props }) => (
                    <Box
                        component='table'
                        sx={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 1,
                            overflow: 'hidden',
                            my: 2,
                            '& th, & td': {
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                                textAlign: 'left',
                                verticalAlign: 'top'
                            },
                            '& th': {
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                fontWeight: 600,
                                color: '#E0E0E0',
                                borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                            },
                            '& td': {
                                color: '#E0E0E0',
                                fontSize: '0.875rem'
                            },
                            '& tr:last-child td': {
                                borderBottom: 'none'
                            },
                            '& tr:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.04)'
                            }
                        }}
                        {...props}
                    >
                        {children}
                    </Box>
                ),

                // Handle links
                a: ({ ...props }) => (
                    <a {...props} target={openLinksInNewTab ? '_blank' : '_self'} rel='noopener noreferrer'>
                        {props.children}
                    </a>
                ),

                // Handle images and paragraphs properly
                p: ({ children, node, ...props }: any) => {
                    if (node?.children?.[0]?.tagName === 'img') {
                        const image = node.children[0]
                        const metastring = image.properties?.alt
                        // Fix regex vulnerabilities by using string manipulation instead of regex
                        const safeMeta = metastring?.slice(0, 1000) || '' // Limit length to prevent DoS
                        // Remove metadata patterns by finding and removing {...} blocks safely
                        let alt = safeMeta
                        let startIndex = alt.indexOf('{')
                        while (startIndex !== -1) {
                            const endIndex = alt.indexOf('}', startIndex)
                            if (endIndex !== -1) {
                                alt = alt.slice(0, startIndex) + alt.slice(endIndex + 1)
                                startIndex = alt.indexOf('{', startIndex)
                            } else {
                                break
                            }
                        }
                        alt = alt.trim()
                        const metaWidth = safeMeta.match(/\{([^}]{1,10})x/)
                        const metaHeight = safeMeta.match(/x([^}]{1,10})\}/)
                        const width = metaWidth ? metaWidth[1] : undefined
                        const height = metaHeight ? metaHeight[1] : undefined
                        const isPriority = safeMeta.toLowerCase().includes('{priority}')
                        const hasCaption = safeMeta.toLowerCase().includes('{caption:')
                        const captionMatch = safeMeta.match(/\{caption:\s*([^}]{0,200})\}/)
                        const caption = captionMatch ? captionMatch[1].trim() : undefined

                        return (
                            <Box
                                sx={{
                                    display: 'block',
                                    position: 'relative',
                                    width: '100%'
                                }}
                            >
                                <Image
                                    src={image.properties.src}
                                    width={width || 700}
                                    height={height || 400}
                                    layout='responsive'
                                    objectFit='contain'
                                    className='postImg'
                                    alt={alt}
                                    priority={isPriority}
                                />
                                {hasCaption ? (
                                    <div className='caption' aria-label={caption}>
                                        {caption}
                                    </div>
                                ) : null}
                                <Box sx={{ mt: 1, textAlign: 'center' }}>
                                    <Link
                                        href={image.properties.src}
                                        download
                                        target='_blank'
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            fontSize: '0.875rem',
                                            textDecoration: 'none',
                                            '&:hover': {
                                                textDecoration: 'underline'
                                            }
                                        }}
                                    >
                                        <IconDownload size={16} />
                                        Download Image
                                    </Link>
                                </Box>
                            </Box>
                        )
                    }
                    return (
                        <Box component='p' sx={{ mb: 1 }} {...props}>
                            {children}
                        </Box>
                    )
                },

                // Handle code blocks with CodeCard for interactive preview
                code: ({ node, inline, className, children, ...props }) => {
                    const codeExample = String(children).replace(/\n$/, '')

                    if (!inline) {
                        const language = getLanguageFromClassName(className)
                        const canPreview =
                            ['html', 'jsx', 'tsx'].includes(language) || (language === 'javascript' && isReactComponent(codeExample))

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
                        <Box
                            component='code'
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: '2px 6px',
                                borderRadius: 0.5,
                                fontSize: '0.875rem',
                                fontFamily: 'monospace'
                            }}
                            {...props}
                        >
                            {children}
                        </Box>
                    )
                }
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
