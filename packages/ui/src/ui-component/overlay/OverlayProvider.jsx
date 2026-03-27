import { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { OverlayContext } from '@/utils/overlay/useOverlay'
import { getTargetRect, waitForElement } from '@/utils/overlay/domUtils'
import { OverlayPortal } from './OverlayPortal'
import { SpotlightMask } from './SpotlightMask'
import { OverlayTooltip } from './OverlayTooltip'

// Main overlay provider component
export const OverlayProvider = ({ children }) => {
    const [steps, setSteps] = useState([])
    const [index, setIndex] = useState(0)
    const [rect, setRect] = useState(null)
    const [onComplete, setOnComplete] = useState(null)

    const active = steps.length > 0 && index < steps.length
    const step = steps[index]

    const measure = useCallback(() => {
        if (!step) return
        const r = getTargetRect(step.target)
        if (r) setRect(r)
    }, [step])

    useEffect(() => {
        if (!step) return
        waitForElement(step.target).then((el) => {
            if (!el) {
                // Skip to next step if element not found
                setTimeout(() => {
                    setIndex((i) => i + 1)
                }, 500)
                return
            }
            measure()
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
    }, [step, measure])

    useEffect(() => {
        if (!active) return

        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)

        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
        }
    }, [active, measure])

    const controller = {
        start: (s, callback) => {
            const visibleStep = s.filter((st) => !st.hidden)[0]
            if (!visibleStep) {
                console.warn('The first step is hidden. Please make sure to provide at least one visible step to start the guide.')
                return
            }
            setSteps(s)
            setIndex(0)
            setOnComplete(callback ? () => callback : null)
        },
        next: () => {
            if (!active) return
            if (index + 1 >= steps.length) {
                // Last step - complete the guide
                setSteps([])
                if (onComplete) {
                    onComplete()
                }
            } else {
                setIndex((i) => i + 1)
            }
        },
        prev: () => {
            if (!active) return
            setIndex((i) => Math.max(0, i - 1))
        },
        goTo: (stepId) => {
            if (!active) return
            const stepIndex = steps.findIndex((s) => s.id === stepId)
            if (stepIndex !== -1) {
                setIndex(stepIndex)
            } else {
                console.warn(`Step ID not found: ${stepId}`)
            }
        },
        skip: () => {
            setSteps([])
            setOnComplete(null)
        },
        isActive: () => active,
        getCurrentStep: () => step,
        isFirstStep: () => index === 0
    }

    return (
        <OverlayContext.Provider value={controller}>
            {children}

            {active && rect && !step.hidden && (
                <OverlayPortal>
                    {step.spotlight && <SpotlightMask rect={rect} padding={step.padding} />}
                    <OverlayTooltip
                        rect={rect}
                        preferredPlacement={step.placement || 'bottom'}
                        title={step.title}
                        description={step.description}
                        imageSrc={step.imageSrc}
                        stepIndex={index}
                        totalSteps={steps.length}
                        onNext={controller.next}
                        onSkip={controller.skip}
                    />
                </OverlayPortal>
            )}
        </OverlayContext.Provider>
    )
}

OverlayProvider.propTypes = {
    children: PropTypes.node.isRequired
}
