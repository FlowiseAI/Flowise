import { useLayoutEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { Button, Typography, Box, useTheme } from '@mui/material'
import { resolvePlacement } from '@/utils/overlay/placementUtils'
import { Arrow } from './Arrow'
import { ProgressBar } from './ProgressBar'

// Tooltip component with auto-placement
export const OverlayTooltip = ({ rect, preferredPlacement, title, description, imageSrc, stepIndex, totalSteps, onNext, onSkip }) => {
    const ref = useRef(null)
    const theme = useTheme()
    const [placement, setPlacement] = useState('bottom')
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode
    useLayoutEffect(() => {
        if (!ref.current) return
        const box = ref.current.getBoundingClientRect()
        const p = resolvePlacement(rect, box.width, box.height, preferredPlacement)
        setPlacement(p)
    }, [rect, preferredPlacement])

    const gap = 14

    const pos = { position: 'fixed', zIndex: 9999 }

    // Standard placements
    if (placement === 'bottom') {
        pos.top = rect.bottom + gap
        pos.left = rect.left
    } else if (placement === 'top') {
        pos.top = rect.top - gap
        pos.left = rect.left
        pos.transform = 'translateY(-100%)'
    } else if (placement === 'right') {
        pos.left = rect.right + gap
        pos.top = rect.top
    } else if (placement === 'left') {
        pos.left = rect.left - gap
        pos.top = rect.top
        pos.transform = 'translateX(-100%)'
    }
    // Corner placements
    else if (placement === 'top-left') {
        pos.top = rect.top - gap
        pos.left = rect.left - gap
        pos.transform = 'translate(-80%, -100%)'
    } else if (placement === 'top-right') {
        pos.top = rect.top - gap
        pos.right = window.innerWidth - rect.right + gap
        pos.transform = 'translateY(-100%)'
    } else if (placement === 'bottom-left') {
        pos.top = rect.bottom + gap
        pos.left = rect.left - gap
        pos.transform = 'translateX(-60%)'
    } else if (placement === 'bottom-right') {
        pos.top = rect.bottom + gap
        pos.right = window.innerWidth - rect.right + gap
    }

    const isLastStep = stepIndex === totalSteps - 1

    return (
        <Box
            ref={ref}
            sx={{
                ...pos,
                width: 340,
                backgroundColor: isDarkMode ? theme.palette.background.paper : 'white',
                color: isDarkMode ? theme.palette.text.primary : 'inherit',
                borderRadius: '10px',
                padding: 2,
                boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.6)' : '0 12px 40px rgba(0,0,0,0.25)',
                border: isDarkMode ? `1px solid ${theme.palette.divider}` : 'none'
            }}
        >
            <Arrow placement={placement} />

            <ProgressBar step={stepIndex} total={totalSteps} />

            <Box sx={{ mt: 1.5 }}>
                <Typography variant='h6' sx={{ margin: 0, color: isDarkMode ? theme.palette.text.primary : 'inherit' }}>
                    {title}
                </Typography>
                <Typography variant='body2' sx={{ mt: 1, color: isDarkMode ? theme.palette.text.secondary : 'inherit' }}>
                    {description}
                </Typography>
                {imageSrc && (
                    <Box sx={{ mt: 2, borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                            src={imageSrc}
                            alt='Guide visualization'
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                borderRadius: '8px'
                            }}
                        />
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant='outlined' onClick={onSkip} size='small'>
                    Skip
                </Button>
                <Button variant='contained' onClick={onNext} size='small' fullWidth>
                    {isLastStep ? 'Finish' : 'Next'}
                </Button>
            </Box>

            <Typography
                variant='caption'
                sx={{
                    mt: 1,
                    display: 'block',
                    opacity: isDarkMode ? 0.6 : 0.7,
                    textAlign: 'center',
                    color: isDarkMode ? theme.palette.text.secondary : 'inherit'
                }}
            >
                Step {stepIndex + 1} of {totalSteps}
            </Typography>
        </Box>
    )
}

OverlayTooltip.propTypes = {
    rect: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        bottom: PropTypes.number.isRequired,
        left: PropTypes.number.isRequired,
        right: PropTypes.number.isRequired
    }).isRequired,
    preferredPlacement: PropTypes.oneOf(['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']),
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    imageSrc: PropTypes.string,
    stepIndex: PropTypes.number.isRequired,
    totalSteps: PropTypes.number.isRequired,
    onNext: PropTypes.func.isRequired,
    onSkip: PropTypes.func.isRequired
}

OverlayTooltip.defaultProps = {
    preferredPlacement: 'bottom',
    imageSrc: undefined
}
