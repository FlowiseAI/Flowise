import { Alert, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

const ThumbsUpIcon = () => {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        >
            <path d='M7 10v12' />
            <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z' />
        </svg>
    )
}

const ThumbsDownIcon = () => {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        >
            <path d='M17 14V2' />
            <path d='M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z' />
        </svg>
    )
}

const Feedback = ({ content, rating }) => {
    const theme = useTheme()

    return (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'start' }}>
            {content ? (
                <Alert
                    icon={rating === 'THUMBS_UP' ? <ThumbsUpIcon /> : <ThumbsDownIcon />}
                    severity={rating === 'THUMBS_UP' ? 'success' : 'error'}
                    style={{ marginBottom: 14 }}
                    variant='outlined'
                >
                    {content ? <span style={{ color: theme.palette.text.primary }}>{content}</span> : null}
                </Alert>
            ) : (
                <IconButton color={rating === 'THUMBS_UP' ? 'success' : 'error'} style={{ marginBottom: 14 }}>
                    {rating === 'THUMBS_UP' ? <ThumbsUpIcon /> : <ThumbsDownIcon />}
                </IconButton>
            )}
        </div>
    )
}

Feedback.propTypes = {
    rating: PropTypes.oneOf(['THUMBS_UP', 'THUMBS_DOWN']),
    content: PropTypes.string
}

export default Feedback
