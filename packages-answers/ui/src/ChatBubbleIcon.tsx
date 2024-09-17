import PropTypes from 'prop-types'

const ChatBubbleIcon = ({ stroke = 'currentColor', strokeWidth = 2, ...props }) => (
    <svg viewBox='0 0 24 24' fill='none' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round' {...props}>
        <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' />
    </svg>
)

ChatBubbleIcon.propTypes = {
    stroke: PropTypes.string,
    strokeWidth: PropTypes.number
}

export default ChatBubbleIcon
