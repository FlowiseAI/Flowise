import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Typography } from '@mui/material'

const CursorOverlay = ({ cursors }) => {
    const [visibleCursors, setVisibleCursors] = useState({})

    // Auto-fade cursors that haven't moved in 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleCursors((prev) =>
                Object.fromEntries(Object.entries(prev).filter(([_, cursor]) => Date.now() - cursor.lastSeen < 3000))
            )
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    // Update visible cursors when new cursor data arrives
    useEffect(() => {
        setVisibleCursors((prev) => ({
            ...prev,
            ...cursors
        }))
    }, [cursors])

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1000,
                overflow: 'hidden'
            }}
            className='cursor-layer'
        >
            {Object.entries(visibleCursors).map(([userId, cursor]) => (
                <Box
                    key={userId}
                    className='cursor'
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                        transition: 'transform 0.05s linear',
                        zIndex: 1000
                    }}
                >
                    {/* Cursor SVG */}
                    <svg
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                            opacity: 0.9
                        }}
                    >
                        <path
                            d='M5.65376 12.3673L13.1844 17.7315C13.9671 18.2581 14.9999 17.7066 14.9999 16.7659V6.23419C14.9999 5.29347 13.9671 4.74194 13.1844 5.26856L5.65376 10.6327C4.86103 11.1653 4.86103 12.2747 5.65376 12.3673Z'
                            fill={cursor.color || '#4db8a8'}
                            stroke='white'
                            strokeWidth='1.5'
                        />
                    </svg>

                    {/* Name label */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: '20px',
                            top: '8px',
                            backgroundColor: cursor.color || '#4db8a8',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            fontWeight: 500,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            opacity: 0.95
                        }}
                    >
                        <Typography sx={{ fontSize: '12px', lineHeight: '16px', color: 'white' }}>{cursor.name || 'Anonymous'}</Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    )
}

CursorOverlay.propTypes = {
    cursors: PropTypes.object
}

export default CursorOverlay
