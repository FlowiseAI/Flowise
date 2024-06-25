import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import './Markdown.css'

export const MemoizedReactMarkdown = memo(ReactMarkdown, (prevProps, nextProps) => prevProps.children === nextProps.children)
