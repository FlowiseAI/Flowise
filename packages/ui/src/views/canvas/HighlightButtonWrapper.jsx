import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Box, useTheme } from '@mui/material'
import { keyframes } from '@mui/system'

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 127, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(0, 127, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 127, 255, 0);
  }
`

const HighlightButtonWrapper = ({ children, nodeId, highlightedNodeId, setHighlightedNodeId }) => {
    const theme = useTheme()
    const [show, setShow] = useState(false)

    useEffect(() => {
        if (nodeId === highlightedNodeId) {
            setShow(true)
            const timer = setTimeout(() => {
                setShow(false)
                setHighlightedNodeId('')
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [nodeId, highlightedNodeId, setHighlightedNodeId])

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                '& .MuiButton-root': {
                    animation: show ? `${pulseAnimation} 1s ease-in-out infinite` : 'none',
                    borderColor: show ? theme.palette.primary.main : undefined,
                    color: show ? theme.palette.primary.main : undefined,
                    transition: 'all 0.3s ease-in-out'
                }
            }}
        >
            {children}
        </Box>
    )
}

HighlightButtonWrapper.propTypes = {
    children: PropTypes.node,
    nodeId: PropTypes.string,
    highlightedNodeId: PropTypes.string,
    setHighlightedNodeId: PropTypes.func
}

export default HighlightButtonWrapper
