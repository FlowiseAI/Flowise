import { useEffect, useCallback, useRef, useState } from 'react'

/**
 * Hook for detecting user idle/away status
 * @param {number} idleTimeout - Time in ms before marking user as idle (default: 60000 = 1 min)
 * @param {number} awayTimeout - Time in ms before marking user as away (default: 300000 = 5 min)
 * @returns {{ status: string, lastActivityTime: number }}
 */
export const useIdleDetection = (idleTimeout = 60000, awayTimeout = 300000) => {
    const [status, setStatus] = useState('active')
    const [isPageVisible, setIsPageVisible] = useState(!document.hidden)
    const lastActivityTimeRef = useRef(Date.now())
    const idleCheckIntervalRef = useRef(null)

    // Update last activity time
    const updateActivity = useCallback(() => {
        lastActivityTimeRef.current = Date.now()
        if (status !== 'active' && isPageVisible) {
            setStatus('active')
        }
    }, [status, isPageVisible])

    // Check idle status periodically
    const checkIdleStatus = useCallback(() => {
        const now = Date.now()
        const timeSinceActivity = now - lastActivityTimeRef.current

        // If page is hidden, mark as away
        if (!isPageVisible) {
            if (status !== 'away') {
                setStatus('away')
            }
            return
        }

        // Check time-based idle/away
        if (timeSinceActivity > awayTimeout) {
            if (status !== 'away') {
                setStatus('away')
            }
        } else if (timeSinceActivity > idleTimeout) {
            if (status !== 'idle') {
                setStatus('idle')
            }
        } else {
            if (status !== 'active') {
                setStatus('active')
            }
        }
    }, [status, isPageVisible, idleTimeout, awayTimeout])

    // Handle page visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden
            setIsPageVisible(visible)

            if (visible) {
                // Page became visible - update activity and mark as active
                updateActivity()
            } else {
                // Page hidden - mark as away
                setStatus('away')
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [updateActivity])

    // Track user activity events
    useEffect(() => {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

        // Throttle activity updates to avoid excessive calls
        let throttleTimeout = null
        const throttledUpdateActivity = () => {
            if (!throttleTimeout) {
                updateActivity()
                throttleTimeout = setTimeout(() => {
                    throttleTimeout = null
                }, 1000) // Throttle to once per second
            }
        }

        activityEvents.forEach((event) => {
            window.addEventListener(event, throttledUpdateActivity)
        })

        return () => {
            activityEvents.forEach((event) => {
                window.removeEventListener(event, throttledUpdateActivity)
            })
            if (throttleTimeout) {
                clearTimeout(throttleTimeout)
            }
        }
    }, [updateActivity])

    // Start idle check interval
    useEffect(() => {
        idleCheckIntervalRef.current = setInterval(checkIdleStatus, 5000) // Check every 5 seconds

        return () => {
            if (idleCheckIntervalRef.current) {
                clearInterval(idleCheckIntervalRef.current)
            }
        }
    }, [checkIdleStatus])

    return {
        status,
        lastActivityTime: lastActivityTimeRef.current
    }
}
