import { memo } from 'react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import './Markdown.css'

export const MemoizedReactMarkdown = memo(
    ({ children, ...props }) => (
        <div className='react-markdown'>
            <ReactMarkdown {...props}>{children}</ReactMarkdown>
        </div>
    ),
    (prevProps, nextProps) => prevProps.children === nextProps.children
)

MemoizedReactMarkdown.displayName = 'MemoizedReactMarkdown'

MemoizedReactMarkdown.propTypes = {
    children: PropTypes.any
}
