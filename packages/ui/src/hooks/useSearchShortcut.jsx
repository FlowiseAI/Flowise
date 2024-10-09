import { useEffect } from 'react'
import { getOS } from '@/utils/genericHelper'

const isMac = getOS() === 'macos'

const useSearchShorcut = (inputRef) => {
    useEffect(() => {
        const component = inputRef.current

        if (!component) return // Check if inputRef.current is defined

        const handleKeyDown = (event) => {
            if ((isMac && event.metaKey && event.key === 'f') || (!isMac && event.ctrlKey && event.key === 'f')) {
                event.preventDefault()
                component.focus()
            }
        }

        const handleInputEscape = (event) => {
            if (event.key === 'Escape') component.blur()
        }

        component.addEventListener('keydown', handleInputEscape)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            if (component) {
                component.removeEventListener('keydown', handleInputEscape)
            }
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [inputRef]) // Add inputRef to the dependency array to ensure the effect is re-applied if inputRef changes
}

export default useSearchShorcut
