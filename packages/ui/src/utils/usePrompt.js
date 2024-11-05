import { useCallback, useEffect } from 'react'

export function useBlocker(blocker, when = true) {
    useEffect(() => {
        if (!when) return

        const handleBeforePopState = () => {
            if (window.confirm(blocker)) {
                return true
            } else {
                return false
            }
        }

        window.history.pushState(null, '', window.location.href)
        window.addEventListener('popstate', handleBeforePopState)

        return () => {
            window.removeEventListener('popstate', handleBeforePopState)
        }
    }, [blocker, when])
}

export function usePrompt(message, when = true) {
    const blocker = useCallback(message, [message])

    useBlocker(blocker, when)
}
