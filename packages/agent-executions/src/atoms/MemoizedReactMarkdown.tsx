import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { CodeBlock } from './CodeBlock'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeMathjax from 'rehype-mathjax'
import '../assets/Markdown.css'

const containsLaTeX = (text: string, customPatterns: { regex: RegExp; name: string }[] = []): boolean => {
    if (!text || typeof text !== 'string') return false

    const defaultPatterns = [
        { regex: /\$\$.+?\$\$/s, name: 'Block math: $$...$$' },
        { regex: /\\\(.+?\\\)/s, name: 'Inline math: \\(...\\)' },
        { regex: /\\\[[\s\S]*?\\\]/, name: 'Display math: \\[...\\]' },
        { regex: /\\begin{(equation|align|gather|math|matrix|bmatrix|pmatrix|vmatrix|cases)}.+?\\end{\1}/s, name: 'Environment math' },
        { regex: /\$(.*?[\\{}_^].*?)\$/, name: 'Inline math with $' },
        { regex: /\\frac/, name: 'LaTeX command: \\frac' },
        { regex: /\\sqrt/, name: 'LaTeX command: \\sqrt' },
        { regex: /\\pm/, name: 'LaTeX command: \\pm' },
        { regex: /\\cdot/, name: 'LaTeX command: \\cdot' },
        { regex: /\\text/, name: 'LaTeX command: \\text' },
        { regex: /\\sum/, name: 'LaTeX command: \\sum' },
        { regex: /\\prod/, name: 'LaTeX command: \\prod' },
        { regex: /\\int/, name: 'LaTeX command: \\int' }
    ]

    const patterns = [...defaultPatterns, ...customPatterns]
    for (const pattern of patterns) {
        if (pattern.regex.test(text)) return true
    }
    return false
}

const preprocessLatex = (text: string): string => {
    if (!text || typeof text !== 'string') return text

    return text
        .replace(/(\n\s*)\\\[([\s\S]*?)\\\](\s*\n|$)/g, (_match, before, content, after) => {
            return `${before}$$${content}$$${after}`
        })
        .replace(/\\\(([\s\S]*?)\\\)/g, '$ $1 $')
}

interface MemoizedReactMarkdownProps {
    children: string
    chatflowid?: string
    isFullWidth?: boolean
    remarkPlugins?: unknown[]
    rehypePlugins?: unknown[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components?: Record<string, any>
    forceMath?: boolean
    disableMath?: boolean
    mathPatterns?: { regex: RegExp; name: string }[]
}

export const MemoizedReactMarkdown = memo(
    ({ children, ...props }: MemoizedReactMarkdownProps) => {
        const processedChildren = useMemo(() => (typeof children === 'string' ? preprocessLatex(children) : children), [children])

        const shouldEnableMath = useMemo(() => {
            const hasLatex = processedChildren && containsLaTeX(processedChildren, props.mathPatterns || [])
            return props.disableMath === true ? false : props.forceMath || hasLatex
        }, [processedChildren, props.forceMath, props.disableMath, props.mathPatterns])

        const remarkPluginsResolved = useMemo(() => {
            if (props.remarkPlugins) return props.remarkPlugins
            return shouldEnableMath ? [remarkGfm, remarkMath] : [remarkGfm]
        }, [props.remarkPlugins, shouldEnableMath])

        const rehypePluginsResolved = useMemo(() => {
            if (props.rehypePlugins) return props.rehypePlugins
            return shouldEnableMath ? [rehypeMathjax] : []
        }, [props.rehypePlugins, shouldEnableMath])

        return (
            <div className='react-markdown'>
                <ReactMarkdown
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    remarkPlugins={remarkPluginsResolved as any[]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rehypePlugins={rehypePluginsResolved as any[]}
                    components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        code({ inline, className, children: codeChildren, ...codeProps }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline ? (
                                <CodeBlock
                                    key={Math.random()}
                                    chatflowid={props.chatflowid}
                                    isFullWidth={props.isFullWidth !== undefined ? props.isFullWidth : true}
                                    language={(match && match[1]) || ''}
                                    value={String(codeChildren).replace(/\n$/, '')}
                                    {...codeProps}
                                />
                            ) : (
                                <code className={className} {...codeProps}>
                                    {codeChildren}
                                </code>
                            )
                        },
                        p({ children: pChildren }: { children: React.ReactNode }) {
                            return <p style={{ whiteSpace: 'pre-line' }}>{pChildren}</p>
                        },
                        ...props.components
                    }}
                    {...props}
                >
                    {processedChildren}
                </ReactMarkdown>
            </div>
        )
    },
    (prevProps, nextProps) => {
        if (prevProps.children !== nextProps.children) return false
        const prevEntries = Object.entries(prevProps).filter(([key]) => key !== 'children')
        const nextEntries = Object.entries(nextProps).filter(([key]) => key !== 'children')
        if (prevEntries.length !== nextEntries.length) return false
        for (const [key, value] of prevEntries) {
            if (key === 'components' || key === 'remarkPlugins' || key === 'rehypePlugins') continue
            if ((nextProps as Record<string, unknown>)[key] !== value) return false
        }
        return true
    }
)

MemoizedReactMarkdown.displayName = 'MemoizedReactMarkdown'
