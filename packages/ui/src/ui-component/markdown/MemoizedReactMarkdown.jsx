import { memo } from 'react'
import ReactMarkdown from 'react-markdown'

export const MemoizedReactMarkdown = memo(ReactMarkdown, (prevProps, nextProps) => prevProps.children === nextProps.children)
