import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(undefined)

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

        const onChange = () => {
            setIsMobile(mql.matches)
        }

        // Set initial value
        setIsMobile(mql.matches)

        // Modern way to add listener
        mql.addListener(onChange)

        return () => mql.removeListener(onChange)
    }, [])

    return Boolean(isMobile)
}
