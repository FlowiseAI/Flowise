import { useState, useEffect } from 'react'

/**
 * Custom hook to detect scroll direction and position
 * Returns an object with:
 * - scrollDirection: 'up' | 'down' | null
 * - isAtTop: boolean indicating if at the top of the page
 * - hideHeader: boolean indicating if header should be hidden
 */
const useScrollDirection = () => {
    const [scrollDirection, setScrollDirection] = useState(null)
    const [lastScrollY, setLastScrollY] = useState(0)
    const [isAtTop, setIsAtTop] = useState(true)
    const [hideHeader, setHideHeader] = useState(false)

    useEffect(() => {
        let ticking = false

        const updateScrollDirection = () => {
            const scrollY = window.scrollY

            // Check if at top of page
            const atTop = scrollY < 10

            if (Math.abs(scrollY - lastScrollY) < 5) {
                ticking = false
                return
            }

            const direction = scrollY > lastScrollY ? 'down' : 'up'
            
            setScrollDirection(direction)
            setIsAtTop(atTop)
            
            // Hide header when scrolling down and not at top
            // Show header when scrolling up or at top
            if (atTop) {
                setHideHeader(false)
            } else if (direction === 'down' && scrollY > 80) {
                // Only hide after scrolling past the header height
                setHideHeader(true)
            } else if (direction === 'up') {
                setHideHeader(false)
            }

            setLastScrollY(scrollY > 0 ? scrollY : 0)
            ticking = false
        }

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollDirection)
                ticking = true
            }
        }

        window.addEventListener('scroll', onScroll)

        return () => window.removeEventListener('scroll', onScroll)
    }, [lastScrollY])

    return { scrollDirection, isAtTop, hideHeader }
}

export default useScrollDirection
